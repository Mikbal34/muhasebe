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
      const { project_id, start_date, end_date, columns } = body

      const supabase = await createClient()

      // Build query
      let query = supabase
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

      if (project_id) {
        query = query.eq('project_id', project_id)
      }
      if (start_date) {
        query = query.gte('expense_date', start_date)
      }
      if (end_date) {
        query = query.lte('expense_date', end_date)
      }

      const { data: expenses, error } = await query

      if (error) throw error

      // Generate Excel
      const buffer = await generateExpenseExcel(expenses || [], columns)

      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="proje_bazli_gider_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Expense export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

// Tüm kolon tanımları
const allColumnDefs = [
  { key: 'month', label: 'Ay', width: 10, getValue: (expense: any) => String(new Date(expense.expense_date).getMonth() + 1) },
  { key: 'year', label: 'Yil', width: 10, getValue: (expense: any) => String(new Date(expense.expense_date).getFullYear()) },
  { key: 'project_code', label: 'Proje_Kodu', width: 15, getValue: (expense: any) => expense.project?.code || 'GENEL' },
  { key: 'expense_type', label: 'Gider_Tipi', width: 30, getValue: (expense: any) => expense.description },
  { key: 'is_tto', label: 'TTO_Gideri', width: 12, getValue: (expense: any) => expense.is_tto_expense ? 'Evet' : 'Hayir' },
  { key: 'amount', label: 'Gider', width: 18, numFmt: '#,##0.00 "₺"', getValue: (expense: any) => expense.amount },
]

async function generateExpenseExcel(expenses: any[], columns?: string[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Proje Bazli Gider Tablosu')

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
  titleCell.value = 'PROJE BAZLI GIDER TABLOSU'
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }

  // Headers - Row 3
  activeColumns.forEach((col, index) => {
    const cell = worksheet.getCell(3, index + 1)
    cell.value = col.label
    cell.style = headerStyle as any
  })

  // Data
  expenses.forEach((expense, rowIndex) => {
    const row = rowIndex + 4
    activeColumns.forEach((col, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1)
      cell.value = col.getValue(expense)
      cell.style = dataStyle as any
      // numFmt varsa hücreye de uygula
      if (col.numFmt) {
        cell.numFmt = col.numFmt
      }
    })
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
