'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Building2,
  Users,
  DollarSign,
  PieChart,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react'
import { StatCardSkeleton, ChartSkeleton, Skeleton } from '@/components/ui/skeleton'
import { ReportFilterModal, reportDefinitions, getReportDefinition } from '@/components/reports/report-filter-modal'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface ReportData {
  projects?: any[]
  academicians?: any[]
  payments?: any[]
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

interface ExcelReportData {
  rows: any[] | { incomes?: any[]; expenses?: any[]; summary?: any[]; details?: any[] }
  summary: any
}

// Kolon tanımlamaları
const columnDefinitions: Record<string, { key: string; label: string }[]> = {
  income_excel: [
    { key: 'month', label: 'Ay' },
    { key: 'year', label: 'Yil' },
    { key: 'project_code', label: 'Proje Kodu' },
    { key: 'is_fsmh', label: 'FSMH Geliri' },
    { key: 'income_type', label: 'Gelir Tipi' },
    { key: 'is_tto', label: 'TTO Geliri' },
    { key: 'amount', label: 'Gelir' },
  ],
  expense_excel: [
    { key: 'month', label: 'Ay' },
    { key: 'year', label: 'Yil' },
    { key: 'project_code', label: 'Proje Kodu' },
    { key: 'expense_type', label: 'Gider Tipi' },
    { key: 'is_tto', label: 'TTO Gideri' },
    { key: 'amount', label: 'Gider' },
  ],
  project_card: [
    { key: 'code', label: 'Proje ID' },
    { key: 'name', label: 'Proje Adi' },
    { key: 'gender', label: 'Cinsiyet' },
    { key: 'title', label: 'Unvan' },
    { key: 'workers', label: 'Proje Calisanlari' },
    { key: 'contract_date', label: 'Sozlesme Tarihi' },
    { key: 'start_date', label: 'Baslangic Tarihi' },
    { key: 'end_date', label: 'Bitis Tarihi' },
    { key: 'extension_date', label: 'Uzatma Tarihi' },
    { key: 'budget', label: 'Proje Bedeli' },
    { key: 'vat', label: 'KDV' },
    { key: 'email', label: 'Mail Adresleri' },
    { key: 'faculty', label: 'Fakulte' },
    { key: 'department', label: 'Bolum' },
    { key: 'university', label: 'Universite' },
    { key: 'detailed_name', label: 'Proje Adi (Detay)' },
  ],
  personnel_excel: [
    { key: 'full_name', label: 'Adi Soyadi' },
    { key: 'tc_no', label: 'T.C. No' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Cep Telefon' },
    { key: 'start_date', label: 'Baslama Tarihi' },
    { key: 'iban', label: 'IBAN Bilgileri' },
  ],
  financial_report: [
    { key: 'income_date', label: 'Gelir Tarihi' },
    { key: 'expense_date', label: 'Gider Tarihi' },
    { key: 'project_code', label: 'Proje Kodu' },
    { key: 'project_name', label: 'Proje Adi' },
    { key: 'gross_amount', label: 'Brut Tutar' },
    { key: 'vat_amount', label: 'KDV' },
    { key: 'net_amount', label: 'Net Tutar' },
    { key: 'collected_amount', label: 'Tahsil Edilen' },
    { key: 'expense_amount', label: 'Gider Tutari' },
    { key: 'description', label: 'Aciklama' },
  ],
  payment_instructions: [
    { key: 'instruction_number', label: 'Talimat No' },
    { key: 'recipient_name', label: 'Alici Adi' },
    { key: 'recipient_iban', label: 'Alici IBAN' },
    { key: 'total_amount', label: 'Tutar' },
    { key: 'project_code', label: 'Proje Kodu' },
    { key: 'project_name', label: 'Proje Adi' },
    { key: 'status', label: 'Durum' },
    { key: 'created_at', label: 'Tarih' },
  ],
  personnel_project: [
    { key: 'personnel_name', label: 'Personel Adi' },
    { key: 'project_code', label: 'Proje Kodu' },
    { key: 'project_name', label: 'Proje Adi' },
    { key: 'role', label: 'Rol' },
    { key: 'total_earnings', label: 'Toplam Kazanc' },
    { key: 'allocation_count', label: 'Dagitim Sayisi' },
    { key: 'project_status', label: 'Proje Durumu' },
  ],
}

// Rapor turleri
type ReportType =
  | '' | 'project' | 'company'
  | 'income_excel' | 'expense_excel' | 'project_card' | 'personnel_excel'
  | 'payment_instructions' | 'financial_report' | 'personnel_project'

interface FilterOptions {
  project_id?: string
  person_id?: string
  person_ids?: string[]
  person_type?: 'all' | 'user' | 'personnel'
  is_fsmh?: 'all' | 'yes' | 'no'
  is_tto?: 'all' | 'yes' | 'no'
  income_type?: 'all' | 'kamu' | 'ozel'
  expense_type?: 'all' | 'genel' | 'proje'
  collection_status?: 'all' | 'collected' | 'partial' | 'pending'
  payment_status?: 'all' | 'pending' | 'completed' | 'rejected'
  project_status?: 'all' | 'active' | 'completed' | 'cancelled'
  amount_min?: number
  amount_max?: number
}

interface ProjectOption {
  id: string
  code: string
  name: string
}

interface PersonOption {
  id: string
  full_name: string
  type: 'user' | 'personnel'
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [excelReportData, setExcelReportData] = useState<ExcelReportData | null>(null)
  const [reportType, setReportType] = useState<ReportType>('')
  const [exporting, setExporting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingReportType, setPendingReportType] = useState<ReportType | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses' | 'summary' | 'details'>('incomes')
  const pageSize = 20
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  })

  // Yeni filtre state'leri
  const [filters, setFilters] = useState<FilterOptions>({
    person_type: 'all',
    is_fsmh: 'all',
    is_tto: 'all',
    income_type: 'all',
    expense_type: 'all',
    collection_status: 'all',
    payment_status: 'all',
    project_status: 'all'
  })

  // Dropdown verileri
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({
    income_excel: columnDefinitions.income_excel.map(c => c.key),
    expense_excel: columnDefinitions.expense_excel.map(c => c.key),
    project_card: columnDefinitions.project_card.map(c => c.key),
    personnel_excel: columnDefinitions.personnel_excel.map(c => c.key),
    financial_report: columnDefinitions.financial_report.map(c => c.key),
    payment_instructions: columnDefinitions.payment_instructions.map(c => c.key),
    personnel_project: columnDefinitions.personnel_project.map(c => c.key),
  })
  const router = useRouter()

  // Proje ve kisi listelerini yukle
  const loadFilterOptions = async (token: string) => {
    setLoadingOptions(true)
    try {
      // Projeleri yukle
      const projectsRes = await fetch('/api/projects?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const projectsData = await projectsRes.json()
      if (projectsData.success) {
        setProjects(projectsData.data.projects.map((p: any) => ({
          id: p.id,
          code: p.code,
          name: p.name
        })))
      }

      // Personelleri yukle
      const personnelRes = await fetch('/api/personnel?limit=10000', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const personnelData = await personnelRes.json()
      if (personnelData.success && personnelData.data.personnel) {
        const allPeople: PersonOption[] = personnelData.data.personnel.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          type: 'personnel' as const
        }))
        setPeople(allPeople.sort((a, b) => a.full_name.localeCompare(b.full_name)))
      }
    } catch (err) {
      console.error('Failed to load filter options:', err)
    } finally {
      setLoadingOptions(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Only admin and finance officers can access reports
      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }

      // Filtre seceneklerini yukle
      loadFilterOptions(token)

      // Generate initial company report
      generateReport(token, 'company', {})
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const generateReport = async (token: string, type: string, parameters: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          parameters
        })
      })

      const data = await response.json()

      if (data.success) {
        setReportData(data.data.report.data)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setLoading(false)
    }
  }

  // Excel export rapor turleri
  const excelReportTypes = [
    'income_excel', 'expense_excel', 'project_card', 'personnel_excel',
    'payment_instructions', 'financial_report', 'personnel_project'
  ]

  const handleGenerateReport = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    // Excel export raporlari icin onizleme
    if (excelReportTypes.includes(reportType)) {
      await generateExcelPreview(token)
      return
    }

    const parameters: any = {}
    if (dateRange.start_date) parameters.start_date = dateRange.start_date
    if (dateRange.end_date) parameters.end_date = dateRange.end_date
    // Filtreleri ekle
    Object.assign(parameters, filters)

    generateReport(token, reportType, parameters)
  }

  // Modal'dan rapor olusturma
  const handleModalGenerate = async (
    selectedReportType: ReportType,
    modalFilters: FilterOptions,
    modalDateRange: { start_date: string; end_date: string }
  ) => {
    const token = localStorage.getItem('token')
    if (!token) return

    // State'leri guncelle
    setReportType(selectedReportType)
    setFilters(modalFilters)
    setDateRange(modalDateRange)
    setExcelReportData(null)
    setReportData(null)
    setCurrentPage(1)
    setIsModalOpen(false)

    // Excel export raporlari icin onizleme
    if (excelReportTypes.includes(selectedReportType)) {
      await generateExcelPreviewWithParams(token, selectedReportType, modalFilters, modalDateRange)
      return
    }

    const parameters: any = {}
    if (modalDateRange.start_date) parameters.start_date = modalDateRange.start_date
    if (modalDateRange.end_date) parameters.end_date = modalDateRange.end_date
    Object.assign(parameters, modalFilters)

    generateReport(token, selectedReportType, parameters)
  }

  // Modal icin parametreli Excel preview
  const generateExcelPreviewWithParams = async (
    token: string,
    type: ReportType,
    paramFilters: FilterOptions,
    paramDateRange: { start_date: string; end_date: string }
  ) => {
    setLoading(true)
    setExcelReportData(null)
    setCurrentPage(1)

    try {
      let endpoint = ''
      let bodyData: any = {
        start_date: paramDateRange.start_date || undefined,
        end_date: paramDateRange.end_date || undefined,
        format: 'json',
        project_id: paramFilters.project_id || undefined,
        person_id: paramFilters.person_ids?.[0] || paramFilters.person_id || undefined,
        person_ids: paramFilters.person_ids?.length ? paramFilters.person_ids : undefined,
        person_type: 'personnel',
        is_fsmh: paramFilters.is_fsmh !== 'all' ? paramFilters.is_fsmh : undefined,
        is_tto: paramFilters.is_tto !== 'all' ? paramFilters.is_tto : undefined,
        income_type: paramFilters.income_type !== 'all' ? paramFilters.income_type : undefined,
        expense_type: paramFilters.expense_type !== 'all' ? paramFilters.expense_type : undefined,
        collection_status: paramFilters.collection_status !== 'all' ? paramFilters.collection_status : undefined,
        payment_status: paramFilters.payment_status !== 'all' ? paramFilters.payment_status : undefined,
        project_status: paramFilters.project_status !== 'all' ? paramFilters.project_status : undefined,
        amount_min: paramFilters.amount_min || undefined,
        amount_max: paramFilters.amount_max || undefined,
      }

      switch (type) {
        case 'income_excel': endpoint = '/api/reports/export/income'; break
        case 'expense_excel': endpoint = '/api/reports/export/expense'; break
        case 'project_card': endpoint = '/api/reports/export/project-card'; break
        case 'personnel_excel': endpoint = '/api/reports/export/personnel'; break
        case 'payment_instructions': endpoint = '/api/reports/export/payment-instructions'; break
        case 'financial_report': endpoint = '/api/reports/export/financial-report'; setActiveTab('incomes'); break
        case 'personnel_project':
          endpoint = '/api/reports/export/personnel-project'
          bodyData = {
            format: 'json',
            filters: {
              person_ids: paramFilters.person_ids?.length ? paramFilters.person_ids : undefined,
              date_range: {
                start_date: paramDateRange.start_date || undefined,
                end_date: paramDateRange.end_date || undefined
              }
            }
          }
          break
        default: return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (data.success) {
        setExcelReportData(data.data)
      } else {
        throw new Error(data.error?.message || 'Rapor yüklenemedi')
      }
    } catch (error) {
      console.error('Preview error:', error)
      alert('Rapor önizleme hatası: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const generateExcelPreview = async (token: string) => {
    setLoading(true)
    setExcelReportData(null)
    setCurrentPage(1)

    try {
      let endpoint = ''
      let bodyData: any = {
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
        format: 'json',
        // Filtreleri ekle
        ...filters,
        // undefined olanlari kaldir
        project_id: filters.project_id || undefined,
        person_id: filters.person_ids?.[0] || filters.person_id || undefined,
        person_ids: filters.person_ids?.length ? filters.person_ids : undefined,
        person_type: 'personnel',
        is_fsmh: filters.is_fsmh !== 'all' ? filters.is_fsmh : undefined,
        is_tto: filters.is_tto !== 'all' ? filters.is_tto : undefined,
        income_type: filters.income_type !== 'all' ? filters.income_type : undefined,
        expense_type: filters.expense_type !== 'all' ? filters.expense_type : undefined,
        collection_status: filters.collection_status !== 'all' ? filters.collection_status : undefined,
        payment_status: filters.payment_status !== 'all' ? filters.payment_status : undefined,
        project_status: filters.project_status !== 'all' ? filters.project_status : undefined,
        amount_min: filters.amount_min || undefined,
        amount_max: filters.amount_max || undefined,
      }

      switch (reportType) {
        case 'income_excel':
          endpoint = '/api/reports/export/income'
          break
        case 'expense_excel':
          endpoint = '/api/reports/export/expense'
          break
        case 'project_card':
          endpoint = '/api/reports/export/project-card'
          break
        case 'personnel_excel':
          endpoint = '/api/reports/export/personnel'
          break
        case 'payment_instructions':
          endpoint = '/api/reports/export/payment-instructions'
          break
        case 'financial_report':
          endpoint = '/api/reports/export/financial-report'
          setActiveTab('incomes')
          break
        case 'personnel_project':
          endpoint = '/api/reports/export/personnel-project'
          bodyData = {
            format: 'json',
            filters: {
              person_ids: filters.person_ids?.length ? filters.person_ids : undefined,
              date_range: {
                start_date: dateRange.start_date || undefined,
                end_date: dateRange.end_date || undefined
              }
            }
          }
          break
        default:
          return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (data.success) {
        setExcelReportData(data.data)
      } else {
        throw new Error(data.error?.message || 'Rapor yüklenemedi')
      }
    } catch (error) {
      console.error('Preview error:', error)
      alert('Rapor önizleme hatası: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handleExcelExport = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExporting(true)
    try {
      let endpoint = ''
      let filename = ''
      let bodyData: any = {
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
        columns: selectedColumns[reportType] || []
      }

      switch (reportType) {
        case 'income_excel':
          endpoint = '/api/reports/export/income'
          filename = 'proje_bazli_gelir'
          break
        case 'expense_excel':
          endpoint = '/api/reports/export/expense'
          filename = 'proje_bazli_gider'
          break
        case 'project_card':
          endpoint = '/api/reports/export/project-card'
          filename = 'proje_kunyesi'
          break
        case 'personnel_excel':
          endpoint = '/api/reports/export/personnel'
          filename = 'personel_listesi'
          break
        case 'payment_instructions':
          endpoint = '/api/reports/export/payment-instructions'
          filename = 'odeme_talimati_halkbank'
          // Get banking settings from localStorage (saved as "systemSettings" by settings page)
          const settingsStr = localStorage.getItem('systemSettings')
          if (settingsStr) {
            try {
              const settings = JSON.parse(settingsStr)
              if (!settings.banking?.company_iban || !settings.company?.tax_number) {
                alert('Lütfen önce Ayarlar sayfasından şirket IBAN ve VKN bilgilerini girin.')
                setExporting(false)
                return
              }
              bodyData = {
                start_date: dateRange.start_date || undefined,
                end_date: dateRange.end_date || undefined,
                banking: {
                  company_iban: settings.banking.company_iban,
                  bank_name: settings.banking.bank_name || 'HALKBANK',
                  company_vkn: settings.company.tax_number,
                  company_name: settings.company.name || 'ŞİRKET'
                }
              }
            } catch (e) {
              alert('Ayarlar okunamadı. Lütfen Ayarlar sayfasından banka bilgilerini kontrol edin.')
              setExporting(false)
              return
            }
          } else {
            alert('Lütfen önce Ayarlar sayfasından şirket ve banka bilgilerini girin.')
            setExporting(false)
            return
          }
          break
        case 'financial_report':
          endpoint = '/api/reports/export/financial-report'
          filename = 'finansal_rapor'
          bodyData = {
            start_date: dateRange.start_date || undefined,
            end_date: dateRange.end_date || undefined
          }
          break
        case 'personnel_project':
          endpoint = '/api/reports/export/personnel-project'
          filename = 'personel_proje_raporu'
          bodyData = {
            columns: selectedColumns[reportType] || [],
            filters: {
              person_ids: filters.person_ids?.length ? filters.person_ids : undefined,
              date_range: {
                start_date: dateRange.start_date || undefined,
                end_date: dateRange.end_date || undefined
              }
            }
          }
          break
        default:
          return
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Excel dosyası oluşturulurken bir hata oluştu: ' + (error as any).message)
    } finally {
      setExporting(false)
    }
  }

  if (!user) {
    return (
      <DashboardLayout user={{ id: '', full_name: 'Yükleniyor...', email: '', role: 'admin' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>

          {/* Report Controls Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Report Data Skeleton */}
          <div className="space-y-6">
            <StatCardSkeleton count={4} />
            <ChartSkeleton height="h-96" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!['admin', 'manager'].includes(user.role)) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Erişim Yetkisi Yok</h3>
          <p className="text-slate-600">Bu sayfaya sadece yöneticiler erişebilir.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Raporlar</h1>
            <p className="text-sm text-slate-600">Detaylı finansal raporları görüntüleyin ve indirin</p>
          </div>
        </div>

        {/* Report Controls */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Rapor Oluştur</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rapor Türü
              </label>
              <div className="flex gap-2">
                <select
                  value={reportType}
                  onChange={(e) => {
                    const newType = e.target.value as ReportType
                    if (newType) {
                      setPendingReportType(newType)
                      setIsModalOpen(true)
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                >
                  <option value="">-- Rapor Seçin --</option>
                  <optgroup label="Gelir Raporlari">
                    <option value="income_excel">Proje Bazli Gelir Tablosu</option>
                    <option value="financial_report">Finansal Rapor</option>
                    <option value="company">Sirket Ozet Raporu</option>
                  </optgroup>
                  <optgroup label="Gider Raporlari">
                    <option value="expense_excel">Proje Bazli Gider Tablosu</option>
                  </optgroup>
                  <optgroup label="Odeme Raporlari">
                    <option value="payment_instructions">Odeme Talimati</option>
                  </optgroup>
                  <optgroup label="Personel Raporlari">
                    <option value="personnel_excel">Personel Listesi</option>
                    <option value="personnel_project">Personel Bazli Proje Raporu</option>
                  </optgroup>
                  <optgroup label="Proje Raporlari">
                    <option value="project_card">Proje Kunyesi</option>
                    <option value="project">Proje Ozet Raporu</option>
                  </optgroup>
                </select>
                {reportType && (
                  <button
                    onClick={() => {
                      setPendingReportType(reportType)
                      setIsModalOpen(true)
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors flex items-center gap-2"
                    title="Filtreleri Düzenle"
                  >
                    <Filter className="w-4 h-4" />
                    Filtrele
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kolon Secimi - Tum Excel raporlari icin */}
          {['income_excel', 'expense_excel', 'project_card', 'personnel_excel', 'financial_report', 'payment_instructions', 'personnel_project'].includes(reportType) && columnDefinitions[reportType]?.length > 0 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Dahil Edilecek Kolonlar</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {columnDefinitions[reportType]?.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedColumns[reportType]?.includes(col.key)}
                      onChange={(e) => {
                        setSelectedColumns(prev => ({
                          ...prev,
                          [reportType]: e.target.checked
                            ? [...(prev[reportType] || []), col.key]
                            : (prev[reportType] || []).filter(k => k !== col.key)
                        }))
                      }}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              {reportType === 'payment_instructions' && (
                <p className="mt-3 text-xs text-blue-700">
                  Not: Halkbank formati icin sirket IBAN ve VKN bilgileri Ayarlar sayfasindan alinir.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Excel Report Preview */}
        {excelReportData && ['income_excel', 'expense_excel', 'project_card', 'personnel_excel', 'payment_instructions', 'financial_report', 'personnel_project'].includes(reportType) && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {reportType === 'income_excel' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Kayıt Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Brüt</p>
                    <p className="text-lg font-bold text-emerald-600">₺{(excelReportData.summary.totalAmount || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam KDV</p>
                    <p className="text-lg font-bold text-slate-900">₺{(excelReportData.summary.totalVat || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Net</p>
                    <p className="text-lg font-bold text-teal-600">₺{(excelReportData.summary.totalNet || 0).toLocaleString('tr-TR')}</p>
                  </div>
                </>
              )}
              {reportType === 'expense_excel' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Kayıt Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Gider</p>
                    <p className="text-lg font-bold text-red-600">₺{(excelReportData.summary.totalAmount || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Ortalama Gider</p>
                    <p className="text-lg font-bold text-slate-900">₺{(excelReportData.summary.avgAmount || 0).toLocaleString('tr-TR')}</p>
                  </div>
                </>
              )}
              {reportType === 'project_card' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Proje Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalProjects}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Personel Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalPersonnel}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Bütçe</p>
                    <p className="text-lg font-bold text-teal-600">₺{(excelReportData.summary.totalBudget || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam KDV</p>
                    <p className="text-lg font-bold text-slate-900">₺{(excelReportData.summary.totalVat || 0).toLocaleString('tr-TR')}</p>
                  </div>
                </>
              )}
              {reportType === 'personnel_excel' && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase mb-1">Personel Sayısı</p>
                  <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalCount}</p>
                </div>
              )}
              {reportType === 'payment_instructions' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Ödeme Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalCount}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Tutar</p>
                    <p className="text-lg font-bold text-teal-600">₺{(excelReportData.summary.totalAmount || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Bekleyen</p>
                    <p className="text-lg font-bold text-amber-600">{excelReportData.summary.statusCounts?.pending || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Tamamlanan</p>
                    <p className="text-lg font-bold text-emerald-600">{excelReportData.summary.statusCounts?.completed || 0}</p>
                  </div>
                </>
              )}
              {reportType === 'financial_report' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Gelir</p>
                    <p className="text-lg font-bold text-emerald-600">₺{(excelReportData.summary.totalGross || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Gider</p>
                    <p className="text-lg font-bold text-red-600">₺{(excelReportData.summary.totalExpense || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Net Kar/Zarar</p>
                    <p className={`text-lg font-bold ${(excelReportData.summary.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₺{(excelReportData.summary.netProfit || 0).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Tahsil Oranı</p>
                    <p className="text-lg font-bold text-teal-600">%{(excelReportData.summary.collectionRate || 0).toFixed(1)}</p>
                  </div>
                </>
              )}
              {reportType === 'personnel_project' && (
                <>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Personel Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalPersonnel || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Proje Sayısı</p>
                    <p className="text-lg font-bold text-slate-900">{excelReportData.summary.totalProjects || 0}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Toplam Kazanç</p>
                    <p className="text-lg font-bold text-emerald-600">₺{(excelReportData.summary.totalEarnings || 0).toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-600 uppercase mb-1">Kişi Başı Ortalama</p>
                    <p className="text-lg font-bold text-teal-600">₺{(excelReportData.summary.avgEarningsPerPersonnel || 0).toLocaleString('tr-TR')}</p>
                  </div>
                </>
              )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {reportType === 'income_excel' && 'Gelir Tablosu'}
                  {reportType === 'expense_excel' && 'Gider Tablosu'}
                  {reportType === 'project_card' && 'Proje Künyesi'}
                  {reportType === 'personnel_excel' && 'Personel Listesi'}
                  {reportType === 'payment_instructions' && 'Ödeme Talimatları'}
                  {reportType === 'financial_report' && 'Finansal Rapor'}
                  {reportType === 'personnel_project' && 'Personel Bazlı Proje Raporu'}
                </h2>
                <button
                  onClick={handleExcelExport}
                  disabled={exporting}
                  className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  {exporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? 'İndiriliyor...' : 'Excel İndir'}
                </button>
              </div>

              {/* Tabs for financial_report */}
              {reportType === 'financial_report' && (
                <div className="border-b border-slate-200">
                  <nav className="flex -mb-px">
                    {reportType === 'financial_report' && (
                      <>
                        <button
                          onClick={() => { setActiveTab('incomes'); setCurrentPage(1) }}
                          className={`px-4 py-3 text-sm font-medium ${activeTab === 'incomes' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Gelirler ({(excelReportData.rows as any).incomes?.length || 0})
                        </button>
                        <button
                          onClick={() => { setActiveTab('expenses'); setCurrentPage(1) }}
                          className={`px-4 py-3 text-sm font-medium ${activeTab === 'expenses' ? 'border-b-2 border-teal-500 text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Giderler ({(excelReportData.rows as any).expenses?.length || 0})
                        </button>
                      </>
                    )}
                  </nav>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {/* Dynamic headers based on report type */}
                      {reportType === 'income_excel' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tip</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Brüt</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">KDV</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                        </>
                      )}
                      {reportType === 'expense_excel' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Açıklama</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">TTO</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tutar</th>
                        </>
                      )}
                      {reportType === 'project_card' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Kod</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje Adı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Personel</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Bütçe</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Durum</th>
                        </>
                      )}
                      {reportType === 'personnel_excel' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ad Soyad</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Telefon</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">IBAN</th>
                        </>
                      )}
                      {reportType === 'payment_instructions' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Alıcı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tutar</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Durum</th>
                        </>
                      )}
                      {reportType === 'financial_report' && activeTab === 'incomes' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Brüt</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tahsilat</th>
                        </>
                      )}
                      {reportType === 'financial_report' && activeTab === 'expenses' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Açıklama</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Tutar</th>
                        </>
                      )}
                      {reportType === 'personnel_project' && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Personel</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje Kodu</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje Adı</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rol</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Kazanç</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Dağıtım Sayısı</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Durum</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {(() => {
                      let rows: any[] = []
                      if (reportType === 'financial_report') {
                        rows = activeTab === 'incomes' ? (excelReportData.rows as any).incomes || [] : (excelReportData.rows as any).expenses || []
                      } else {
                        rows = excelReportData.rows as any[]
                      }

                      const startIdx = (currentPage - 1) * pageSize
                      const paginatedRows = rows.slice(startIdx, startIdx + pageSize)

                      return paginatedRows.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {reportType === 'income_excel' && (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.income_date ? new Date(row.income_date).toLocaleDateString('tr-TR') : '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.project_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.income_type}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 text-right">₺{(row.gross_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-right">₺{(row.vat_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right">₺{(row.net_amount || 0).toLocaleString('tr-TR')}</td>
                            </>
                          )}
                          {reportType === 'expense_excel' && (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.expense_date ? new Date(row.expense_date).toLocaleDateString('tr-TR') : '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.project_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.description}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.is_tto}</td>
                              <td className="px-4 py-3 text-sm text-red-600 font-medium text-right">₺{(row.amount || 0).toLocaleString('tr-TR')}</td>
                            </>
                          )}
                          {reportType === 'project_card' && (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.code}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.person_name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-teal-600 font-medium text-right">₺{(row.budget || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : row.status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {row.status === 'active' ? 'Aktif' : row.status === 'completed' ? 'Tamamlandı' : row.status}
                                </span>
                              </td>
                            </>
                          )}
                          {reportType === 'personnel_excel' && (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.full_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.email}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.phone || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 font-mono text-xs">{row.iban || '-'}</td>
                            </>
                          )}
                          {reportType === 'payment_instructions' && (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.instruction_number || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.recipient_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.project_code || '-'}</td>
                              <td className="px-4 py-3 text-sm text-teal-600 font-medium text-right">₺{(row.total_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : row.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {row.status === 'completed' ? 'Tamamlandı' : row.status === 'pending' ? 'Bekliyor' : 'İptal'}
                                </span>
                              </td>
                            </>
                          )}
                          {reportType === 'financial_report' && activeTab === 'incomes' && (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.income_date ? new Date(row.income_date).toLocaleDateString('tr-TR') : '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.project_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 text-right">₺{(row.gross_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 text-right">₺{(row.net_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-teal-600 text-right">₺{(row.collected_amount || 0).toLocaleString('tr-TR')}</td>
                            </>
                          )}
                          {reportType === 'financial_report' && activeTab === 'expenses' && (
                            <>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.expense_date ? new Date(row.expense_date).toLocaleDateString('tr-TR') : '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.project_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.description}</td>
                              <td className="px-4 py-3 text-sm text-red-600 font-medium text-right">₺{(row.amount || 0).toLocaleString('tr-TR')}</td>
                            </>
                          )}
                          {reportType === 'personnel_project' && (
                            <>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.personnel_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{row.project_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.project_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{row.role === 'project_leader' || row.role === 'manager' ? 'Proje Yürütücüsü' : row.role === 'researcher' ? 'Araştırmacı' : row.role === 'consultant' ? 'Danışman' : row.role}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right">₺{(row.total_earnings || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-center">{row.allocation_count || 0}</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${row.project_status === 'active' ? 'bg-emerald-100 text-emerald-700' : row.project_status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {row.project_status === 'active' ? 'Aktif' : row.project_status === 'completed' ? 'Tamamlandı' : 'İptal'}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(() => {
                let rows: any[] = []
                if (reportType === 'financial_report') {
                  rows = activeTab === 'incomes' ? (excelReportData.rows as any).incomes || [] : (excelReportData.rows as any).expenses || []
                } else {
                  rows = excelReportData.rows as any[]
                }

                const totalPages = Math.ceil(rows.length / pageSize)

                if (totalPages <= 1) return null

                return (
                  <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      {rows.length} kayıttan {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, rows.length)} arası gösteriliyor
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Önceki
                      </button>
                      <span className="text-sm text-slate-600">
                        Sayfa {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sonraki
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Report Results */}
        {reportData && !['income_excel', 'expense_excel', 'project_card', 'personnel_excel', 'payment_instructions', 'financial_report', 'personnel_project'].includes(reportType) && (
          <>
            {/* Summary Cards */}
            {reportData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportType === 'company' && (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Brüt Gelir</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.totalGrossIncome || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Komisyon</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.totalCommissions || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Dağıtılan</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.totalDistributed || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Net Şirket</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.netCompanyIncome || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </>
                )}

                {reportType === 'project' && (
                  <>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Proje Sayısı</p>
                      <p className="text-lg font-bold text-slate-900">
                        {reportData.summary.totalProjects || 0}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Toplam Bütçe</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.totalBudget || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                      <p className="text-xs text-slate-600 uppercase mb-1">Toplam Gelir</p>
                      <p className="text-lg font-bold text-slate-900">
                        ₺{(reportData.summary.totalIncome || 0).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </>
                )}

              </div>
            )}

            {/* Detailed Data */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {reportType === 'company' && 'Şirket Detay Raporu'}
                    {reportType === 'project' && 'Proje Detay Raporu'}
                  </h2>
                  <button
                    className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token')
                        if (!token) {
                          alert('Oturum süresi dolmuş, lütfen tekrar giriş yapın.')
                          return
                        }

                        const response = await fetch('/api/reports/export', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            data: reportData,
                            reportType,
                            dateRange
                          })
                        })

                        if (!response.ok) {
                          throw new Error('Excel export failed')
                        }

                        // Get the filename from the response headers
                        const contentDisposition = response.headers.get('content-disposition')
                        let filename = 'rapor.xlsx'
                        if (contentDisposition) {
                          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
                          if (filenameMatch) {
                            filename = filenameMatch[1]
                          }
                        }

                        // Create blob and download
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const anchor = document.createElement('a')
                        anchor.href = url
                        anchor.download = filename
                        document.body.appendChild(anchor)
                        anchor.click()
                        document.body.removeChild(anchor)
                        window.URL.revokeObjectURL(url)
                      } catch (error) {
                        console.error('Excel export failed:', error)
                        alert('Excel indirme başarısız: ' + (error as any).message)
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel İndir
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-2" />
                    <p className="text-slate-600">Rapor oluşturuluyor...</p>
                  </div>
                ) : (
                  <>
                    {/* Company Report Table */}
                    {reportType === 'company' && (reportData as any).incomes && (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarih</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Açıklama</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Brüt Tutar</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Net Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {(reportData as any).incomes.map((income: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {income.income_date ? new Date(income.income_date).toLocaleDateString('tr-TR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{income.project?.name || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{income.description || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 text-right">₺{(income.gross_amount || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 font-medium text-right">₺{(income.net_amount || 0).toLocaleString('tr-TR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {/* Project Report Table */}
                    {reportType === 'project' && reportData.projects && (
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje Kodu</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Proje Adı</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Bütçe</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Başlangıç</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Bitiş</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {reportData.projects.map((project: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{project.code}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{project.name}</td>
                              <td className="px-4 py-3 text-sm text-teal-600 font-medium text-right">₺{(project.budget || 0).toLocaleString('tr-TR')}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {project.start_date ? new Date(project.start_date).toLocaleDateString('tr-TR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {project.end_date ? new Date(project.end_date).toLocaleDateString('tr-TR') : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                  project.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {project.status === 'active' ? 'Aktif' :
                                   project.status === 'completed' ? 'Tamamlandı' :
                                   project.status === 'cancelled' ? 'İptal' : project.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-teal-600 mr-2" />
                  <p className="text-sm text-slate-600">
                    Rapor {new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!reportData && !excelReportData && !loading && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Rapor Seçin</h3>
            <p className="text-slate-600">Yukarıdaki kontrolleri kullanarak rapor oluşturun</p>
          </div>
        )}
      </div>

      {/* Rapor Filtre Modal */}
      {pendingReportType && (
        <ReportFilterModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setPendingReportType(null)
          }}
          onGenerate={handleModalGenerate}
          reportType={pendingReportType}
          projects={projects}
          people={people}
          loading={loading}
        />
      )}
    </DashboardLayout>
  )
}
