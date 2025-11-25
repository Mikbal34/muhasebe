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
      const body = await request.json()
      const { project_id, columns } = body

      const supabase = await createClient()

      // Build query
      let query = supabase
        .from('projects')
        .select(`
          id,
          code,
          name,
          budget,
          start_date,
          end_date,
          status,
          contract_date,
          extension_date,
          detailed_name,
          project_representatives(
            id,
            role,
            user:users(
              id,
              full_name,
              email,
              phone,
              title,
              gender,
              faculty,
              department,
              university
            ),
            personnel:personnel(
              id,
              full_name,
              email,
              phone,
              title,
              gender,
              faculty,
              department,
              university
            )
          )
        `)
        .order('code', { ascending: true })

      if (project_id) {
        query = query.eq('id', project_id)
      }

      const { data: projects, error } = await query

      if (error) throw error

      // Generate Excel
      const buffer = await generateProjectCardExcel(projects || [], columns)

      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="proje_kunyesi_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Project card export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

// Tüm kolon tanımları
const allColumnDefs = [
  { key: 'code', label: 'Proje ID', width: 12, getValue: (project: any, person: any) => project.code },
  { key: 'name', label: 'PROJE ADI', width: 30, getValue: (project: any, person: any) => project.name },
  { key: 'gender', label: 'CINSIYET', width: 10, getValue: (project: any, person: any) => person?.gender || '' },
  { key: 'title', label: 'UNVAN', width: 15, getValue: (project: any, person: any) => person?.title || '' },
  { key: 'workers', label: 'PROJE CALISANLARI', width: 25, getValue: (project: any, person: any) => person?.full_name || '' },
  { key: 'contract_date', label: 'SOZLESME TARIHI', width: 15, getValue: (project: any, person: any) => formatDate(project.contract_date) },
  { key: 'start_date', label: 'BASLANGIC TARIHI', width: 15, getValue: (project: any, person: any) => formatDate(project.start_date) },
  { key: 'end_date', label: 'BITIS TARIHI', width: 15, getValue: (project: any, person: any) => formatDate(project.end_date) },
  { key: 'extension_date', label: 'UZATMA TARIHI', width: 15, getValue: (project: any, person: any) => formatDate(project.extension_date) },
  { key: 'budget', label: 'PROJE BEDELI', width: 18, numFmt: '#,##0.00 "₺"', getValue: (project: any, person: any) => project.budget },
  { key: 'vat', label: 'KDV', width: 15, numFmt: '#,##0.00 "₺"', getValue: (project: any, person: any) => project.budget * 0.20 },
  { key: 'email', label: 'MAIL ADRESLERI', width: 30, getValue: (project: any, person: any) => person?.email || '' },
  { key: 'faculty', label: 'FAKULTE', width: 20, getValue: (project: any, person: any) => person?.faculty || '' },
  { key: 'department', label: 'BOLUM', width: 20, getValue: (project: any, person: any) => person?.department || '' },
  { key: 'university', label: 'UNIVERSITE', width: 25, getValue: (project: any, person: any) => person?.university || 'Yildiz Teknik Universitesi' },
  { key: 'detailed_name', label: 'PROJE ADI (Detay)', width: 40, getValue: (project: any, person: any) => project.detailed_name || '' },
]

async function generateProjectCardExcel(projects: any[], columns?: string[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Proje Kunyesi')

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
  titleCell.value = 'PROJE KUNYESI'
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }

  // Headers - Row 3
  activeColumns.forEach((col, index) => {
    const cell = worksheet.getCell(3, index + 1)
    cell.value = col.label
    cell.style = headerStyle as any
  })

  // Data - each project can have multiple representatives
  let currentRow = 4
  projects.forEach((project) => {
    const representatives = project.project_representatives || []

    // If no representatives, still add the project row
    if (representatives.length === 0) {
      addProjectRow(worksheet, currentRow, project, null, activeColumns, dataStyle)
      currentRow++
    } else {
      // Add a row for each representative
      representatives.forEach((rep: any) => {
        const person = rep.user || rep.personnel
        addProjectRow(worksheet, currentRow, project, person, activeColumns, dataStyle)
        currentRow++
      })
    }
  })

  // Format and width columns
  activeColumns.forEach((col, index) => {
    const column = worksheet.getColumn(index + 1)
    column.width = col.width
    if (col.numFmt) {
      column.numFmt = col.numFmt
    }
  })

  return await workbook.xlsx.writeBuffer()
}

function addProjectRow(worksheet: any, row: number, project: any, person: any, activeColumns: any[], dataStyle: any) {
  activeColumns.forEach((col, colIndex) => {
    const cell = worksheet.getCell(row, colIndex + 1)
    cell.value = col.getValue(project, person)
    cell.style = dataStyle
    // numFmt varsa hücreye de uygula
    if (col.numFmt) {
      cell.numFmt = col.numFmt
    }
  })
}

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}
