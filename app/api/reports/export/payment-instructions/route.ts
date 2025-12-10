import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
const ExcelJS = require('exceljs')

interface PaymentInstructionExportRequest {
  start_date?: string
  end_date?: string
  status?: 'pending' | 'completed' | 'rejected'
  banking: {
    company_iban: string
    bank_name: string
    company_vkn: string
    company_name: string
  }
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can export
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can export payment instructions')
    }

    try {
      const body: PaymentInstructionExportRequest = await request.json()
      const { start_date, end_date, status, banking } = body

      // Validate banking info
      if (!banking?.company_iban || !banking?.company_vkn) {
        return apiResponse.error(
          'Missing banking info',
          'Şirket IBAN ve VKN bilgileri gereklidir. Lütfen ayarlardan banka bilgilerini ekleyin.',
          400
        )
      }

      // Build query for payment instructions
      let query = ctx.supabase
        .from('payment_instructions')
        .select(`
          *,
          user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
          personnel:personnel!payment_instructions_personnel_id_fkey(id, full_name, email, iban),
          items:payment_instruction_items(
            id,
            amount,
            description,
            income_distribution:income_distributions(
              id,
              amount,
              income:incomes(
                id,
                description,
                project:projects(id, name, code)
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (start_date) {
        query = query.gte('created_at', start_date)
      }

      if (end_date) {
        query = query.lte('created_at', end_date + 'T23:59:59')
      }

      const { data: payments, error } = await query

      if (error) {
        console.error('Payment instructions fetch error:', error)
        return apiResponse.error('Failed to fetch payment instructions', error.message, 500)
      }

      if (!payments || payments.length === 0) {
        return apiResponse.error('No data', 'Seçilen kriterlere uygun ödeme talimatı bulunamadı.', 404)
      }

      // Generate Halkbank format Excel
      const buffer = await generateHalkbankExcel(payments, banking)

      // Return the file as a download
      const headers = new Headers()
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
      headers.set('Content-Disposition', `attachment; filename="odeme_talimati_halkbank_${dateStr}.xlsx"`)

      return new NextResponse(buffer, { headers })

    } catch (error: any) {
      console.error('Payment instructions export error:', error)
      return apiResponse.error('Export failed', error.message, 500)
    }
  })
}

async function generateHalkbankExcel(
  payments: any[],
  banking: PaymentInstructionExportRequest['banking']
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazılımı'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Ödeme Talimatı')

  // Set column widths
  worksheet.columns = [
    { width: 30 }, // A - GÖNDEREN IBAN
    { width: 25 }, // B - ALICI ADI
    { width: 15 }, // C - TUTAR
    { width: 30 }, // D - ALICI IBAN
    { width: 50 }, // E - AÇIKLAMA
  ]

  // Styles
  const headerStyle = {
    font: { bold: true, size: 12, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  const titleStyle = {
    font: { bold: true, size: 14 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  const bankHeaderStyle = {
    font: { bold: true, size: 16, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '00529B' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'medium' },
      bottom: { style: 'medium' },
      left: { style: 'medium' },
      right: { style: 'medium' }
    }
  }

  // Row 1 - Bank name header
  worksheet.mergeCells('A1:E1')
  const bankCell = worksheet.getCell('A1')
  bankCell.value = banking.bank_name || 'HALKBANK'
  bankCell.style = bankHeaderStyle as any
  worksheet.getRow(1).height = 30

  // Row 2 - Bank full name
  worksheet.mergeCells('A2:E2')
  const bankFullCell = worksheet.getCell('A2')
  bankFullCell.value = getBankFullName(banking.bank_name)
  bankFullCell.style = titleStyle as any
  worksheet.getRow(2).height = 25

  // Row 3 - Company name and payment title
  worksheet.mergeCells('A3:E3')
  const companyCell = worksheet.getCell('A3')
  companyCell.value = `${banking.company_name || 'ŞİRKET'} ÖDEME TALİMATI`
  companyCell.style = titleStyle as any
  worksheet.getRow(3).height = 25

  // Row 4 - Sender VKN
  worksheet.mergeCells('A4:E4')
  const vknCell = worksheet.getCell('A4')
  vknCell.value = `GÖNDEREN VKN: ${banking.company_vkn}`
  vknCell.style = {
    font: { bold: true },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  } as any
  worksheet.getRow(4).height = 22

  // Row 5 - Empty row
  worksheet.getRow(5).height = 10

  // Row 6 - Column headers
  const columnHeaders = ['GÖNDEREN IBAN', 'ALICI ADI', 'TUTAR', 'ALICI IBAN', 'AÇIKLAMA']
  columnHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}6`)
    cell.value = header
    cell.style = headerStyle as any
  })
  worksheet.getRow(6).height = 25

  // Data rows
  let currentRow = 7
  let totalAmount = 0

  const dataStyle = {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    },
    alignment: { vertical: 'middle' }
  }

  for (const payment of payments) {
    const recipientName = payment.user?.full_name || payment.personnel?.full_name || 'Bilinmiyor'
    const recipientIban = payment.user?.iban || payment.personnel?.iban || ''

    // Build description from payment items
    const description = buildPaymentDescription(payment, recipientName)

    worksheet.getCell(`A${currentRow}`).value = banking.company_iban
    worksheet.getCell(`B${currentRow}`).value = recipientName
    worksheet.getCell(`C${currentRow}`).value = formatCurrency(payment.total_amount)
    worksheet.getCell(`D${currentRow}`).value = recipientIban
    worksheet.getCell(`E${currentRow}`).value = description

    // Apply styles
    for (let col = 0; col < 5; col++) {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + col)}${currentRow}`)
      cell.style = dataStyle as any
    }

    totalAmount += payment.total_amount || 0
    currentRow++
  }

  // Total row
  worksheet.getCell(`A${currentRow}`).value = ''
  worksheet.getCell(`B${currentRow}`).value = 'TOPLAM'
  worksheet.getCell(`B${currentRow}`).font = { bold: true }
  worksheet.getCell(`C${currentRow}`).value = formatCurrency(totalAmount)
  worksheet.getCell(`C${currentRow}`).font = { bold: true }
  worksheet.getCell(`D${currentRow}`).value = ''
  worksheet.getCell(`E${currentRow}`).value = ''

  // Apply border to total row
  for (let col = 0; col < 5; col++) {
    const cell = worksheet.getCell(`${String.fromCharCode(65 + col)}${currentRow}`)
    cell.style = {
      border: {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      },
      alignment: { vertical: 'middle' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F5F5' } }
    } as any
  }

  return await workbook.xlsx.writeBuffer()
}

function buildPaymentDescription(payment: any, recipientName: string): string {
  // Try to get project info from payment items
  const items = payment.items || []

  for (const item of items) {
    const distribution = item.income_distribution
    if (distribution?.income?.project) {
      const project = distribution.income.project
      const projectCode = project.code || ''
      const projectName = project.name || ''
      return `(${projectCode})${projectName} DANIŞMANLIK ÖDEMESİ - ${recipientName}`
    }
  }

  // Fallback to notes or generic description
  if (payment.notes) {
    return payment.notes
  }

  return `DANIŞMANLIK ÖDEMESİ - ${recipientName}`
}

function formatCurrency(amount: number | null | undefined): string {
  const value = amount || 0
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}

function getBankFullName(bankName: string): string {
  const bankNames: Record<string, string> = {
    'HALKBANK': 'TÜRKİYE HALK BANKASI A.Ş.',
    'VAKIFBANK': 'TÜRKİYE VAKIFLAR BANKASI T.A.O.',
    'ZIRAAT': 'T.C. ZİRAAT BANKASI A.Ş.',
    'ISBANK': 'TÜRKİYE İŞ BANKASI A.Ş.',
    'GARANTI': 'T. GARANTİ BANKASI A.Ş.',
    'AKBANK': 'AKBANK T.A.Ş.',
    'YAPI_KREDI': 'YAPI VE KREDİ BANKASI A.Ş.',
    'QNB': 'QNB FİNANSBANK A.Ş.',
    'DENIZBANK': 'DENİZBANK A.Ş.',
    'TEB': 'TÜRK EKONOMİ BANKASI A.Ş.'
  }
  return bankNames[bankName] || bankName
}
