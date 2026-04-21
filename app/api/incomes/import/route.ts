import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import * as XLSX from 'xlsx'

// Column mapping from Turkish to internal names
const columnMap: Record<string, string> = {
  'Proje Kodu': 'project_code',
  'Brüt Tutar': 'gross_amount',
  'Gelir Tarihi': 'income_date',
  'Açıklama': 'description',
  'KDV Oranı': 'vat_rate',
  'Tahsil Edilen': 'collected_amount',
  'Tahsil Tarihi': 'collection_date',
  'Tahsil Durumu': 'collection_status',
  'Gelir Tipi': 'income_type',
  'FSMH Geliri': 'is_fsmh_income',
  'TTO Geliri': 'is_tto_income'
}

type CollectionStatus = 'invoiced' | 'partial' | 'fully_collected'

interface ParsedRow {
  rowNumber: number
  project_code: string
  gross_amount: number
  income_date: string
  description?: string
  vat_rate?: number
  collected_amount?: number
  collection_date?: string
  income_type?: 'ozel' | 'kamu'
  is_fsmh_income?: boolean
  is_tto_income?: boolean
}

interface ValidationError {
  row: number
  field: string
  message: string
}

interface ValidationResult {
  valid: ParsedRow[]
  errors: ValidationError[]
  projectMap: Map<string, { id: string; vat_rate: number; status: string; referee_approved: boolean; budget: number; totalIncomes: number }>
}

// Parse Excel date (can be number or string)
function parseExcelDate(value: any): string | null {
  if (!value) return null

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const year = date.y
      const month = String(date.m).padStart(2, '0')
      const day = String(date.d).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }

  // If it's a string
  if (typeof value === 'string') {
    // Try DD.MM.YYYY format
    const dotMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    if (dotMatch) {
      const [, day, month, year] = dotMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try YYYY-MM-DD format
    const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    // Try DD/MM/YYYY format
    const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slashMatch) {
      const [, day, month, year] = slashMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
  }

  return null
}

// Parse boolean values
function parseBoolean(value: any, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value
  const strValue = String(value).toLowerCase().trim()
  if (['evet', 'yes', 'true', '1', 'e', 'y'].includes(strValue)) return true
  if (['hayır', 'hayir', 'no', 'false', '0', 'h', 'n'].includes(strValue)) return false
  return defaultValue
}

// Parse income type
function parseIncomeType(value: any): 'ozel' | 'kamu' {
  if (!value) return 'ozel'
  const strValue = String(value).toLowerCase().trim()
  if (['kamu', 'public', 'k'].includes(strValue)) return 'kamu'
  return 'ozel'
}

// Parse collection status (Tahsil Durumu). Returns null for unrecognized values.
function parseCollectionStatus(value: any): CollectionStatus | null {
  const v = String(value ?? '').toLocaleLowerCase('tr-TR').trim()
  if (!v) return null
  if (['tam tahsil', 'tam', 'tahsil edildi', 'tamamlandı', 'tamamlandi', 'fully collected', 'fully_collected', 'completed'].includes(v)) return 'fully_collected'
  if (['faturalandı', 'faturalandi', 'fatura', 'invoiced', 'beklemede', 'pending'].includes(v)) return 'invoiced'
  if (['kısmi', 'kismi', 'partial', 'kısmi tahsil', 'kismi tahsil', 'parçalı', 'parcali', 'partially_collected'].includes(v)) return 'partial'
  return null
}

// Parse number value
function parseNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value
  // Handle string with Turkish number format (1.000,50)
  const strValue = String(value).replace(/\./g, '').replace(',', '.')
  const num = parseFloat(strValue)
  return isNaN(num) ? null : num
}

function formatDateForExport(value: any): string {
  if (!value) return ''
  if (value instanceof Date) {
    return `${String(value.getDate()).padStart(2, '0')}.${String(value.getMonth() + 1).padStart(2, '0')}.${value.getFullYear()}`
  }
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value)
    if (d) {
      return `${String(d.d).padStart(2, '0')}.${String(d.m).padStart(2, '0')}.${d.y}`
    }
  }
  return String(value)
}

