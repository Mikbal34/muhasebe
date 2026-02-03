import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface ImportRow {
  rowNumber: number
  expense_type: 'genel' | 'proje'
  project_code: string | null
  amount: number
  description: string
  expense_date: string
  payer_type: string
  is_tto_expense: boolean
  expense_share_type: 'shared' | 'client'
}

interface ValidationError {
  row: number
  column: string
  message: string
}

interface ParsedRow {
  'Gider Tipi'?: string
  'Proje Kodu'?: string
  'Tutar'?: number | string
  'Açıklama'?: string
  'Gider Tarihi'?: string | number | Date
  'Gideri Ödeyen'?: string
}

function parsePayerType(value: string | undefined): { is_tto_expense: boolean; expense_share_type: 'shared' | 'client' } {
  const v = value?.toLowerCase().trim()
  if (v === 'ortak' || v === 'shared') {
    return { is_tto_expense: false, expense_share_type: 'shared' }
  }
  if (v === 'karşı taraf' || v === 'client' || v === 'karsi taraf') {
    return { is_tto_expense: false, expense_share_type: 'client' }
  }
  // Varsayılan: TTO
  return { is_tto_expense: true, expense_share_type: 'client' }
}

function parseExpenseType(value: string | undefined): 'genel' | 'proje' | null {
  const v = value?.toLowerCase().trim()
  if (v === 'genel') return 'genel'
  if (v === 'proje') return 'proje'
  return null
}

function parseDate(value: string | number | Date | undefined): string | null {
  if (!value) return null

  // Excel serial date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const year = date.y
      const month = String(date.m).padStart(2, '0')
      const day = String(date.d).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return null
  }

  // Date object
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // String format: DD.MM.YYYY or DD/MM/YYYY or YYYY-MM-DD
  const str = String(value).trim()

  // DD.MM.YYYY format
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // DD/MM/YYYY format
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // YYYY-MM-DD format
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return str
  }

  return null
}

function parseAmount(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null

  if (typeof value === 'number') {
    return value
  }

  // String: Remove spaces, replace comma with dot
  const str = String(value).trim().replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(str)

  if (isNaN(num)) return null
  return num
}

