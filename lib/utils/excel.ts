// ExcelJS removed - now using server-side API for Excel generation

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
  throw new Error('Bu fonksiyon artık kullanımdan kaldırıldı. Lütfen raporlar sayfasından Excel indirin.')
}