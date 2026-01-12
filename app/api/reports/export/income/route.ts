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
  { key: 'month', label: 'Ay', width: 10, getValue: (i) => String(new Date(i.income_date).getMonth() + 1) },
  { key: 'year', label: 'Yil', width: 10, getValue: (i) => String(new Date(i.income_date).getFullYear()) },
  { key: 'project_code', label: 'Proje_Kodu', width: 15, getValue: (i) => i.project?.code || 'N/A' },
  { key: 'is_fsmh', label: 'FSMH_Geliri', width: 15, getValue: (i) => i.is_fsmh_income ? 'Evet' : 'Hayir' },
  { key: 'income_type', label: 'Gelir_Tipi', width: 12, getValue: (i) => i.income_type === 'ozel' ? 'Ozel' : 'Kamu' },
  { key: 'is_tto', label: 'TTO_Geliri', width: 12, getValue: (i) => i.is_tto_income ? 'Evet' : 'Hayir' },
  { key: 'amount', label: 'Gelir', width: 18, numFmt: NUMBER_FORMATS.currency, getValue: (i) => i.gross_amount },
]

const excelConfig = {
  title: 'PROJE BAZLI GELIR TABLOSU',
  sheetName: 'Proje Bazli Gelir Tablosu',
  filename: 'proje_bazli_gelir',
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
        .from('incomes')
        .select(`
          id,
          gross_amount,
          vat_amount,
          net_amount,
          income_date,
          is_fsmh_income,
          income_type,
          is_tto_income,
          project:projects(id, code, name)
        `)
        .order('income_date', { ascending: false })

      if (project_id) query = query.eq('project_id', project_id)
      if (start_date) query = query.gte('income_date', start_date)
      if (end_date) query = query.lte('income_date', end_date)

      const { data: incomes, error } = await query
      if (error) throw error

      // JSON preview format
      if (format === 'json') {
        const rows = (incomes || []).map((income: any) => ({
          id: income.id,
          month: new Date(income.income_date).getMonth() + 1,
          year: new Date(income.income_date).getFullYear(),
          income_date: income.income_date,
          project_code: income.project?.code || 'N/A',
          project_name: income.project?.name || 'Bilinmiyor',
          is_fsmh: income.is_fsmh_income ? 'Evet' : 'Hayır',
          income_type: income.income_type === 'ozel' ? 'Özel' : 'Kamu',
          is_tto: income.is_tto_income ? 'Evet' : 'Hayır',
          gross_amount: income.gross_amount,
          vat_amount: income.vat_amount,
          net_amount: income.net_amount
        }))

        const totalAmount = rows.reduce((sum: number, r: any) => sum + (r.gross_amount || 0), 0)
        const totalVat = rows.reduce((sum: number, r: any) => sum + (r.vat_amount || 0), 0)
        const totalNet = rows.reduce((sum: number, r: any) => sum + (r.net_amount || 0), 0)

        return apiResponse.success({
          rows,
          summary: {
            totalCount: rows.length,
            totalAmount,
            totalVat,
            totalNet,
            avgAmount: rows.length > 0 ? totalAmount / rows.length : 0
          }
        })
      }

      // Generate Excel using factory
      const buffer = await generateExcelBuffer(incomes || [], excelConfig, selectedColumns)
      return createExcelResponse(buffer, excelConfig.filename)

    } catch (error: any) {
      console.error('Income export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}