// POST /api/expenses/import - Import expenses from Excel
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can import expenses
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece yöneticiler toplu gider aktarabilir')
    }

    try {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return apiResponse.error('Dosya bulunamadı', undefined, 400)
      }

      // Check file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        return apiResponse.error('Geçersiz dosya formatı. Lütfen Excel dosyası (.xlsx, .xls) yükleyin', undefined, 400)
      }

      // Read file
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })

      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        return apiResponse.error('Excel dosyası boş', undefined, 400)
      }

      const sheet = workbook.Sheets[sheetName]
      const rows: ParsedRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      if (rows.length === 0) {
        return apiResponse.error('Excel dosyasında veri bulunamadı', undefined, 400)
      }

      // Validate and parse rows
      const errors: ValidationError[] = []
      const validRows: ImportRow[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // Excel row number (1-indexed + header)

        // Gider Tipi
        const expenseType = parseExpenseType(row['Gider Tipi'])
        if (!expenseType) {
          errors.push({
            row: rowNumber,
            column: 'Gider Tipi',
            message: "Gider tipi 'Genel' veya 'Proje' olmalı"
          })
          continue
        }

        // Proje Kodu
        const projectCode = row['Proje Kodu']?.toString().trim() || null
        if (expenseType === 'proje' && !projectCode) {
          errors.push({
            row: rowNumber,
            column: 'Proje Kodu',
            message: 'Proje gideri için proje kodu zorunlu'
          })
          continue
        }

        // Tutar
        const amount = parseAmount(row['Tutar'])
        if (amount === null) {
          errors.push({
            row: rowNumber,
            column: 'Tutar',
            message: 'Tutar geçersiz'
          })
          continue
        }
        if (amount <= 0) {
          errors.push({
            row: rowNumber,
            column: 'Tutar',
            message: "Tutar 0'dan büyük olmalı"
          })
          continue
        }

        // Açıklama
        const description = row['Açıklama']?.toString().trim()
        if (!description) {
          errors.push({
            row: rowNumber,
            column: 'Açıklama',
            message: 'Açıklama zorunlu'
          })
          continue
        }

        // Gider Tarihi
        const expenseDate = parseDate(row['Gider Tarihi']) || new Date().toISOString().split('T')[0]

        // Validate date format
        const dateCheck = new Date(expenseDate)
        if (isNaN(dateCheck.getTime())) {
          errors.push({
            row: rowNumber,
            column: 'Gider Tarihi',
            message: 'Gider tarihi geçersiz'
          })
          continue
        }

        // Gideri Ödeyen
        const payerType = row['Gideri Ödeyen']?.toString().trim() || 'TTO'
        const { is_tto_expense, expense_share_type } = parsePayerType(payerType)

        validRows.push({
          rowNumber,
          expense_type: expenseType,
          project_code: projectCode,
          amount,
          description,
          expense_date: expenseDate,
          payer_type: payerType,
          is_tto_expense: expenseType === 'genel' ? true : is_tto_expense,
          expense_share_type
        })
      }

      // If there are validation errors, return them
      if (errors.length > 0 && validRows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Tüm satırlarda hata var',
          data: { errors }
        }, { status: 400 })
      }

      // Get unique project codes from valid rows
      const projectCodes = Array.from(new Set(validRows.filter(r => r.project_code).map(r => r.project_code!)))

      // Fetch projects by codes
      const projectMap = new Map<string, { id: string; status: string }>()

      if (projectCodes.length > 0) {
        const { data: projects, error: projectsError } = await ctx.supabase
          .from('projects')
          .select('id, code, status')
          .in('code', projectCodes)

        if (projectsError) {
          return apiResponse.error('Projeler kontrol edilemedi', projectsError.message, 500)
        }

        for (const project of projects || []) {
          projectMap.set(project.code, { id: project.id, status: project.status })
        }
      }

      // Validate projects and prepare insert data
      const expensesToInsert: Array<{
        expense_type: 'genel' | 'proje'
        project_id: string | null
        amount: number
        description: string
        expense_date: string
        is_tto_expense: boolean
        expense_share_type: 'shared' | 'client' | null
        created_by: string
      }> = []

      for (const row of validRows) {
        if (row.expense_type === 'proje' && row.project_code) {
          const project = projectMap.get(row.project_code)

          if (!project) {
            errors.push({
              row: row.rowNumber,
              column: 'Proje Kodu',
              message: `Proje bulunamadı: ${row.project_code}`
            })
            continue
          }

          if (project.status !== 'active') {
            errors.push({
              row: row.rowNumber,
              column: 'Proje Kodu',
              message: `Proje aktif değil: ${row.project_code}`
            })
            continue
          }

          expensesToInsert.push({
            expense_type: 'proje',
            project_id: project.id,
            amount: row.amount,
            description: row.description,
            expense_date: row.expense_date,
            is_tto_expense: row.is_tto_expense,
            expense_share_type: row.is_tto_expense ? null : row.expense_share_type,
            created_by: ctx.user.id
          })
        } else {
          expensesToInsert.push({
            expense_type: 'genel',
            project_id: null,
            amount: row.amount,
            description: row.description,
            expense_date: row.expense_date,
            is_tto_expense: true,
            expense_share_type: null,
            created_by: ctx.user.id
          })
        }
      }

      // If no valid expenses to insert
      if (expensesToInsert.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Aktarılacak geçerli gider bulunamadı',
          data: { errors }
        }, { status: 400 })
      }

      // Insert expenses
      const { data: insertedExpenses, error: insertError } = await (ctx.supabase as any)
        .from('expenses')
        .insert(expensesToInsert)
        .select('id')

      if (insertError) {
        console.error('Expense insert error:', insertError)
        return apiResponse.error('Giderler aktarılamadı', insertError.message, 500)
      }

      // Create audit log for bulk import
      await (ctx.supabase as any).rpc('create_audit_log', {
        p_user_id: ctx.user.id,
        p_action: 'BULK_IMPORT',
        p_entity_type: 'expense',
        p_entity_id: insertedExpenses?.[0]?.id || null,
        p_new_values: {
          imported_count: expensesToInsert.length,
          total_amount: expensesToInsert.reduce((sum, e) => sum + e.amount, 0)
        }
      })

      const totalAmount = expensesToInsert.reduce((sum, e) => sum + e.amount, 0)

      return apiResponse.success(
        {
          imported: expensesToInsert.length,
          total_amount: totalAmount,
          errors: errors.length > 0 ? errors : undefined
        },
        `${expensesToInsert.length} gider başarıyla aktarıldı (Toplam: ₺${totalAmount.toLocaleString('tr-TR')})`
      )
    } catch (error: any) {
      console.error('Expense import error:', error)
      return apiResponse.error('İçe aktarma başarısız', error.message, 500)
    }
  })
}
