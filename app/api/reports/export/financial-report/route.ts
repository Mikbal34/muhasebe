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
      const { start_date, end_date } = body

      const supabase = await createClient()

      // Fetch incomes
      let incomeQuery = supabase
        .from('incomes')
        .select(`
          id,
          gross_amount,
          vat_amount,
          net_amount,
          collected_amount,
          collection_date,
          income_date,
          description,
          project_id,
          project:projects(id, code, name)
        `)
        .order('income_date', { ascending: false })

      if (start_date) {
        incomeQuery = incomeQuery.gte('income_date', start_date)
      }
      if (end_date) {
        incomeQuery = incomeQuery.lte('income_date', end_date)
      }

      const { data: incomes, error: incomeError } = await incomeQuery

      if (incomeError) throw incomeError

      // Fetch expenses
      let expenseQuery = supabase
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

      if (start_date) {
        expenseQuery = expenseQuery.gte('expense_date', start_date)
      }
      if (end_date) {
        expenseQuery = expenseQuery.lte('expense_date', end_date)
      }

      const { data: expenses, error: expenseError } = await expenseQuery

      if (expenseError) throw expenseError

      // Generate Excel with 3 sheets
      const buffer = await generateFinancialReport(incomes || [], expenses || [])

      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="finansal_rapor_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Financial report export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

interface ProjectSummary {
  code: string
  name: string
  invoiced: number
  collected: number
  outstanding: number
  collectionRate: number
  status: string
  incomes: any[]
}

