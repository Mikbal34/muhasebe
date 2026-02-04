import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import {
  detectCategory,
  parseProjectCode,
  formatStorageFileName,
  buildStoragePath,
  getCategoryDbField,
  DocumentCategory,
  DocumentImportResult,
  summarizeImportResults
} from '@/lib/utils/document-helpers'

// Force dynamic
export const dynamic = 'force-dynamic'

interface ImportFileRequest {
  fileName: string
  folderName: string
  fileBase64: string
  mimeType: string
}

interface ImportRequest {
  files: ImportFileRequest[]
  dryRun?: boolean
}

// POST /api/projects/documents/import - Toplu belge import
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins can bulk import
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Sadece adminler toplu import yapabilir')
    }

    try {
      const body: ImportRequest = await request.json()
      const { files, dryRun = false } = body

      if (!files || !Array.isArray(files) || files.length === 0) {
        return apiResponse.error('Dosya listesi gerekli', '', 400)
      }

      // Batch check - max 100 dosya aynı anda
      if (files.length > 100) {
        return apiResponse.error('En fazla 100 dosya aynı anda import edilebilir', '', 400)
      }

      const results: DocumentImportResult[] = []

      // Önce tüm projeleri çek (kod -> id mapping)
      const { data: projects, error: projectsError } = await ctx.supabase
        .from('projects')
        .select('id, code')

      if (projectsError) {
        return apiResponse.error('Projeler yüklenemedi', projectsError.message, 500)
      }

      // Kod -> ID mapping oluştur
      const projectCodeToId: Record<string, string> = {}
      for (const project of projects || []) {
        // Normalize: büyük harf, boşluk kaldır
        const normalizedCode = project.code.toUpperCase().replace(/\s+/g, '')
        projectCodeToId[normalizedCode] = project.id
      }

      // Her dosya için işlem yap
      for (const file of files) {
        const { fileName, folderName, fileBase64, mimeType } = file

        // Proje kodunu parse et
        const projectCode = parseProjectCode(folderName)
        if (!projectCode) {
          results.push({
            fileName,
            projectCode: null,
            category: 'hakem_onay',
            storagePath: null,
            status: 'skipped',
            error: `Klasör adından proje kodu çıkarılamadı: ${folderName}`
          })
          continue
        }

        // Normalize project code
        const normalizedCode = projectCode.toUpperCase().replace(/\s+/g, '')
        const projectId = projectCodeToId[normalizedCode]

        if (!projectId) {
          results.push({
            fileName,
            projectCode,
            category: 'hakem_onay',
            storagePath: null,
            status: 'skipped',
            error: `Proje bulunamadı: ${projectCode}`
          })
          continue
        }

        // Kategori tespit et
        const category = detectCategory(fileName)

        // Storage path oluştur
        const storageFileName = formatStorageFileName(fileName)
        const storagePath = buildStoragePath(projectId, category, storageFileName)

        // Dry run modunda sadece analiz yap
        if (dryRun) {
          results.push({
            fileName,
            projectCode,
            category,
            storagePath,
            status: 'success'
          })
          continue
        }

        // Gerçek import işlemi
        try {
          // Base64'ü buffer'a çevir
          const buffer = Buffer.from(fileBase64, 'base64')

          // Storage'a yükle (mevcut contracts bucket'ını kullan)
          const { error: uploadError } = await ctx.supabase.storage
            .from('contracts')
            .upload(storagePath, buffer, {
              contentType: mimeType || 'application/pdf',
              upsert: true
            })

          if (uploadError) {
            results.push({
              fileName,
              projectCode,
              category,
              storagePath: null,
              status: 'error',
              error: `Storage yükleme hatası: ${uploadError.message}`
            })
            continue
          }

          // Veritabanı alanını güncelle (eğer varsa ve boşsa)
          const dbField = getCategoryDbField(category)

          if (dbField && category !== 'ek_sozlesme') {
            // Mevcut değeri kontrol et
            const { data: existingProject } = await ctx.supabase
              .from('projects')
              .select(dbField)
              .eq('id', projectId)
              .single()

            // Sadece boşsa güncelle (ilk belge)
            if (existingProject && !(existingProject as any)[dbField]) {
              await ctx.supabase
                .from('projects')
                .update({ [dbField]: storagePath })
                .eq('id', projectId)
            }
          } else if (category === 'ek_sozlesme') {
            // Ek sözleşme - supplementary_contracts tablosuna ekle
            // Mevcut amendment sayısını bul
            const { data: existingContracts } = await ctx.supabase
              .from('supplementary_contracts')
              .select('amendment_number')
              .eq('project_id', projectId)
              .order('amendment_number', { ascending: false })
              .limit(1)

            const nextAmendmentNumber = existingContracts && existingContracts.length > 0
              ? (existingContracts[0] as any).amendment_number + 1
              : 1

            // Proje bütçe bilgisi al
            const { data: projectData } = await ctx.supabase
              .from('projects')
              .select('budget, end_date')
              .eq('id', projectId)
              .single()

            await ctx.supabase
              .from('supplementary_contracts')
              .insert({
                project_id: projectId,
                amendment_number: nextAmendmentNumber,
                contract_document_path: storagePath,
                description: `Import: ${fileName}`,
                previous_budget: (projectData as any)?.budget || 0,
                new_budget: (projectData as any)?.budget || 0,
                previous_end_date: (projectData as any)?.end_date || null,
                created_by: ctx.user.id
              })
          }

          results.push({
            fileName,
            projectCode,
            category,
            storagePath,
            status: 'success'
          })
        } catch (err: any) {
          results.push({
            fileName,
            projectCode,
            category,
            storagePath: null,
            status: 'error',
            error: err.message
          })
        }
      }

      const summary = summarizeImportResults(results)

      return apiResponse.success({
        dryRun,
        summary,
        results
      })
    } catch (error: any) {
      console.error('Document import error:', error)
      return apiResponse.error('Import sırasında hata oluştu', error.message, 500)
    }
  })
}

