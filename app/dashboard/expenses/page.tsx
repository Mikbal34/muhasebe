'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Receipt,
  Plus,
  Search,
  Trash2,
  Building2,
  Calendar,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Download,
  FolderOpen,
  Wallet,
  BarChart3
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useExpenses, useInvalidateExpenses, DateRange } from '@/hooks/use-expenses'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { turkishIncludes } from '@/lib/utils/string'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

type ExpenseType = 'genel' | 'proje'
type ExpenseSource = 'manual' | 'referee_payment' | 'stamp_duty'

interface Expense {
  id: string
  expense_type: ExpenseType
  expense_source?: ExpenseSource
  amount: number
  description: string
  expense_date: string
  is_tto_expense: boolean
  created_at: string
  project: {
    id: string
    code: string
    name: string
  } | null
  created_by_user: {
    full_name: string
  }
}

export default function ExpensesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const router = useRouter()

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses(dateRange)
  const invalidateExpenses = useInvalidateExpenses()

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

  const handleDelete = async (id: string) => {
    if (!confirm('Bu gideri silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        invalidateExpenses()
        alert('Gider başarıyla silindi')
      } else {
        alert(data.error || 'Gider silinemedi')
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
      alert('Gider silinemedi')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const projectName = expense.project?.name || 'Genel Gider'
    const projectCode = expense.project?.code || ''
    const matchesSearch = turkishIncludes(projectName, searchTerm) ||
                         turkishIncludes(projectCode, searchTerm) ||
                         turkishIncludes(expense.description, searchTerm)
    const matchesProject = !projectFilter ||
                          (projectFilter === 'genel' && !expense.project) ||
                          (expense.project?.id === projectFilter)
    return matchesSearch && matchesProject
  })

  const projects = Array.from(
    new Set(expenses
      .filter(expense => expense.project)
      .map(expense => JSON.stringify({ id: expense.project!.id, name: expense.project!.name, code: expense.project!.code })))
  ).map(str => JSON.parse(str))

  const hasGenelGider = expenses.some(e => e.expense_type === 'genel')

  const totalStats = filteredExpenses.reduce((acc, expense) => ({
    totalAmount: acc.totalAmount + expense.amount,
    count: acc.count + 1
  }), { totalAmount: 0, count: 0 })

  const genelGiderler = filteredExpenses.filter(e => e.expense_type === 'genel')
  const projeGiderleri = filteredExpenses.filter(e => e.expense_type === 'proje')
  const genelToplam = genelGiderler.reduce((sum, e) => sum + e.amount, 0)
  const projeToplam = projeGiderleri.reduce((sum, e) => sum + e.amount, 0)

  const expensesByProject = filteredExpenses.reduce((acc, expense) => {
    const projectKey = expense.project?.id || 'genel'
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: expense.project,
        expenses: [],
        totalAmount: 0,
        isGenel: expense.expense_type === 'genel'
      }
    }
    acc[projectKey].expenses.push(expense)
    acc[projectKey].totalAmount += expense.amount
    return acc
  }, {} as Record<string, { project: any; expenses: Expense[]; totalAmount: number; isGenel: boolean }>)

  const projectGroups = Object.values(expensesByProject).sort((a, b) => {
    if (a.isGenel) return -1
    if (b.isGenel) return 1
    return (a.project?.name || '').localeCompare(b.project?.name || '')
  })

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleExportExcel = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExporting(true)
    try {
      const response = await fetch('/api/reports/export/expense', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectFilter && projectFilter !== 'genel' ? projectFilter : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proje_bazli_gider_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
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

  if (expensesLoading || !user) {
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
            <h1 className="text-navy text-4xl font-black tracking-tight">Giderler</h1>
            <p className="text-slate-500 text-base">Genel ve proje giderlerini görüntüleyin ve yönetin</p>
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
                href="/dashboard/expenses/new"
                className="flex items-center gap-2 px-5 h-11 bg-navy text-white rounded-lg font-bold text-sm hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
              >
                <Plus className="w-5 h-5" />
                Yeni Gider
              </Link>
            </div>
          )}
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Toplam Gider */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Toplam Gider</p>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-gold" />
              </div>
            </div>
            <p className="text-3xl font-black text-gold">
              ₺{totalStats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              {totalStats.count} gider kaydı
            </p>
          </div>

          {/* Genel Giderler */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Genel Giderler</p>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-navy" />
              </div>
            </div>
            <p className="text-3xl font-black text-navy">
              ₺{genelToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              {genelGiderler.length} kayıt
            </p>
          </div>

          {/* Proje Giderleri */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Proje Giderleri</p>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-navy" />
              </div>
            </div>
            <p className="text-3xl font-black text-navy">
              ₺{projeToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              {projeGiderleri.length} kayıt
            </p>
          </div>

          {/* Ortalama Gider */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex justify-between items-start mb-4">
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Ortalama Gider</p>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-navy" />
              </div>
            </div>
            <p className="text-3xl font-black text-navy">
              ₺{totalStats.count > 0 ? (totalStats.totalAmount / totalStats.count).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0,00'}
            </p>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              {projectGroups.length} farklı kategori
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
                  placeholder="Proje adı veya açıklamaya göre ara..."
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
                <option value="">Tüm Giderler</option>
                {hasGenelGider && (
                  <option value="genel">Genel Giderler</option>
                )}
                {projects.map(project => (
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
            <div className="bg-navy/10 text-navy px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
              {filteredExpenses.length} Gider Görüntüleniyor
            </div>
          </div>
        </div>

        {/* Project Accordion List */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-navy to-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Receipt className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-black text-navy mb-2">Henüz gider kaydı yok</h3>
              <p className="text-slate-500 mb-6">İlk gider kaydını oluşturmak için butona tıklayın</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/expenses/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                >
                  <Plus className="w-5 h-5" />
                  İlk Gideri Ekle
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const groupKey = group.isGenel ? 'genel' : group.project?.id
              const isExpanded = expandedProjects[groupKey]

              return (
                <div
                  key={groupKey}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'border-2 border-navy shadow-xl shadow-navy/5'
                      : 'border-slate-200 hover:border-navy/30 cursor-pointer'
                  }`}
                >
                  {/* Project Header */}
                  <button
                    onClick={() => toggleProject(groupKey)}
                    className={`w-full flex items-center justify-between p-5 transition-colors ${
                      isExpanded ? 'bg-navy/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        isExpanded
                          ? 'bg-navy text-white'
                          : group.isGenel ? 'bg-gold/20 text-gold' : 'bg-navy/10 text-navy'
                      }`}>
                        {group.isGenel ? (
                          <Receipt className="w-6 h-6" />
                        ) : (
                          <Building2 className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                            {group.isGenel ? 'Genel Giderler' : group.project?.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            group.isGenel
                              ? 'bg-gold/20 text-gold'
                              : 'bg-navy/10 text-navy'
                          }`}>
                            {group.isGenel ? 'TTO' : 'PROJE'}
                          </span>
                        </div>
                        <p className={`text-sm font-medium tracking-tight ${isExpanded ? 'text-navy/70' : 'text-slate-500'}`}>
                          {group.isGenel ? 'Proje dışı genel giderler' : group.project?.code} • {group.expenses.length} Gider Kalemi
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 md:gap-12">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gider Sayısı</p>
                        <p className={`font-black ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                          {group.expenses.length}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Toplam Tutar</p>
                        <p className="font-black text-gold">
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
                              <th className="px-6 py-4">Açıklama</th>
                              <th className="px-6 py-4">Tip</th>
                              <th className="px-6 py-4">Tutar</th>
                              <th className="px-6 py-4">Tarih</th>
                              <th className="px-6 py-4">Oluşturan</th>
                              {user.role === 'admin' && (
                                <th className="px-6 py-4 text-center">İşlem</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.expenses.map((expense, idx) => (
                              <tr
                                key={expense.id}
                                className={`hover:bg-slate-50 transition-colors ${
                                  idx % 2 === 1 ? 'bg-slate-50/40' : ''
                                }`}
                              >
                                <td className="px-6 py-4 font-semibold text-slate-700">
                                  <div className="flex items-center gap-2">
                                    {expense.description}
                                    {expense.expense_source && expense.expense_source !== 'manual' && (
                                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                        OTOMATİK
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      expense.expense_type === 'genel'
                                        ? 'bg-gold/20 text-gold'
                                        : 'bg-navy/10 text-navy'
                                    }`}>
                                      {expense.expense_type === 'genel' ? 'GENEL' : 'PROJE'}
                                    </span>
                                    {expense.expense_type === 'proje' && (
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                        expense.is_tto_expense
                                          ? 'bg-navy/10 text-navy'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {expense.is_tto_expense ? 'TTO' : 'KARŞI'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-black text-gold">
                                  ₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-slate-500 tabular-nums">
                                  {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  {expense.created_by_user.full_name}
                                </td>
                                {user.role === 'admin' && (
                                  <td className="px-6 py-4 text-center">
                                    <button
                                      onClick={() => handleDelete(expense.id)}
                                      className="bg-gold/10 hover:bg-gold/20 text-gold p-2 rounded-lg transition-all"
                                      title="Sil"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
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
              Gösterilen: <span className="font-bold text-navy">1 - {projectGroups.length}</span> / Toplam {projectGroups.length} Kategori
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
      </div>
    </DashboardLayout>
  )
}