function buildFailedRow(
  rowNumber: number,
  orig: Record<string, any> | undefined,
  errorMessage: string
) {
  return {
    row: rowNumber,
    projeKodu: orig?.['Proje Kodu']?.toString() || '',
    brutTutar: orig?.['Brüt Tutar'] ?? '',
    gelirTarihi: formatDateForExport(orig?.['Gelir Tarihi']),
    aciklama: orig?.['Açıklama']?.toString() || '',
    kdvOrani: orig?.['KDV Oranı'] ?? '',
    tahsilEdilen: orig?.['Tahsil Edilen'] ?? '',
    tahsilTarihi: formatDateForExport(orig?.['Tahsil Tarihi']),
    tahsilDurumu: orig?.['Tahsil Durumu']?.toString() || '',
    gelirTipi: orig?.['Gelir Tipi']?.toString() || '',
    fsmhGeliri: orig?.['FSMH Geliri']?.toString() || '',
    ttoGeliri: orig?.['TTO Geliri']?.toString() || '',
    hata: errorMessage
  }
}

// POST /api/incomes/import - Import incomes from Excel
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can import incomes
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can import incomes')
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const previewOnly = formData.get('preview') === 'true'

      if (!file) {
        return apiResponse.error('Dosya gerekli', 'Lütfen bir Excel dosyası yükleyin', 400)
      }

      // Check file type
      const fileName = file.name.toLowerCase()
      if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        return apiResponse.error('Geçersiz dosya tipi', 'Sadece Excel dosyaları (.xlsx, .xls) kabul edilir', 400)
      }

      // Read file
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })

      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return apiResponse.error('Boş dosya', 'Excel dosyası boş', 400)
      }

      const sheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })

      if (rawData.length === 0) {
        return apiResponse.error('Veri bulunamadı', 'Excel dosyasında veri satırı bulunamadı', 400)
      }

      // Keep original row data for failed rows export
      const originalRowData = new Map<number, Record<string, any>>()
      rawData.forEach((row, idx) => originalRowData.set(idx + 2, row))

      // Parse and validate rows
      const validationResult = await validateRows(rawData, ctx.supabase)

      if (previewOnly) {
        // Return preview data
        return apiResponse.success({
          totalRows: rawData.length,
          validRows: validationResult.valid.length,
          errorRows: validationResult.errors.length,
          rows: validationResult.valid.map(row => ({
            ...row,
            project_id: validationResult.projectMap.get(row.project_code)?.id
          })),
          errors: validationResult.errors
        })
      }

      // Import valid rows (even when some rows had validation errors)
      const importResults = await importIncomes(validationResult.valid, validationResult.projectMap, ctx)

      // Combine validation errors + insert failures into failedRows
      const failedRows = [
        ...validationResult.errors.map(e => buildFailedRow(e.row, originalRowData.get(e.row), `${e.field}: ${e.message}`)),
        ...importResults.failed.map(f => buildFailedRow(f.row, originalRowData.get(f.row), f.error))
      ]

      const totalFailed = failedRows.length

      if (importResults.success.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Aktarılacak geçerli gelir bulunamadı',
          message: `${totalFailed} satırda hata bulundu`,
          data: { failedRows, errors: validationResult.errors }
        }, { status: 400 })
      }

      return apiResponse.success({
        imported: importResults.success.length,
        failed: totalFailed,
        successIds: importResults.success,
        failedRows: totalFailed > 0 ? failedRows : undefined,
        errors: validationResult.errors.length > 0 ? validationResult.errors : undefined
      }, `${importResults.success.length} gelir kaydı başarıyla oluşturuldu${totalFailed > 0 ? ` (${totalFailed} satır atlandı)` : ''}`)

    } catch (error: any) {
      console.error('Income import error:', error)
      return apiResponse.error('Import hatası', error.message || 'Beklenmeyen bir hata oluştu', 500)
    }
  })
}

