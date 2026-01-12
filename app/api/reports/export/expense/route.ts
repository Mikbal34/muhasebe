import { NextRequest } from 'next/server'
import {
  generateExcelBuffer,
  createExcelResponse,
  ExcelColumn,
  NUMBER_FORMATS
} from '@/lib/utils/excel-factory'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// Kolon tanımları
const columns: ExcelColumn[] = [
  { key: 'month', label: 'Ay', width: 10, getValue: (e) => String(new Date(e.expense_date).getMonth() + 1) },
  { key: 'year', label: 'Yil', width: 10, getValue: (e) => String(new Date(e.expense_date).getFullYear()) },
  { key: 'project_code', label: 'Proje_Kodu', width: 15, getValue: (e) => e.project?.code || 'GENEL' },
  { key: 'expense_type', label: 'Gider_Tipi', width: 30, getValue: (e) => e.description },
  { key: 'is_tto', label: 'TTO_Gideri', width: 12, getValue: (e) => e.is_tto_expense ? 'Evet' : 'Hayir' },
  { key: 'amount', label: 'Gider', width: 18, numFmt: NUMBER_FORMATS.currency, getValue: (e) => e.amount },
]

const excelConfig = {
  title: 'PROJE BAZLI GIDER TABLOSU',
  sheetName: 'Proje Bazli Gider Tablosu',
  filename: 'proje_bazli_gider',
  columns
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export reports')
    }

    try {
      const body = await request.json()
      const { project_id, start_date, end_date, columns: selectedColumns, format = 'excel' } = body

      // Build query
      let query = ctx.supabase
        .from('expenses')
        .select(`
          id,
          expense_type,
          amount,
          description,
          expense_date,
          is_tto_expense,
          project:projects(id, code, name)
        `)
        .order('expense_date', { ascending: false })

      if (project_id) query = query.eq('project_id', project_id)
      if (start_date) query = query.gte('expense_date', start_date)
      if (end_date) query = query.lte('expense_date', end_date)

      const { data: expenses, error } = await query
      if (error) throw error

      // JSON preview format
      if (format === 'json') {
        const rows = (expenses || []).map((expense: any) => ({
          id: expense.id,
          month: new Date(expense.expense_date).getMonth() + 1,
          year: new Date(expense.expense_date).getFullYear(),
          expense_date: expense.expense_date,
          project_code: expense.project?.code || 'GENEL',
          project_name: expense.project?.name || 'Genel Gider',
          expense_type: expense.expense_type,
          description: expense.description,
          is_tto: expense.is_tto_expense ? 'Evet' : 'Hayır',
          amount: expense.amount
        }))

        const totalAmount = rows.reduce((sum: number, r: any) => sum + (r.amount || 0), 0)

        return apiResponse.success({
          rows,
          summary: {
            totalCount: rows.length,
            totalAmount,
            avgAmount: rows.length > 0 ? totalAmount / rows.length : 0
          }
        })
      }

      // Generate Excel using factory
      const buffer = await generateExcelBuffer(expenses || [], excelConfig, selectedColumns)
      return createExcelResponse(buffer, excelConfig.filename)

    } catch (error: any) {
      console.error('Expense export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}
