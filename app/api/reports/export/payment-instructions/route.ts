import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
const ExcelJS = require('exceljs')

interface PaymentInstructionExportRequest {
  start_date?: string
  end_date?: string
  status?: 'pending' | 'completed' | 'rejected'
  format?: 'excel' | 'json'
  banking?: {
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
      const { start_date, end_date, status, format = 'excel', banking } = body

      // Build query for payment instructions
      let query = ctx.supabase
        .from('payment_instructions')
        .select(`
          *,
          user:user_id(id, full_name, email, iban),
          personnel:personnel_id(id, full_name, email, iban)
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

      // JSON format için önizleme verisi döndür
      if (format === 'json') {
        const rows = (payments || []).map((payment: any) => {
          const recipientName = payment.user?.full_name || payment.personnel?.full_name || 'Bilinmiyor'
          const recipientIban = payment.user?.iban || payment.personnel?.iban || ''
          const projectInfo = getProjectInfoFromPayment(payment)

          return {
            id: payment.id,
            instruction_number: payment.instruction_number,
            recipient_name: recipientName,
            recipient_iban: recipientIban,
            total_amount: payment.total_amount,
            status: payment.status,
            created_at: payment.created_at,
            project_code: projectInfo.code,
            project_name: projectInfo.name,
            notes: payment.notes
          }
        })

        const totalAmount = rows.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0)
        const statusCounts = {
          pending: rows.filter((r: any) => r.status === 'pending').length,
          completed: rows.filter((r: any) => r.status === 'completed').length,
          rejected: rows.filter((r: any) => r.status === 'rejected').length
        }

        return apiResponse.success({
          rows,
          summary: {
            totalCount: rows.length,
            totalAmount,
            avgAmount: rows.length > 0 ? totalAmount / rows.length : 0,
            statusCounts
          }
        })
      }

      // Validate banking info for Excel export
      if (!banking?.company_iban || !banking?.company_vkn) {
        return apiResponse.error(
          'Missing banking info',
          'Şirket IBAN ve VKN bilgileri gereklidir. Lütfen ayarlardan banka bilgilerini ekleyin.',
          400
        )
      }

      // Generate Halkbank format Excel (empty template if no payments)
      const buffer = await generateHalkbankExcel(payments || [], banking)

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
  banking: NonNullable<PaymentInstructionExportRequest['banking']>
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazılımı'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('HALKBANK')

  // Set column widths (A is empty, data starts from B)
  worksheet.columns = [
    { width: 5 },  // A - Boş
    { width: 30 }, // B - GÖNDEREN IBAN
    { width: 30 }, // C - ALICI ADI
    { width: 15 }, // D - TUTAR
    { width: 30 }, // E - ALICI IBAN
    { width: 60 }, // F - AÇIKLAMA
  ]

  // Row 1 - Empty (skip)

  // Row 2 - Bank full name (BOLD)
  const bankCell = worksheet.getCell('B2')
  bankCell.value = getBankFullName(banking.bank_name)
  bankCell.font = { bold: true }

  // Row 3 - Company name and payment title (BOLD) - centered in merged cells
  worksheet.mergeCells('C3:F3')
  const companyCell = worksheet.getCell('C3')
  companyCell.value = `${banking.company_name || 'ŞİRKET'} ÖDEME TALİMATI`
  companyCell.font = { bold: true }
  companyCell.alignment = { horizontal: 'center' }

  // Row 4 - Sender VKN (BOLD)
  const vknCell = worksheet.getCell('B4')
  vknCell.value = `GÖNDEREN VKN:${banking.company_vkn}`
  vknCell.font = { bold: true }

  // Row 5 - Empty

  // Row 6 - Column headers (B-F) - BOLD
  const columnHeaders = ['GÖNDEREN IBAN', 'ALICI ADI', 'TUTAR', 'ALICI IBAN', 'AÇIKLAMA']
  columnHeaders.forEach((header, index) => {
    const cell = worksheet.getCell(`${String.fromCharCode(66 + index)}6`)
    cell.value = header
    cell.font = { bold: true }
  })

  // Data rows (starting from row 7)
  let currentRow = 7
  let totalAmount = 0

  if (payments.length === 0) {
    // Empty template - add 10 empty rows with just the sender IBAN
    for (let i = 0; i < 10; i++) {
      worksheet.getCell(`B${currentRow}`).value = banking.company_iban
      currentRow++
    }
  } else {
    for (const payment of payments) {
      const recipientName = payment.user?.full_name || payment.personnel?.full_name || 'Bilinmiyor'
      const recipientIban = payment.user?.iban || payment.personnel?.iban || ''

      // Build description from payment items
      const description = buildPaymentDescription(payment, recipientName)

      worksheet.getCell(`B${currentRow}`).value = banking.company_iban
      worksheet.getCell(`C${currentRow}`).value = recipientName
      // TUTAR with Turkish format + TL
      const amount = payment.total_amount || 0
      worksheet.getCell(`D${currentRow}`).value = formatTurkishCurrency(amount)
      worksheet.getCell(`E${currentRow}`).value = recipientIban
      worksheet.getCell(`F${currentRow}`).value = description

      totalAmount += amount
      currentRow++
    }
  }

  // Empty row before total
  currentRow++

  // Total row (C = "TOPLAM", D = formatted amount) - BOLD
  const toplamLabelCell = worksheet.getCell(`C${currentRow}`)
  toplamLabelCell.value = 'TOPLAM'
  toplamLabelCell.font = { bold: true }

  const toplamValueCell = worksheet.getCell(`D${currentRow}`)
  toplamValueCell.value = formatTurkishCurrency(totalAmount)
  toplamValueCell.font = { bold: true }

  return await workbook.xlsx.writeBuffer()
}

function formatTurkishCurrency(amount: number): string {
  return amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
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

function getProjectInfoFromPayment(payment: any): { code: string; name: string } {
  // Direkt project ilişkisinden al
  if (payment.project) {
    return {
      code: payment.project.code || '',
      name: payment.project.name || ''
    }
  }
  return { code: '', name: '' }
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
