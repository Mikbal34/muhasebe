'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { CollectionModal } from '@/components/income/collection-modal'
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  TrendingUp,
  Coins,
  ChevronDown,
  ChevronRight,
  Banknote,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Rocket,
  FlaskConical,
  Cpu,
  FolderOpen,
  FileSpreadsheet
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useIncomes, useInvalidateIncomes, DateRange } from '@/hooks/use-incomes'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { turkishIncludes } from '@/lib/utils/string'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Income {
  id: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  net_amount: number
  collected_amount: number
  description: string | null
  income_date: string
  created_at: string
  is_fsmh_income: boolean
  income_type: 'ozel' | 'kamu'
  is_tto_income: boolean
  project: {
    id: string
    code: string
    name: string
  }
  created_by_user: {
    full_name: string
  }
  distributions: Array<{
    id: string
    amount: number
    share_percentage: number
    user: {
      id: string
      full_name: string
      email: string
    }
  }>
}

export default function IncomesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)
  const [exporting, setExporting] = useState(false)
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const router = useRouter()

  const { data: incomes = [], isLoading: incomesLoading } = useIncomes(dateRange)
  const invalidateIncomes = useInvalidateIncomes()

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

  const filteredIncomes = incomes.filter(income => {
    const matchesSearch = turkishIncludes(income.project.name, searchTerm) ||
                         turkishIncludes(income.project.code, searchTerm) ||
                         turkishIncludes(income.description || '', searchTerm)
    const matchesProject = !projectFilter || income.project.id === projectFilter
    return matchesSearch && matchesProject
  })

  const projects = Array.from(
    new Set(incomes.map(income => JSON.stringify({ id: income.project.id, name: income.project.name, code: income.project.code })))
  ).map(str => JSON.parse(str))

  const totalStats = filteredIncomes.reduce((acc, income) => ({
    totalGross: acc.totalGross + income.gross_amount,
    totalVat: acc.totalVat + income.vat_amount,
    totalCollected: acc.totalCollected + income.collected_amount,
    count: acc.count + 1
  }), { totalGross: 0, totalVat: 0, totalCollected: 0, count: 0 })

  const totalOutstanding = totalStats.totalGross - totalStats.totalCollected
  const collectionPercentage = totalStats.totalGross > 0
    ? Math.round((totalStats.totalCollected / totalStats.totalGross) * 100)
    : 0

  const incomesByProject = filteredIncomes.reduce((acc, income) => {
    const projectKey = income.project.id
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: income.project,
        incomes: [],
        totalGross: 0,
        totalVat: 0,
        totalNet: 0,
        totalCollected: 0
      }
    }
    acc[projectKey].incomes.push(income)
    acc[projectKey].totalGross += income.gross_amount
    acc[projectKey].totalVat += income.vat_amount
    acc[projectKey].totalNet += income.net_amount
    acc[projectKey].totalCollected += income.collected_amount
    return acc
  }, {} as Record<string, { project: any; incomes: Income[]; totalGross: number; totalVat: number; totalNet: number; totalCollected: number }>)

  const projectGroups = Object.values(incomesByProject)

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const openCollectionModal = (income: Income) => {
    setSelectedIncome(income)
    setCollectionModalOpen(true)
  }

  const handleCollectionSuccess = () => {
    invalidateIncomes()
  }

  const handleExportExcel = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExporting(true)
    try {
      const response = await fetch('/api/reports/export/income', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectFilter || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proje_bazli_gelir_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Excel dosyası oluşturulurken bir hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  // Get delayed incomes count
  const delayedIncomesCount = filteredIncomes.filter(income => {
    const outstanding = income.gross_amount - income.collected_amount
    return outstanding > 0 && new Date(income.income_date) < new Date()
  }).length

  if (incomesLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-36" />
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
            <h1 className="text-navy text-4xl font-black tracking-tight">Gelirler</h1>
            <p className="text-slate-500 text-base">Gelir yönetimi ve tahsilat takibi paneli</p>
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

              <div className="relative">
                <button
                  onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                  className="flex items-center gap-2 px-5 h-11 bg-navy text-white rounded-lg font-bold text-sm hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
                >
                  <Plus className="w-5 h-5" />
                  Yeni İşlem
                  <ChevronDown className="w-4 h-4" />
                </button>

                {actionDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                      <Link
                        href="/dashboard/incomes/new"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setActionDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-navy" />
                        </div>
                        Yeni Gelir
                      </Link>
                      <Link
                        href="/dashboard/incomes/import"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                        onClick={() => setActionDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        </div>
                        Toplu Gelir Ekle
                      </Link>
                      <Link
                        href="/dashboard/balances/allocate"
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                        onClick={() => setActionDropdownOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                          <Coins className="w-4 h-4 text-gold" />
                        </div>
                        Gelir Dağılımı
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Brüt Toplam */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Brüt Toplam</p>
              <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-navy" />
              </div>
            </div>
            <p className="text-xl font-black text-navy truncate">
              ₺{totalStats.totalGross.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-1 flex items-center text-[11px] text-navy font-bold">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>{totalStats.count} gelir kaydı</span>
            </div>
          </div>

          {/* KDV Toplamı */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">KDV Toplamı</p>
              <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                <Percent className="w-4 h-4 text-navy" />
              </div>
            </div>
            <p className="text-xl font-black text-navy truncate">
              ₺{totalStats.totalVat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">
              Toplam {projectGroups.length} projeden
            </p>
          </div>

          {/* Tahsil Edilen */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tahsil Edilen</p>
              <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-navy" />
              </div>
            </div>
            <p className="text-xl font-black text-navy truncate">
              ₺{totalStats.totalCollected.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </p>
            <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-navy h-full transition-all duration-500"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 font-medium">%{collectionPercentage} tahsil oranı</p>
          </div>

          {/* Tahsil Bekleyen */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tahsil Bekleyen</p>
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-gold" />
              </div>
            </div>
            <p className="text-xl font-black text-gold truncate">
              ₺{totalOutstanding.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </p>
            {delayedIncomesCount > 0 && (
              <p className="mt-1 text-[11px] text-gold/80 font-bold italic">
                {delayedIncomesCount} Gecikmiş işlem
              </p>
            )}
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
                  placeholder="Proje adı veya koduna göre ara..."
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

            {/* Date Range */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Count Badge */}
            <div className="bg-gold/10 text-gold px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
              {filteredIncomes.length} Gelir Görüntüleniyor
            </div>
          </div>
        </div>

        {/* Project Accordion List */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-navy to-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-black text-navy mb-2">Henüz gelir kaydı yok</h3>
              <p className="text-slate-500 mb-6">İlk gelir kaydını oluşturmak için butona tıklayın</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                >
                  <Plus className="w-5 h-5" />
                  İlk Geliri Ekle
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const isExpanded = expandedProjects[group.project.id]
              const projectIcon = group.project.code.includes('AR-GE') ? Rocket
                : group.project.code.includes('BIO') ? FlaskConical
                : Cpu

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
                          : 'bg-slate-100 text-navy group-hover:bg-navy group-hover:text-white'
                      }`}>
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                            {group.project.name}
                          </h3>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                            PROJE
                          </span>
                        </div>
                        <p className={`text-sm font-medium tracking-tight ${isExpanded ? 'text-navy/70' : 'text-slate-500'}`}>
                          {group.project.code} • {group.incomes.length} Gelir Kalemi
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 md:gap-12">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Toplam Brüt</p>
                        <p className={`font-black ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                          ₺{group.totalGross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Kalan Net</p>
                        <p className="font-black text-navy">
                          ₺{group.totalNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
                              <th className="px-6 py-4">Açıklama</th>
                              <th className="px-6 py-4">Tip</th>
                              <th className="px-6 py-4">Brüt</th>
                              <th className="px-6 py-4">Tahsilat</th>
                              <th className="px-6 py-4">KDV</th>
                              <th className="px-6 py-4">Net</th>
                              <th className="px-6 py-4">Tarih</th>
                              {(user.role === 'admin' || user.role === 'manager') && (
                                <th className="px-6 py-4 text-center">İşlem</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.incomes.map((income, idx) => {
                              const outstandingAmount = income.gross_amount - income.collected_amount
                              const isFullyCollected = income.collected_amount >= income.gross_amount

                              return (
                                <tr
                                  key={income.id}
                                  className={`hover:bg-slate-50 transition-colors ${
                                    idx % 2 === 1 ? 'bg-slate-50/40' : ''
                                  }`}
                                >
                                  <td className="px-6 py-4 font-semibold text-slate-700">
                                    {income.description || '-'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5">
                                      {income.is_fsmh_income && (
                                        <span className="px-2 py-1 rounded bg-navy/10 text-navy text-[10px] font-bold">
                                          FSMH
                                        </span>
                                      )}
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        income.income_type === 'kamu'
                                          ? 'bg-gold/20 text-gold'
                                          : 'bg-navy/10 text-navy'
                                      }`}>
                                        {income.income_type === 'kamu' ? 'KAMU' : 'ÖZEL'}
                                      </span>
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        income.is_tto_income
                                          ? 'bg-navy/10 text-navy'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {income.is_tto_income ? 'TTO' : 'TTO DIŞI'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-900">
                                    ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4">
                                    {isFullyCollected ? (
                                      <div className="flex items-center gap-1.5 text-navy font-bold text-xs">
                                        <CheckCircle className="w-4 h-4" />
                                        Tamamlandı
                                      </div>
                                    ) : outstandingAmount > 0 ? (
                                      <div className="flex items-center gap-1.5 text-gold font-bold text-xs">
                                        <AlertCircle className="w-4 h-4" />
                                        Beklemede
                                      </div>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500">
                                    ₺{income.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4 font-black text-slate-900">
                                    ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4 text-slate-500 tabular-nums">
                                    {new Date(income.income_date).toLocaleDateString('tr-TR')}
                                  </td>
                                  {(user.role === 'admin' || user.role === 'manager') && (
                                    <td className="px-6 py-4 text-center">
                                      {!isFullyCollected ? (
                                        <button
                                          onClick={() => openCollectionModal(income)}
                                          className="bg-gold hover:bg-gold/90 text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all shadow-sm"
                                        >
                                          Tahsilat
                                        </button>
                                      ) : (
                                        <button className="text-slate-400 hover:text-navy transition-colors p-1">
                                          <MoreVertical className="w-5 h-5" />
                                        </button>
                                      )}
                                    </td>
                                  )}
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

        {/* Pagination */}
        {projectGroups.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Gösterilen: <span className="font-bold text-navy">1 - {projectGroups.length}</span> / Toplam {projectGroups.length} Proje
            </p>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center font-bold">
                1
              </button>
              <button className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Collection Modal */}
        {selectedIncome && (
          <CollectionModal
            isOpen={collectionModalOpen}
            onClose={() => setCollectionModalOpen(false)}
            onSuccess={handleCollectionSuccess}
            income={selectedIncome}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
