import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createClient } from '@/lib/supabase/server'
const ExcelJS = require('exceljs')

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export reports')
    }

    try {
      const body = await request.json().catch(() => ({}))
      const { columns } = body

      const supabase = await createClient()

      // Fetch all people (users and personnel)
      const { data: people, error } = await supabase
        .from('all_people')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (error) throw error

      // Generate Excel
      const buffer = await generatePersonnelExcel(people || [], columns)

      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="personel_listesi_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Personnel export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

// Tüm kolon tanımları
const allColumnDefs = [
  { key: 'full_name', label: 'Adi Soyadi', width: 25, getValue: (person: any) => person.full_name || '' },
  { key: 'tc_no', label: 'T.C. No', width: 15, getValue: (person: any) => person.tc_no || '' },
  { key: 'email', label: 'Email', width: 30, getValue: (person: any) => person.email || '' },
  { key: 'phone', label: 'Cep Telefon', width: 15, getValue: (person: any) => person.phone || '' },
  { key: 'start_date', label: 'Baslama Tarihi', width: 15, getValue: (person: any) => formatDate(person.start_date) },
  { key: 'iban', label: 'IBAN Bilgileri', width: 30, getValue: (person: any) => person.iban || '' },
]

async function generatePersonnelExcel(people: any[], columns?: string[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Personel Listesi')

  // Aktif kolonları belirle
  const activeColumns = columns?.length
    ? allColumnDefs.filter(col => columns.includes(col.key))
    : allColumnDefs

  // Header styling
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '14B8A6' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  const dataStyle = {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    },
    alignment: { horizontal: 'center', vertical: 'middle' }
  }

  // Title
  const lastCol = String.fromCharCode(64 + activeColumns.length)
  worksheet.mergeCells(`A1:${lastCol}1`)
  const titleCell = worksheet.getCell('A1')
  titleCell.value = 'PERSONEL LISTESI'
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }

  // Headers - Row 3
  activeColumns.forEach((col, index) => {
    const cell = worksheet.getCell(3, index + 1)
    cell.value = col.label
    cell.style = headerStyle as any
  })

  // Data
  people.forEach((person, rowIndex) => {
    const row = rowIndex + 4
    activeColumns.forEach((col, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1)
      cell.value = col.getValue(person)
      cell.style = dataStyle as any
    })
  })

  // Format and width columns
  activeColumns.forEach((col, index) => {
    const column = worksheet.getColumn(index + 1)
    column.width = col.width
  })

  return await workbook.xlsx.writeBuffer()
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}