async function generateFinancialReport(incomes: any[], expenses: any[]) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()

  // Common styles
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

  const sectionTitleStyle = {
    font: { bold: true, size: 12, color: { argb: '14B8A6' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
  }

  // ========== SHEET 1: INCOME/EXPENSE ==========
  const sheet1 = workbook.addWorksheet('Gelir-Gider')

  // Column widths
  sheet1.getColumn(1).width = 15
  sheet1.getColumn(2).width = 30
  sheet1.getColumn(3).width = 12
  sheet1.getColumn(4).width = 18
  sheet1.getColumn(5).width = 15
  sheet1.getColumn(6).width = 18
  sheet1.getColumn(7).width = 18

  let currentRow = 1

  // Title
  sheet1.mergeCells(`A${currentRow}:G${currentRow}`)
  const titleCell = sheet1.getCell(`A${currentRow}`)
  titleCell.value = 'FINANSAL RAPOR - GELIR/GIDER'
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }
  currentRow += 1

  // Date
  sheet1.mergeCells(`A${currentRow}:G${currentRow}`)
  const dateCell = sheet1.getCell(`A${currentRow}`)
  dateCell.value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  dateCell.alignment = { horizontal: 'center' }
  currentRow += 2

  // INCOMES SECTION
  sheet1.getCell(`A${currentRow}`).value = 'GELIRLER'
  sheet1.getCell(`A${currentRow}`).style = sectionTitleStyle as any
  currentRow += 1

  const incomeHeaders = ['Proje Kodu', 'Proje Adi', 'Tarih', 'Brut Tutar', 'KDV', 'Net Tutar', 'Tahsil Edilen']
  incomeHeaders.forEach((header, index) => {
    const cell = sheet1.getCell(currentRow, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })
  currentRow += 1

  let totalGross = 0, totalVat = 0, totalNet = 0, totalCollected = 0

  incomes.forEach((income) => {
    sheet1.getCell(currentRow, 1).value = income.project?.code || 'N/A'
    sheet1.getCell(currentRow, 2).value = income.project?.name || 'N/A'
    sheet1.getCell(currentRow, 3).value = new Date(income.income_date).toLocaleDateString('tr-TR')
    sheet1.getCell(currentRow, 4).value = income.gross_amount || 0
    sheet1.getCell(currentRow, 5).value = income.vat_amount || 0
    sheet1.getCell(currentRow, 6).value = income.net_amount || 0
    sheet1.getCell(currentRow, 7).value = income.collected_amount || 0

    for (let i = 1; i <= 7; i++) {
      sheet1.getCell(currentRow, i).style = dataStyle as any
      if (i >= 4) sheet1.getCell(currentRow, i).numFmt = '#,##0.00 "₺"'
    }

    totalGross += income.gross_amount || 0
    totalVat += income.vat_amount || 0
    totalNet += income.net_amount || 0
    totalCollected += income.collected_amount || 0
    currentRow += 1
  })

  // Income totals
  sheet1.getCell(currentRow, 1).value = 'TOPLAM'
  sheet1.getCell(currentRow, 1).font = { bold: true }
  sheet1.getCell(currentRow, 4).value = totalGross
  sheet1.getCell(currentRow, 5).value = totalVat
  sheet1.getCell(currentRow, 6).value = totalNet
  sheet1.getCell(currentRow, 7).value = totalCollected
  for (let i = 4; i <= 7; i++) {
    sheet1.getCell(currentRow, i).numFmt = '#,##0.00 "₺"'
    sheet1.getCell(currentRow, i).font = { bold: true }
  }
  currentRow += 3

  // EXPENSES SECTION
  sheet1.getCell(`A${currentRow}`).value = 'GIDERLER'
  sheet1.getCell(`A${currentRow}`).style = sectionTitleStyle as any
  currentRow += 1

  const expenseHeaders = ['Proje Kodu', 'Aciklama', 'Tarih', 'Tutar', 'Gider Tipi', 'TTO Gideri', '']
  expenseHeaders.forEach((header, index) => {
    const cell = sheet1.getCell(currentRow, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })
  currentRow += 1

  let totalExpense = 0

  expenses.forEach((expense) => {
    sheet1.getCell(currentRow, 1).value = expense.project?.code || 'GENEL'
    sheet1.getCell(currentRow, 2).value = expense.description || 'N/A'
    sheet1.getCell(currentRow, 3).value = new Date(expense.expense_date).toLocaleDateString('tr-TR')
    sheet1.getCell(currentRow, 4).value = expense.amount || 0
    sheet1.getCell(currentRow, 5).value = expense.expense_type === 'genel' ? 'Genel' : 'Proje'
    sheet1.getCell(currentRow, 6).value = expense.is_tto_expense ? 'Evet' : 'Hayir'

    for (let i = 1; i <= 6; i++) {
      sheet1.getCell(currentRow, i).style = dataStyle as any
      if (i === 4) sheet1.getCell(currentRow, i).numFmt = '#,##0.00 "₺"'
    }

    totalExpense += expense.amount || 0
    currentRow += 1
  })

  // Expense totals
  sheet1.getCell(currentRow, 1).value = 'TOPLAM'
  sheet1.getCell(currentRow, 1).font = { bold: true }
  sheet1.getCell(currentRow, 4).value = totalExpense
  sheet1.getCell(currentRow, 4).numFmt = '#,##0.00 "₺"'
  sheet1.getCell(currentRow, 4).font = { bold: true }
  currentRow += 3

  // SUMMARY SECTION
  sheet1.getCell(`A${currentRow}`).value = 'OZET'
  sheet1.getCell(`A${currentRow}`).style = sectionTitleStyle as any
  currentRow += 1

  const summaryData = [
    ['Toplam Gelir (Brut)', totalGross],
    ['Toplam Gelir (Net)', totalNet],
    ['Toplam Gider', totalExpense],
    ['Net Kar/Zarar', totalNet - totalExpense],
    ['Tahsil Edilen', totalCollected],
    ['Tahsil Orani', totalGross > 0 ? `%${((totalCollected / totalGross) * 100).toFixed(1)}` : '%0']
  ]

  summaryData.forEach(([label, value]) => {
    sheet1.getCell(currentRow, 1).value = label
    sheet1.getCell(currentRow, 1).font = { bold: true }
    if (typeof value === 'number') {
      sheet1.getCell(currentRow, 2).value = value
      sheet1.getCell(currentRow, 2).numFmt = '#,##0.00 "₺"'
      sheet1.getCell(currentRow, 2).font = { bold: true }
    } else {
      sheet1.getCell(currentRow, 2).value = value
      sheet1.getCell(currentRow, 2).font = { bold: true }
    }
    sheet1.getCell(currentRow, 2).alignment = { horizontal: 'right' }
    currentRow += 1
  })

  // ========== SHEET 2: PROJECT RECEIVABLES SUMMARY ==========
  const sheet2 = workbook.addWorksheet('Proje Alacak Ozeti')

  // Group incomes by project
  const projectMap = new Map<string, ProjectSummary>()

  incomes.forEach((income) => {
    const projectId = income.project_id || 'unknown'

    if (!projectMap.has(projectId)) {
      projectMap.set(projectId, {
        code: income.project?.code || 'N/A',
        name: income.project?.name || 'Bilinmeyen Proje',
        invoiced: 0,
        collected: 0,
        outstanding: 0,
        collectionRate: 0,
        status: '',
        incomes: []
      })
    }

    const project = projectMap.get(projectId)!
    project.invoiced += income.gross_amount || 0
    project.collected += income.collected_amount || 0
    project.incomes.push(income)
  })

  // Calculate derived fields
  projectMap.forEach((project) => {
    project.outstanding = project.invoiced - project.collected
    project.collectionRate = project.invoiced > 0
      ? (project.collected / project.invoiced) * 100
      : 0

    if (project.collectionRate >= 100) {
      project.status = 'Tamam'
    } else if (project.collectionRate > 0) {
      project.status = 'Kismi'
    } else {
      project.status = 'Bekliyor'
    }
  })

  const projects = Array.from(projectMap.values())

  // Column widths
  sheet2.getColumn(1).width = 15
  sheet2.getColumn(2).width = 35
  sheet2.getColumn(3).width = 18
  sheet2.getColumn(4).width = 18
  sheet2.getColumn(5).width = 18
  sheet2.getColumn(6).width = 12
  sheet2.getColumn(7).width = 12

  // Title
  sheet2.mergeCells('A1:G1')
  sheet2.getCell('A1').value = 'PROJE BAZLI ALACAK OZETI'
  sheet2.getCell('A1').font = { bold: true, size: 16 }
  sheet2.getCell('A1').alignment = { horizontal: 'center' }

  sheet2.mergeCells('A2:G2')
  sheet2.getCell('A2').value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  sheet2.getCell('A2').alignment = { horizontal: 'center' }

  // Headers
  const summaryHeaders = ['Proje Kodu', 'Proje Adi', 'Fatura Kesilen', 'Tahsil Edilen', 'Kalan Alacak', 'Tahsil Orani', 'Durum']
  summaryHeaders.forEach((header, index) => {
    const cell = sheet2.getCell(4, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })

  let totalInvoiced = 0, totalCollectedProj = 0, totalOutstanding = 0

  projects.forEach((project, rowIndex) => {
    const row = rowIndex + 5
    sheet2.getCell(row, 1).value = project.code
    sheet2.getCell(row, 2).value = project.name
    sheet2.getCell(row, 3).value = project.invoiced
    sheet2.getCell(row, 4).value = project.collected
    sheet2.getCell(row, 5).value = project.outstanding
    sheet2.getCell(row, 6).value = `%${project.collectionRate.toFixed(1)}`
    sheet2.getCell(row, 7).value = project.status

    for (let i = 1; i <= 7; i++) {
      sheet2.getCell(row, i).style = dataStyle as any
      if (i >= 3 && i <= 5) sheet2.getCell(row, i).numFmt = '#,##0.00 "₺"'
    }

    // Color code status
    const statusCell = sheet2.getCell(row, 7)
    if (project.status === 'Tamam') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } }
      statusCell.font = { color: { argb: '059669' } }
    } else if (project.status === 'Kismi') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } }
      statusCell.font = { color: { argb: 'D97706' } }
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
      statusCell.font = { color: { argb: 'DC2626' } }
    }

    totalInvoiced += project.invoiced
    totalCollectedProj += project.collected
    totalOutstanding += project.outstanding
  })

  // Totals
  const totalRowNum = projects.length + 5
  sheet2.getCell(totalRowNum, 1).value = 'TOPLAM'
  sheet2.getCell(totalRowNum, 1).font = { bold: true }
  sheet2.getCell(totalRowNum, 3).value = totalInvoiced
  sheet2.getCell(totalRowNum, 4).value = totalCollectedProj
  sheet2.getCell(totalRowNum, 5).value = totalOutstanding
  sheet2.getCell(totalRowNum, 6).value = totalInvoiced > 0 ? `%${((totalCollectedProj / totalInvoiced) * 100).toFixed(1)}` : '%0'

  for (let i = 3; i <= 5; i++) {
    sheet2.getCell(totalRowNum, i).numFmt = '#,##0.00 "₺"'
    sheet2.getCell(totalRowNum, i).font = { bold: true }
  }
  sheet2.getCell(totalRowNum, 6).font = { bold: true }

  // ========== SHEET 3: INVOICE DETAIL ==========
  const sheet3 = workbook.addWorksheet('Fatura Detayi')

  sheet3.getColumn(1).width = 15
  sheet3.getColumn(2).width = 12
  sheet3.getColumn(3).width = 12
  sheet3.getColumn(4).width = 18
  sheet3.getColumn(5).width = 18
  sheet3.getColumn(6).width = 18
  sheet3.getColumn(7).width = 12

  // Title
  sheet3.mergeCells('A1:G1')
  sheet3.getCell('A1').value = 'FATURA DETAYI'
  sheet3.getCell('A1').font = { bold: true, size: 16 }
  sheet3.getCell('A1').alignment = { horizontal: 'center' }

  sheet3.mergeCells('A2:G2')
  sheet3.getCell('A2').value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  sheet3.getCell('A2').alignment = { horizontal: 'center' }

  // Headers
  const detailHeaders = ['Proje Kodu', 'Gelir No', 'Fatura Tarihi', 'Brut Tutar', 'Tahsil Edilen', 'Kalan Tutar', 'Tahsil Tarihi']
  detailHeaders.forEach((header, index) => {
    const cell = sheet3.getCell(4, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })

  let detailRow = 5
  let incomeCounter = 1

  projects.forEach((project) => {
    project.incomes
      .sort((a: any, b: any) => new Date(a.income_date).getTime() - new Date(b.income_date).getTime())
      .forEach((income: any) => {
        const outstanding = (income.gross_amount || 0) - (income.collected_amount || 0)

        sheet3.getCell(detailRow, 1).value = project.code
        sheet3.getCell(detailRow, 2).value = `GEL-${String(incomeCounter).padStart(3, '0')}`
        sheet3.getCell(detailRow, 3).value = new Date(income.income_date).toLocaleDateString('tr-TR')
        sheet3.getCell(detailRow, 4).value = income.gross_amount || 0
        sheet3.getCell(detailRow, 5).value = income.collected_amount || 0
        sheet3.getCell(detailRow, 6).value = outstanding
        sheet3.getCell(detailRow, 7).value = income.collection_date
          ? new Date(income.collection_date).toLocaleDateString('tr-TR')
          : '-'

        for (let i = 1; i <= 7; i++) {
          sheet3.getCell(detailRow, i).style = dataStyle as any
          if (i >= 4 && i <= 6) sheet3.getCell(detailRow, i).numFmt = '#,##0.00 "₺"'
        }

        if (outstanding > 0) {
          sheet3.getCell(detailRow, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEE2E2' } }
          sheet3.getCell(detailRow, 6).font = { color: { argb: 'DC2626' } }
        }

        detailRow++
        incomeCounter++
      })
  })

  return await workbook.xlsx.writeBuffer()
}
