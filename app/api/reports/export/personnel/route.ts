import { NextRequest } from 'next/server'
import {
  generateExcelBuffer,
  createExcelResponse,
  ExcelColumn,
  ColumnValueGetters
} from '@/lib/utils/excel-factory'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// Kolon tanımları
const columns: ExcelColumn[] = [
  { key: 'full_name', label: 'Adi Soyadi', width: 25, getValue: (p) => p.full_name || '' },
  { key: 'tc_no', label: 'T.C. No', width: 15, getValue: (p) => p.tc_no || '' },
  { key: 'email', label: 'Email', width: 30, getValue: (p) => p.email || '' },
  { key: 'phone', label: 'Cep Telefon', width: 15, getValue: (p) => p.phone || '' },
  { key: 'start_date', label: 'Baslama Tarihi', width: 15, getValue: (p) => ColumnValueGetters.date(p.start_date) },
  { key: 'iban', label: 'IBAN Bilgileri', width: 30, getValue: (p) => p.iban || '' },
]

const excelConfig = {
  title: 'PERSONEL LISTESI',
  sheetName: 'Personel Listesi',
  filename: 'personel_listesi',
  columns
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export reports')
    }

    try {
      const body = await request.json().catch(() => ({}))
      const { columns: selectedColumns, format = 'excel' } = body

      // Fetch data
      const { data: people, error } = await ctx.supabase
        .from('all_people')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error

      // JSON preview format
      if (format === 'json') {
        const rows = (people || []).map((person: any) => ({
          id: person.id,
          full_name: person.full_name || '',
          tc_no: person.tc_no || '',
          email: person.email || '',
          phone: person.phone || '',
          start_date: person.start_date,
          iban: person.iban || '',
          source_type: person.source_type || '',
          role: person.role || ''
        }))

        return apiResponse.success({
          rows,
          summary: { totalCount: rows.length }
        })
      }

      // Generate Excel using factory
      const buffer = await generateExcelBuffer(people || [], excelConfig, selectedColumns)
      return createExcelResponse(buffer, excelConfig.filename)

    } catch (error: any) {
      console.error('Personnel export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}
