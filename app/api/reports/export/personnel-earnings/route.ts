import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
const ExcelJS = require('exceljs')

interface PersonnelEarning {
  personnel_id: string
  personnel_name: string
  project_id: string
  project_code: string
  project_name: string
  total_amount: number
}

interface PersonnelSummary {
  id: string
  name: string
  total_earnings: number
  project_count: number
  avg_per_project: number
  earnings: PersonnelEarning[]
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export reports')
    }

    try {
      const body = await request.json()
      const { start_date, end_date, format = 'excel' } = body

      // Fetch manual balance allocations with personnel and project info
      let query = ctx.supabase
        .from('manual_balance_allocations')
        .select(`
          id,
          amount,
          personnel_id,
          created_at,
          personnel:personnel(id, full_name),
          project:project_id(id, code, name)
        `)
        .not('personnel_id', 'is', null)

      const { data: allocations, error } = await query

      if (error) throw error

      // Filter by date if provided
      let filteredAllocations = allocations || []
      if (start_date || end_date) {
        filteredAllocations = filteredAllocations.filter((alloc: any) => {
          const allocDate = alloc.created_at
          if (!allocDate) return false

          if (start_date && allocDate < start_date) return false
          if (end_date && allocDate > end_date) return false
          return true
        })
      }

      // Group by personnel and project
      const personnelMap = new Map<string, PersonnelSummary>()

      filteredAllocations.forEach((alloc: any) => {
        const personnelId = alloc.personnel_id
        const personnelName = alloc.personnel?.full_name || 'Bilinmiyor'
        const projectId = alloc.project?.id || 'unknown'
        const projectCode = alloc.project?.code || 'N/A'
        const projectName = alloc.project?.name || 'Bilinmeyen Proje'

        if (!personnelMap.has(personnelId)) {
          personnelMap.set(personnelId, {
            id: personnelId,
            name: personnelName,
            total_earnings: 0,
            project_count: 0,
            avg_per_project: 0,
            earnings: []
          })
        }

        const personnel = personnelMap.get(personnelId)!

        // Check if we already have this project
        const existingEarning = personnel.earnings.find(e => e.project_id === projectId)

        if (existingEarning) {
          existingEarning.total_amount += alloc.amount || 0
        } else {
          personnel.earnings.push({
            personnel_id: personnelId,
            personnel_name: personnelName,
            project_id: projectId,
            project_code: projectCode,
            project_name: projectName,
            total_amount: alloc.amount || 0
          })
        }

        personnel.total_earnings += alloc.amount || 0
      })

      // Calculate derived fields
      personnelMap.forEach((personnel) => {
        personnel.project_count = personnel.earnings.length
        personnel.avg_per_project = personnel.project_count > 0
          ? personnel.total_earnings / personnel.project_count
          : 0
      })

      const personnelList = Array.from(personnelMap.values())
        .sort((a, b) => b.total_earnings - a.total_earnings)

      // JSON format için önizleme verisi döndür
      if (format === 'json') {
        const rows = personnelList.map(p => ({
          id: p.id,
          name: p.name,
          total_earnings: p.total_earnings,
          project_count: p.project_count,
          avg_per_project: p.avg_per_project
        }))

        const detailRows = personnelList.flatMap(p =>
          p.earnings.map(e => ({
            personnel_id: e.personnel_id,
            personnel_name: e.personnel_name,
            project_id: e.project_id,
            project_code: e.project_code,
            project_name: e.project_name,
            amount: e.total_amount,
            percentage: p.total_earnings > 0 ? (e.total_amount / p.total_earnings) * 100 : 0
          }))
        )

        const totalEarnings = rows.reduce((sum, r) => sum + r.total_earnings, 0)
        const totalProjects = rows.reduce((sum, r) => sum + r.project_count, 0)

        return apiResponse.success({
          rows: {
            summary: rows,
            details: detailRows
          },
          summary: {
            totalPersonnel: rows.length,
            totalEarnings,
            totalProjects,
            avgEarningPerPerson: rows.length > 0 ? totalEarnings / rows.length : 0
          }
        })
      }

      // Generate Excel
      const buffer = await generatePersonnelEarningsReport(personnelList)

      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="personel_kazanc_raporu_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Personnel earnings export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

async function generatePersonnelEarningsReport(personnelList: PersonnelSummary[]) {
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

  // ========== SHEET 1: PERSONNEL SUMMARY ==========
  const sheet1 = workbook.addWorksheet('Personel Ozeti')

  sheet1.getColumn(1).width = 30
  sheet1.getColumn(2).width = 20
  sheet1.getColumn(3).width = 15
  sheet1.getColumn(4).width = 20

  // Title
  sheet1.mergeCells('A1:D1')
  sheet1.getCell('A1').value = 'PERSONEL KAZANC OZETI'
  sheet1.getCell('A1').font = { bold: true, size: 16 }
  sheet1.getCell('A1').alignment = { horizontal: 'center' }

  sheet1.mergeCells('A2:D2')
  sheet1.getCell('A2').value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  sheet1.getCell('A2').alignment = { horizontal: 'center' }

  // Headers
  const summaryHeaders = ['Personel', 'Toplam Kazanc', 'Proje Sayisi', 'Ortalama/Proje']
  summaryHeaders.forEach((header, index) => {
    const cell = sheet1.getCell(4, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })

  let grandTotal = 0
  let totalProjects = 0

  personnelList.forEach((personnel, rowIndex) => {
    const row = rowIndex + 5
    sheet1.getCell(row, 1).value = personnel.name
    sheet1.getCell(row, 2).value = personnel.total_earnings
    sheet1.getCell(row, 3).value = personnel.project_count
    sheet1.getCell(row, 4).value = personnel.avg_per_project

    for (let i = 1; i <= 4; i++) {
      sheet1.getCell(row, i).style = dataStyle as any
      if (i === 2 || i === 4) {
        sheet1.getCell(row, i).numFmt = '#,##0.00 "₺"'
      }
    }

    grandTotal += personnel.total_earnings
    totalProjects += personnel.project_count
  })

  // Totals row
  const totalRow = personnelList.length + 5
  sheet1.getCell(totalRow, 1).value = 'TOPLAM'
  sheet1.getCell(totalRow, 1).font = { bold: true }
  sheet1.getCell(totalRow, 2).value = grandTotal
  sheet1.getCell(totalRow, 2).numFmt = '#,##0.00 "₺"'
  sheet1.getCell(totalRow, 2).font = { bold: true }
  sheet1.getCell(totalRow, 3).value = totalProjects
  sheet1.getCell(totalRow, 3).font = { bold: true }

  // ========== SHEET 2: PROJECT DETAIL ==========
  const sheet2 = workbook.addWorksheet('Proje Detayi')

  sheet2.getColumn(1).width = 30
  sheet2.getColumn(2).width = 15
  sheet2.getColumn(3).width = 35
  sheet2.getColumn(4).width = 20
  sheet2.getColumn(5).width = 12

  // Title
  sheet2.mergeCells('A1:E1')
  sheet2.getCell('A1').value = 'PROJE BAZLI KAZANC DETAYI'
  sheet2.getCell('A1').font = { bold: true, size: 16 }
  sheet2.getCell('A1').alignment = { horizontal: 'center' }

  sheet2.mergeCells('A2:E2')
  sheet2.getCell('A2').value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  sheet2.getCell('A2').alignment = { horizontal: 'center' }

  // Headers
  const detailHeaders = ['Personel', 'Proje Kodu', 'Proje Adi', 'Kazanc', 'Oran']
  detailHeaders.forEach((header, index) => {
    const cell = sheet2.getCell(4, index + 1)
    cell.value = header
    cell.style = headerStyle as any
  })

  let detailRow = 5

  personnelList.forEach((personnel) => {
    personnel.earnings
      .sort((a, b) => b.total_amount - a.total_amount)
      .forEach((earning) => {
        const percentage = personnel.total_earnings > 0
          ? (earning.total_amount / personnel.total_earnings) * 100
          : 0

        sheet2.getCell(detailRow, 1).value = earning.personnel_name
        sheet2.getCell(detailRow, 2).value = earning.project_code
        sheet2.getCell(detailRow, 3).value = earning.project_name
        sheet2.getCell(detailRow, 4).value = earning.total_amount
        sheet2.getCell(detailRow, 5).value = `%${percentage.toFixed(1)}`

        for (let i = 1; i <= 5; i++) {
          sheet2.getCell(detailRow, i).style = dataStyle as any
          if (i === 4) {
            sheet2.getCell(detailRow, i).numFmt = '#,##0.00 "₺"'
          }
        }

        detailRow++
      })
  })

  return await workbook.xlsx.writeBuffer()
}
