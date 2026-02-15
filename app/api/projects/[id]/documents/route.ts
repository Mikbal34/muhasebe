import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// Category folder mapping
const CATEGORY_MAP: Record<string, string> = {
  sozlesme: 'Sözleşme',
  gorevlendirme: 'Görevlendirme',
  hakem_onay: 'Hakem Onay',
  ek_sozlesme: 'Ek Sözleşme',
}

const KNOWN_CATEGORIES = Object.keys(CATEGORY_MAP)

interface StorageFile {
  name: string
  path: string
  size: number
  created_at: string
  download_url: string
  category: string
  category_label: string
}

// GET /api/projects/[id]/documents - List all documents from Storage
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = params

  return withAuth(request, async (req, ctx) => {
    try {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(projectId)) {
        return apiResponse.error('Geçersiz proje ID', undefined, 400)
      }

      // Check project exists
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return apiResponse.notFound('Proje bulunamadı')
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const documents: StorageFile[] = []

      // List category folders under projectId
      const { data: folders, error: folderError } = await ctx.supabase.storage
        .from('contracts')
        .list(projectId, { limit: 100 })

      if (folderError) {
        // If folder doesn't exist, return empty
        return apiResponse.success({ documents: [], categories: {} })
      }

      if (!folders || folders.length === 0) {
        return apiResponse.success({ documents: [], categories: {} })
      }

      // Check each known category folder for files
      const categoryFolders = folders.filter(f => !f.id && KNOWN_CATEGORIES.includes(f.name))
      // Also include any files directly under projectId (legacy uploads)
      const directFiles = folders.filter(f => f.id && f.name)

      // Add direct files as "diger" (other) category
      for (const file of directFiles) {
        const filePath = `${projectId}/${file.name}`
        documents.push({
          name: file.name,
          path: filePath,
          size: (file.metadata as any)?.size || 0,
          created_at: file.created_at || '',
          download_url: `${supabaseUrl}/storage/v1/object/public/contracts/${filePath}`,
          category: 'diger',
          category_label: 'Diğer',
        })
      }

      // List files in each category folder
      for (const folder of categoryFolders) {
        const categoryPath = `${projectId}/${folder.name}`
        const { data: files, error: filesError } = await ctx.supabase.storage
          .from('contracts')
          .list(categoryPath, { limit: 200 })

        if (filesError || !files) continue

        for (const file of files) {
          // Skip placeholder files and folders
          if (!file.id || file.name === '.emptyFolderPlaceholder') continue

          const filePath = `${categoryPath}/${file.name}`
          documents.push({
            name: file.name,
            path: filePath,
            size: (file.metadata as any)?.size || 0,
            created_at: file.created_at || '',
            download_url: `${supabaseUrl}/storage/v1/object/public/contracts/${filePath}`,
            category: folder.name,
            category_label: CATEGORY_MAP[folder.name] || folder.name,
          })
        }
      }

      // Group by category
      const categories: Record<string, StorageFile[]> = {}
      for (const doc of documents) {
        if (!categories[doc.category]) {
          categories[doc.category] = []
        }
        categories[doc.category].push(doc)
      }

      // Sort files within each category by created_at desc
      for (const cat of Object.keys(categories)) {
        categories[cat].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }

      return apiResponse.success({ documents, categories })
    } catch (error: any) {
      console.error('Documents list error:', error)
      return apiResponse.error('Belgeler listelenirken hata oluştu', error.message, 500)
    }
  })
}