async function validateRows(rawData: Record<string, any>[], supabase: any): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const validRows: ParsedRow[] = []
  const projectCodes = new Set<string>()

  // First pass: parse rows and collect project codes
  const parsedRows: (ParsedRow | null)[] = rawData.map((row, index) => {
    const rowNumber = index + 2 // Excel row number (1-indexed + header)
    const parsed: Partial<ParsedRow> = { rowNumber }
    let hasError = false

    // Map column names
    const mappedRow: Record<string, any> = {}
    for (const [excelCol, value] of Object.entries(row)) {
      const internalKey = columnMap[excelCol]
      if (internalKey) {
        mappedRow[internalKey] = value
      }
    }

    // Project code (required)
    const projectCode = String(mappedRow.project_code || '').trim()
    if (!projectCode) {
      errors.push({ row: rowNumber, field: 'Proje Kodu', message: 'Proje kodu zorunlu' })
      hasError = true
    } else {
      parsed.project_code = projectCode
      projectCodes.add(projectCode)
    }

    // Gross amount (required)
    const grossAmount = parseNumber(mappedRow.gross_amount)
    if (grossAmount === null) {
      errors.push({ row: rowNumber, field: 'Brüt Tutar', message: 'Brüt tutar geçersiz' })
      hasError = true
    } else if (grossAmount <= 0) {
      errors.push({ row: rowNumber, field: 'Brüt Tutar', message: 'Brüt tutar 0\'dan büyük olmalı' })
      hasError = true
    } else {
      parsed.gross_amount = grossAmount
    }

    // Income date (required)
    const incomeDate = parseExcelDate(mappedRow.income_date)
    if (!incomeDate) {
      errors.push({ row: rowNumber, field: 'Gelir Tarihi', message: 'Gelir tarihi geçersiz (DD.MM.YYYY formatında olmalı)' })
      hasError = true
    } else {
      parsed.income_date = incomeDate
    }

    // Optional fields
    parsed.description = mappedRow.description ? String(mappedRow.description).trim() : undefined

    const vatRate = parseNumber(mappedRow.vat_rate)
    if (vatRate !== null) {
      if (vatRate < 0 || vatRate > 100) {
        errors.push({ row: rowNumber, field: 'KDV Oranı', message: 'KDV oranı 0-100 arasında olmalı' })
        hasError = true
      } else {
        parsed.vat_rate = vatRate
      }
    }

    const collectedAmount = parseNumber(mappedRow.collected_amount)
    if (collectedAmount !== null) {
      if (collectedAmount < 0) {
        errors.push({ row: rowNumber, field: 'Tahsil Edilen', message: 'Tahsil edilen tutar negatif olamaz' })
        hasError = true
      } else {
        parsed.collected_amount = collectedAmount
      }
    }

    const collectionDate = parseExcelDate(mappedRow.collection_date)
    if (collectionDate) {
      parsed.collection_date = collectionDate
    }

    // Tahsil Durumu: convenience column that drives collected_amount/collection_date
    const rawStatus = String(mappedRow.collection_status ?? '').trim()
    if (rawStatus) {
      const status = parseCollectionStatus(rawStatus)
      if (status === null) {
        errors.push({ row: rowNumber, field: 'Tahsil Durumu', message: 'Geçersiz değer. "Faturalandı", "Kısmi" veya "Tam Tahsil" olmalı' })
        hasError = true
      } else if (parsed.gross_amount !== undefined) {
        if (status === 'fully_collected') {
          parsed.collected_amount = parsed.gross_amount
          if (!parsed.collection_date && parsed.income_date) {
            parsed.collection_date = parsed.income_date
          }
        } else if (status === 'invoiced') {
          parsed.collected_amount = 0
          parsed.collection_date = undefined
        } else if (status === 'partial') {
          if (parsed.collected_amount === undefined || parsed.collected_amount <= 0) {
            errors.push({ row: rowNumber, field: 'Tahsil Durumu', message: 'Kısmi tahsilat için "Tahsil Edilen" 0\'dan büyük olmalı' })
            hasError = true
          } else if (parsed.collected_amount >= parsed.gross_amount) {
            errors.push({ row: rowNumber, field: 'Tahsil Durumu', message: 'Kısmi tahsilat için "Tahsil Edilen" brüt tutardan küçük olmalı' })
            hasError = true
          } else if (!parsed.collection_date && parsed.income_date) {
            parsed.collection_date = parsed.income_date
          }
        }
      }
    }

    parsed.income_type = parseIncomeType(mappedRow.income_type)
    parsed.is_fsmh_income = parseBoolean(mappedRow.is_fsmh_income, false)
    parsed.is_tto_income = parseBoolean(mappedRow.is_tto_income, true)

    return hasError ? null : (parsed as ParsedRow)
  })

  // Fetch all projects at once
  const projectCodesArray = Array.from(projectCodes)
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, code, vat_rate, status, referee_approved, budget')
    .in('code', projectCodesArray)

  if (projectError) {
    throw new Error(`Proje bilgileri alınamadı: ${projectError.message}`)
  }

  // Create project map
  const projectMap = new Map<string, { id: string; vat_rate: number; status: string; referee_approved: boolean; budget: number; totalIncomes: number }>()
  for (const project of projects || []) {
    projectMap.set(project.code, {
      id: project.id,
      vat_rate: project.vat_rate,
      status: project.status,
      referee_approved: project.referee_approved,
      budget: project.budget,
      totalIncomes: 0
    })
  }

  // Fetch existing incomes for budget check
  const projectIds = Array.from(projectMap.values()).map(p => p.id)
  if (projectIds.length > 0) {
    const { data: existingIncomes } = await supabase
      .from('incomes')
      .select('project_id, gross_amount')
      .in('project_id', projectIds)

    for (const income of existingIncomes || []) {
      for (const [code, proj] of Array.from(projectMap.entries())) {
        if (proj.id === income.project_id) {
          proj.totalIncomes += income.gross_amount
        }
      }
    }
  }

  // Track new incomes per project for budget validation
  const newIncomesPerProject = new Map<string, number>()

  // Second pass: validate against projects
  for (let i = 0; i < parsedRows.length; i++) {
    const parsed = parsedRows[i]
    if (!parsed) continue

    const rowNumber = i + 2
    const projectCode = parsed.project_code

    // Check if project exists
    const project = projectMap.get(projectCode)
    if (!project) {
      errors.push({ row: rowNumber, field: 'Proje Kodu', message: `Proje bulunamadı: ${projectCode}` })
      continue
    }

    // Check project status
    if (project.status === 'cancelled') {
      errors.push({ row: rowNumber, field: 'Proje Kodu', message: `Proje iptal edilmiş: ${projectCode}` })
      continue
    }

    if (project.status === 'completed') {
      errors.push({ row: rowNumber, field: 'Proje Kodu', message: `Proje tamamlanmış: ${projectCode}` })
      continue
    }

    // Track running total for this project (budget auto-expanded on import)
    const currentNewIncomes = newIncomesPerProject.get(projectCode) || 0
    newIncomesPerProject.set(projectCode, currentNewIncomes + parsed.gross_amount)

    // Use project VAT rate if not provided
    if (parsed.vat_rate === undefined) {
      parsed.vat_rate = project.vat_rate
    }

    validRows.push(parsed)
  }

  return { valid: validRows, errors, projectMap }
}

