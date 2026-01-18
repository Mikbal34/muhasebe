'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Building2,
  Wallet,
  CreditCard,
  TrendingUp,
  FolderOpen
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'
import { usePayments, DateRange } from '@/hooks/use-payments'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { turkishIncludes } from '@/lib/utils/string'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PaymentInstruction {
  id: string
  instruction_number: string
  user_id: string
  project_id: string | null
  total_amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  notes: string | null
  created_at: string
  approved_at: string | null
  project: {
    id: string
    code: string
    name: string
  } | null
  user: {
    id: string
    full_name: string
    email: string
    iban: string
  } | null
  personnel: {
    id: string
    full_name: string
    email: string
    iban: string
  } | null
  created_by_user: {
    full_name: string
  }
  items: Array<{
    id: string
    amount: number
    description: string | null
    income_distribution: {
      id: string
      amount: number
      income: {
        id: string
        description: string
        project: {
          id: string
          code: string
          name: string
        }
      }
    } | null
  }>
}

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const router = useRouter()

  const { data: payments = [], isLoading: paymentsLoading } = usePayments(dateRange)

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('token')

      const savedSettings = localStorage.getItem('systemSettings')
      let banking = {
        company_iban: '',
        bank_name: 'HALKBANK',
        company_vkn: '',
        company_name: ''
      }

      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        banking = {
          company_iban: settings.banking?.company_iban || '',
          bank_name: settings.banking?.bank_name || 'HALKBANK',
          company_vkn: settings.company?.tax_number || '',
          company_name: settings.company?.name || ''
        }
      }

      if (!banking.company_iban || !banking.company_vkn) {
        alert('Excel export için şirket IBAN ve VKN bilgileri gereklidir. Lütfen Ayarlar sayfasından banka bilgilerini doldurun.')
        setExporting(false)
        return
      }

      const response = await fetch('/api/reports/export/payment-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          banking
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Export failed')
      }

      const contentDisposition = response.headers.get('content-disposition')
      let filename = `odeme_talimati_halkbank_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Export error:', error)
      alert(error.message || 'Excel dışa aktarma başarısız oldu')
    } finally {
      setExporting(false)
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
      setUser(JSON.parse(userData))
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const projects = Array.from(
    new Set(
      payments
        .filter(payment => payment.project)
        .map(payment => JSON.stringify(payment.project))
    )
  ).map(str => JSON.parse(str)) as Array<{ id: string; code: string; name: string }>

  const filteredPayments = payments.filter(payment => {
    const recipientName = payment.user?.full_name || payment.personnel?.full_name || ''
    const matchesSearch = turkishIncludes(recipientName, searchTerm) ||
                         turkishIncludes(payment.instruction_number, searchTerm) ||
                         turkishIncludes(payment.notes || '', searchTerm)
    const matchesStatus = !statusFilter || payment.status === statusFilter
    const matchesProject = !projectFilter || payment.project?.id === projectFilter
    return matchesSearch && matchesStatus && matchesProject
  })

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-gold/20 text-gold',
          icon: Clock,
          text: 'Bekliyor'
        }
      case 'completed':
        return {
          color: 'bg-navy/10 text-navy',
          icon: CheckCircle,
          text: 'Tamamlandı'
        }
      case 'rejected':
        return {
          color: 'bg-slate-200 text-slate-600',
          icon: XCircle,
          text: 'İptal Edildi'
        }
      default:
        return {
          color: 'bg-slate-100 text-slate-800',
          icon: Clock,
          text: status
        }
    }
  }

  const statusStats = payments.reduce((acc, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.total_amount, 0)
  const completedAmount = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.total_amount, 0)
  const pendingAmount = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.total_amount, 0)

  const paymentsByProject = filteredPayments.reduce((acc, payment) => {
    const project = payment.project
    const projectKey = project?.id || 'no-project'

    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: project || { id: 'no-project', code: '-', name: 'Projesi Belirsiz' },
        payments: [] as PaymentInstruction[],
        totalAmount: 0
      }
    }
    acc[projectKey].payments.push(payment)
    acc[projectKey].totalAmount += payment.total_amount
    return acc
  }, {} as Record<string, { project: { id: string; code: string; name: string }; payments: PaymentInstruction[]; totalAmount: number }>)

  const projectGroups = Object.values(paymentsByProject)

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  if (paymentsLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-44" />
            </div>
          </div>
          <StatCardSkeleton count={4} />
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-48" />
              <Skeleton className="h-11 w-48" />
            </div>
          </div>
          <AccordionGroupSkeleton count={3} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-navy text-4xl font-black tracking-tight">Ödeme Talimatları</h1>
            <p className="text-slate-500 text-base">
              {user.role === 'manager'
                ? 'Ödeme talimatlarınızı görüntüleyin'
                : 'Ödeme talimatlarını görüntüleyin ve yönetin'
              }
            </p>
          </div>

          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="flex items-center gap-2 px-5 h-11 border-2 border-slate-200 rounded-lg text-navy font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {exporting ? 'İndiriliyor...' : 'Dışa Aktar'}
              </button>

              <Link
                href="/dashboard/payments/new"
                className="flex items-center gap-2 px-5 h-11 bg-navy text-white rounded-lg font-bold text-sm hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
              >
                <Plus className="w-5 h-5" />
                Yeni Ödeme Talimatı
              </Link>
            </div>
          )}
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Toplam Tutar */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Toplam Tutar</p>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-navy" />
              </div>
            </div>
            <p className="text-3xl font-black text-navy">
              ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              {filteredPayments.length} talimat
            </p>
          </div>

          {/* Bekleyen */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Bekleyen</p>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gold" />
              </div>
            </div>
            <p className="text-3xl font-black text-gold">
              {statusStats.pending || 0}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              ₺{pendingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Tamamlanan */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Tamamlanan</p>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-navy" />
              </div>
            </div>
            <p className="text-3xl font-black text-navy">
              {statusStats.completed || 0}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              ₺{completedAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* İptal Edilen */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">İptal Edilen</p>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-slate-500" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-500">
              {statusStats.rejected || 0}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              talimat
            </p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[280px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Kişi adı, talimat no veya not ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 h-11 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-navy/20 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="pl-10 pr-8 h-11 bg-slate-50 border-none rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-navy/20 appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Tüm Projeler</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 h-11 bg-slate-50 border-none rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-navy/20 appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="rejected">İptal Edildi</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Date Range */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Count Badge */}
            <div className="bg-navy/10 text-navy px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
              {filteredPayments.length} Talimat Görüntüleniyor
            </div>
          </div>
        </div>

        {/* Project Accordion List */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-navy to-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-black text-navy mb-2">
                {searchTerm || statusFilter || projectFilter ? 'Ödeme talimatı bulunamadı' : 'Henüz ödeme talimatı yok'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm || statusFilter || projectFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk ödeme talimatını oluşturmak için butona tıklayın'
                }
              </p>
              {(user.role === 'admin' || user.role === 'manager') && !searchTerm && !statusFilter && !projectFilter && (
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                >
                  <Plus className="w-5 h-5" />
                  İlk Talimatı Oluştur
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const isExpanded = expandedProjects[group.project.id]

              return (
                <div
                  key={group.project.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'border-2 border-navy shadow-xl shadow-navy/5'
                      : 'border-slate-200 hover:border-navy/30 cursor-pointer'
                  }`}
                >
                  {/* Project Header */}
                  <button
                    onClick={() => toggleProject(group.project.id)}
                    className={`w-full flex items-center justify-between p-5 transition-colors ${
                      isExpanded ? 'bg-navy/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isExpanded
                          ? 'bg-navy text-white'
                          : 'bg-slate-100 text-navy'
                      }`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                            {group.project.name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-100 text-slate-500">
                            {group.project.code}
                          </span>
                        </div>
                        <p className={`text-sm font-medium tracking-tight ${isExpanded ? 'text-navy/70' : 'text-slate-500'}`}>
                          {group.payments.length} Ödeme Talimatı
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 md:gap-12">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Talimat Sayısı</p>
                        <p className={`font-black ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                          {group.payments.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Toplam Tutar</p>
                        <p className="font-black text-navy">
                          ₺{group.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-slate-300">
                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                              <th className="px-6 py-4">Talimat No</th>
                              <th className="px-6 py-4">Alıcı</th>
                              <th className="px-6 py-4">Tutar</th>
                              <th className="px-6 py-4">Durum</th>
                              <th className="px-6 py-4">Tarih</th>
                              <th className="px-6 py-4">Notlar</th>
                              <th className="px-6 py-4 text-center">İşlem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.payments.map((payment, index) => {
                              const statusInfo = getStatusInfo(payment.status)
                              const StatusIcon = statusInfo.icon

                              return (
                                <tr key={payment.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100/50 transition-colors`}>
                                  <td className="px-6 py-4">
                                    <span className="font-bold text-navy">
                                      {payment.instruction_number}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className="font-bold text-slate-900">
                                        {payment.user?.full_name || payment.personnel?.full_name || '-'}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {payment.user?.email || payment.personnel?.email || '-'}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-bold text-slate-900">
                                      ₺{payment.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {payment.items.length} kalem
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {statusInfo.text}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="font-medium text-slate-900">
                                      {new Date(payment.created_at).toLocaleDateString('tr-TR')}
                                    </p>
                                    {payment.approved_at && (
                                      <p className="text-xs text-navy font-medium">
                                        Onay: {new Date(payment.approved_at).toLocaleDateString('tr-TR')}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-slate-700 max-w-[200px] truncate">
                                      {payment.notes || '-'}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-center gap-1">
                                      <Link
                                        href={`/dashboard/payments/${payment.id}` as any}
                                        className="p-2 text-slate-500 hover:text-navy hover:bg-navy/10 rounded-lg transition-all"
                                        title="Görüntüle"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Link>

                                      {(user.role === 'admin' || user.role === 'manager') && (
                                        <>
                                          <Link
                                            href={`/dashboard/payments/${payment.id}/edit` as any}
                                            className="p-2 text-slate-500 hover:text-navy hover:bg-navy/10 rounded-lg transition-all"
                                            title="Düzenle"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Link>

                                          <button
                                            className="p-2 text-slate-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                                            title="Sil"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
