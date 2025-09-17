import ExcelJS from 'exceljs'

interface ReportData {
  projects?: any[]
  academicians?: any[]
  payments?: any[]
  incomes?: any[]
  paymentInstructions?: any[]
  summary?: {
    totalGrossIncome?: number
    totalCommissions?: number
    totalDistributed?: number
    totalPayments?: number
    netCompanyIncome?: number
    pendingPayments?: number
    completedPayments?: number
    totalProjects?: number
    totalBudget?: number
    totalIncome?: number
    totalAcademicians?: number
    totalBalance?: number
    totalEarnings?: number
    totalAmount?: number
    statusBreakdown?: Record<string, number>
    avgPaymentAmount?: number
  }
}

const formatCurrency = (amount: number | null | undefined): string => {
  return `₺${(amount || 0).toLocaleString('tr-TR')}`
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('tr-TR')
}

export const exportToExcel = async (
  data: ReportData,
  reportType: 'company' | 'project' | 'academician' | 'payments',
  dateRange?: { start_date?: string; end_date?: string }
) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazılımı'
  workbook.created = new Date()

  // Main worksheet
  const worksheet = workbook.addWorksheet('Rapor')

  // Header styling
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } },
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
    }
  }

  // Title
  let reportTitle = ''
  switch (reportType) {
    case 'company':
      reportTitle = 'Şirket Finansal Raporu'
      break
    case 'project':
      reportTitle = 'Proje Detay Raporu'
      break
    case 'academician':
      reportTitle = 'Akademisyen Raporu'
      break
    case 'payments':
      reportTitle = 'Ödeme Raporu'
      break
  }

  worksheet.mergeCells('A1:E1')
  const titleCell = worksheet.getCell('A1')
  titleCell.value = reportTitle
  titleCell.font = { bold: true, size: 16 }
  titleCell.alignment = { horizontal: 'center' }

  // Date range
  if (dateRange?.start_date || dateRange?.end_date) {
    worksheet.mergeCells('A2:E2')
    const dateCell = worksheet.getCell('A2')
    let dateText = 'Tarih Aralığı: '
    if (dateRange.start_date) dateText += formatDate(dateRange.start_date)
    if (dateRange.start_date && dateRange.end_date) dateText += ' - '
    if (dateRange.end_date) dateText += formatDate(dateRange.end_date)
    dateCell.value = dateText
    dateCell.alignment = { horizontal: 'center' }
  }

  let currentRow = dateRange?.start_date || dateRange?.end_date ? 4 : 3

  // Summary section
  if (data.summary) {
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
    const summaryTitleCell = worksheet.getCell(`A${currentRow}`)
    summaryTitleCell.value = 'ÖZET'
    summaryTitleCell.font = { bold: true, size: 14 }
    summaryTitleCell.alignment = { horizontal: 'center' }
    currentRow += 2

    if (reportType === 'company') {
      const summaryData = [
        ['Brüt Gelir', formatCurrency(data.summary.totalGrossIncome)],
        ['Komisyon', formatCurrency(data.summary.totalCommissions)],
        ['Dağıtılan', formatCurrency(data.summary.totalDistributed)],
        ['Net Şirket Geliri', formatCurrency(data.summary.netCompanyIncome)]
      ]

      summaryData.forEach(([label, value], index) => {
        const row = currentRow + index
        worksheet.getCell(`A${row}`).value = label
        worksheet.getCell(`B${row}`).value = value
        worksheet.getCell(`A${row}`).font = { bold: true }
      })
      currentRow += summaryData.length + 2
    }

    if (reportType === 'project') {
      const summaryData = [
        ['Toplam Proje', data.summary.totalProjects || 0],
        ['Toplam Bütçe', formatCurrency(data.summary.totalBudget)],
        ['Toplam Gelir', formatCurrency(data.summary.totalIncome)]
      ]

      summaryData.forEach(([label, value], index) => {
        const row = currentRow + index
        worksheet.getCell(`A${row}`).value = label
        worksheet.getCell(`B${row}`).value = value
        worksheet.getCell(`A${row}`).font = { bold: true }
      })
      currentRow += summaryData.length + 2
    }

    if (reportType === 'payments') {
      const summaryData = [
        ['Toplam Ödeme', data.summary.totalPayments || 0],
        ['Toplam Tutar', formatCurrency(data.summary.totalAmount)],
        ['Ortalama Ödeme', formatCurrency(data.summary.avgPaymentAmount)]
      ]

      summaryData.forEach(([label, value], index) => {
        const row = currentRow + index
        worksheet.getCell(`A${row}`).value = label
        worksheet.getCell(`B${row}`).value = value
        worksheet.getCell(`A${row}`).font = { bold: true }
      })
      currentRow += summaryData.length + 2
    }
  }

  // Detailed data sections
  if (reportType === 'company' && data.incomes && data.incomes.length > 0) {
    // Incomes section
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
    const incomesTitleCell = worksheet.getCell(`A${currentRow}`)
    incomesTitleCell.value = 'GELİR KAYITLARI'
    incomesTitleCell.font = { bold: true, size: 14 }
    incomesTitleCell.alignment = { horizontal: 'center' }
    currentRow += 2

    // Headers
    const incomeHeaders = ['Proje Adı', 'Açıklama', 'Brüt Tutar', 'Net Tutar', 'KDV', 'Tarih']
    incomeHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`)
      cell.value = header
      cell.style = headerStyle
    })
    currentRow++

    // Data
    data.incomes.forEach((income, index) => {
      const row = currentRow + index
      worksheet.getCell(`A${row}`).value = income.project?.name || 'Proje Bulunamadı'
      worksheet.getCell(`B${row}`).value = income.description || ''
      worksheet.getCell(`C${row}`).value = formatCurrency(income.gross_amount)
      worksheet.getCell(`D${row}`).value = formatCurrency(income.net_amount)
      worksheet.getCell(`E${row}`).value = formatCurrency(income.vat_amount)
      worksheet.getCell(`F${row}`).value = formatDate(income.income_date)

      // Apply border style
      for (let col = 0; col < 6; col++) {
        worksheet.getCell(`${String.fromCharCode(65 + col)}${row}`).style = dataStyle
      }
    })
    currentRow += data.incomes.length
  }

  if (reportType === 'payments' && data.paymentInstructions && data.paymentInstructions.length > 0) {
    // Payment instructions section
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    const paymentsTitleCell = worksheet.getCell(`A${currentRow}`)
    paymentsTitleCell.value = 'ÖDEME TALİMATLARI'
    paymentsTitleCell.font = { bold: true, size: 14 }
    paymentsTitleCell.alignment = { horizontal: 'center' }
    currentRow += 2

    // Headers
    const paymentHeaders = ['Talimat No', 'Alıcı', 'Tutar', 'Durum', 'Oluşturma', 'Ödeme Tarihi']
    paymentHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`)
      cell.value = header
      cell.style = headerStyle
    })
    currentRow++

    // Data
    data.paymentInstructions.forEach((payment, index) => {
      const row = currentRow + index
      worksheet.getCell(`A${row}`).value = payment.instruction_number || ''
      worksheet.getCell(`B${row}`).value = payment.user?.full_name || ''
      worksheet.getCell(`C${row}`).value = formatCurrency(payment.total_amount)
      worksheet.getCell(`D${row}`).value = payment.status === 'pending' ? 'Bekliyor' :
                                          payment.status === 'completed' ? 'Tamamlandı' :
                                          payment.status === 'cancelled' ? 'İptal' : payment.status
      worksheet.getCell(`E${row}`).value = formatDate(payment.created_at)
      worksheet.getCell(`F${row}`).value = formatDate(payment.payment_date)

      // Apply border style
      for (let col = 0; col < 6; col++) {
        worksheet.getCell(`${String.fromCharCode(65 + col)}${row}`).style = dataStyle
      }
    })
  }

  if (reportType === 'project' && data.projects && data.projects.length > 0) {
    // Projects section
    worksheet.mergeCells(`A${currentRow}:G${currentRow}`)
    const projectsTitleCell = worksheet.getCell(`A${currentRow}`)
    projectsTitleCell.value = 'PROJE DETAYLARI'
    projectsTitleCell.font = { bold: true, size: 14 }
    projectsTitleCell.alignment = { horizontal: 'center' }
    currentRow += 2

    // Headers
    const projectHeaders = ['Kod', 'Ad', 'Bütçe', 'Gelir', 'Kalan', 'Durum', 'Başlangıç']
    projectHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`)
      cell.value = header
      cell.style = headerStyle
    })
    currentRow++

    // Data
    data.projects.forEach((project, index) => {
      const row = currentRow + index
      worksheet.getCell(`A${row}`).value = project.code || ''
      worksheet.getCell(`B${row}`).value = project.name || ''
      worksheet.getCell(`C${row}`).value = formatCurrency(project.budget)
      worksheet.getCell(`D${row}`).value = formatCurrency(project.total_received || 0)
      worksheet.getCell(`E${row}`).value = formatCurrency(project.remaining_budget || 0)
      worksheet.getCell(`F${row}`).value = project.status === 'active' ? 'Aktif' :
                                          project.status === 'completed' ? 'Tamamlandı' :
                                          project.status === 'cancelled' ? 'İptal' : project.status
      worksheet.getCell(`G${row}`).value = formatDate(project.start_date)

      // Apply border style
      for (let col = 0; col < 7; col++) {
        worksheet.getCell(`${String.fromCharCode(65 + col)}${row}`).style = dataStyle
      }
    })
    currentRow += data.projects.length
  }

  if (reportType === 'academician' && data.academicians && data.academicians.length > 0) {
    // Academicians section
    worksheet.mergeCells(`A${currentRow}:F${currentRow}`)
    const academiciansTitleCell = worksheet.getCell(`A${currentRow}`)
    academiciansTitleCell.value = 'AKADEMİSYEN DETAYLARI'
    academiciansTitleCell.font = { bold: true, size: 14 }
    academiciansTitleCell.alignment = { horizontal: 'center' }
    currentRow += 2

    // Headers
    const academicianHeaders = ['Ad Soyad', 'E-posta', 'Telefon', 'IBAN', 'Bakiye', 'Toplam Kazanç']
    academicianHeaders.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${currentRow}`)
      cell.value = header
      cell.style = headerStyle
    })
    currentRow++

    // Data
    data.academicians.forEach((academician, index) => {
      const row = currentRow + index
      const totalEarnings = academician.income_distributions?.reduce((sum: number, d: any) => sum + (d.amount || 0), 0) || 0

      worksheet.getCell(`A${row}`).value = academician.full_name || ''
      worksheet.getCell(`B${row}`).value = academician.email || ''
      worksheet.getCell(`C${row}`).value = academician.phone || ''
      worksheet.getCell(`D${row}`).value = academician.iban || ''
      worksheet.getCell(`E${row}`).value = formatCurrency(academician.balances?.[0]?.available_amount || 0)
      worksheet.getCell(`F${row}`).value = formatCurrency(totalEarnings)

      // Apply border style
      for (let col = 0; col < 6; col++) {
        worksheet.getCell(`${String.fromCharCode(65 + col)}${row}`).style = dataStyle
      }
    })
  }

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10
      if (columnLength > maxLength) {
        maxLength = columnLength
      }
    })
    column.width = maxLength < 10 ? 10 : maxLength + 2
  })

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer()

  // Create download
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url

  const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
  anchor.download = `${reportTitle.toLowerCase().replace(/\s+/g, '_')}_${dateStr}.xlsx`

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  window.URL.revokeObjectURL(url)
}