// GET /api/projects/documents/import - Mevcut belge durumunu analiz et
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins can view
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Sadece adminler bu bilgiyi görüntüleyebilir')
    }

    try {
      // Proje belge durumu istatistikleri
      const { data: projects, error } = await ctx.supabase
        .from('projects')
        .select('id, code, contract_path, assignment_document_path, referee_approval_document_path')

      if (error) {
        return apiResponse.error('Projeler yüklenemedi', error.message, 500)
      }

      // Ek sözleşme sayıları
      const { data: supplementaryContracts } = await ctx.supabase
        .from('supplementary_contracts')
        .select('project_id')

      const supplementaryCount: Record<string, number> = {}
      for (const sc of supplementaryContracts || []) {
        const pid = (sc as any).project_id
        supplementaryCount[pid] = (supplementaryCount[pid] || 0) + 1
      }

      // İstatistikler
      let withContract = 0
      let withAssignment = 0
      let withRefereeApproval = 0
      let withSupplementary = 0

      for (const project of projects || []) {
        if ((project as any).contract_path) withContract++
        if ((project as any).assignment_document_path) withAssignment++
        if ((project as any).referee_approval_document_path) withRefereeApproval++
        if (supplementaryCount[(project as any).id]) withSupplementary++
      }

      return apiResponse.success({
        totalProjects: projects?.length || 0,
        withContract,
        withAssignment,
        withRefereeApproval,
        withSupplementary,
        missingContract: (projects?.length || 0) - withContract,
        missingAssignment: (projects?.length || 0) - withAssignment,
        missingRefereeApproval: (projects?.length || 0) - withRefereeApproval
      })
    } catch (error: any) {
      console.error('Document stats error:', error)
      return apiResponse.error('İstatistikler yüklenemedi', error.message, 500)
    }
  })
}