async function importIncomes(
  rows: ParsedRow[],
  projectMap: Map<string, { id: string; vat_rate: number; status: string; referee_approved: boolean; budget: number; totalIncomes: number }>,
  ctx: any
): Promise<{ success: string[]; failed: { row: number; error: string }[] }> {
  const success: string[] = []
  const failed: { row: number; error: string }[] = []

  const addedPerProject = new Map<string, number>()

  for (const row of rows) {
    try {
      const project = projectMap.get(row.project_code)
      if (!project) {
        failed.push({ row: row.rowNumber, error: 'Proje bulunamadı' })
        continue
      }

      const vatRate = row.vat_rate ?? project.vat_rate

      // Create income record
      const { data: income, error: incomeError } = await ctx.supabase
        .from('incomes')
        .insert({
          project_id: project.id,
          gross_amount: row.gross_amount,
          vat_rate: vatRate,
          description: row.description || null,
          income_date: row.income_date,
          is_fsmh_income: row.is_fsmh_income ?? false,
          income_type: row.income_type ?? 'ozel',
          is_tto_income: row.is_tto_income ?? true,
          collected_amount: row.collected_amount ?? 0,
          collection_date: row.collection_date || null,
          created_by: ctx.user.id
        })
        .select('id')
        .single()

      if (incomeError) {
        failed.push({ row: row.rowNumber, error: incomeError.message })
        continue
      }

      addedPerProject.set(row.project_code, (addedPerProject.get(row.project_code) || 0) + row.gross_amount)
      success.push(income.id)
    } catch (error: any) {
      failed.push({ row: row.rowNumber, error: error.message || 'Bilinmeyen hata' })
    }
  }

  // Bump project budget if total incomes exceed current budget
  for (const [code, added] of Array.from(addedPerProject.entries())) {
    const project = projectMap.get(code)
    if (!project) continue
    const newTotal = project.totalIncomes + added
    if (newTotal > project.budget) {
      await ctx.supabase
        .from('projects')
        .update({ budget: newTotal })
        .eq('id', project.id)
    }
  }

  return { success, failed }
}
