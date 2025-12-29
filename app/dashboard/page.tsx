'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  Building2,
  Wallet,
  FileText,
  PiggyBank,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Coins,
  Landmark,
  AlertCircle,
  FolderOpen,
  Calendar
} from 'lucide-react'
import { StatCardSkeleton, ProgressBarSkeleton, MonthlyTableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { MiniChart } from '@/components/ui/mini-chart'
import { CashFlowDiagram } from '@/components/charts/cash-flow-diagram'
import { CashFlowData, CashFlowPeriod, PERIOD_OPTIONS } from '@/components/charts/cash-flow-types'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalIncome: number
  totalPayments: number
  pendingPayments: number
  totalUsers: number
  totalBalance: number
}

interface TTOFinancials {
  total_commission: number
  total_expenses: number
  net_balance: number
  debt_amount: number
}

interface YearBreakdown {
  year: string
  invoiced: number
  commission: number
  remaining: number
}

interface MonthlyData {
  month: number
  income: number
  expense: number
  difference: number
}

interface DashboardMetrics {
  total_budget: number
  total_invoiced: number
  total_collected: number
  total_outstanding: number
  remaining_to_invoice: number
  total_commission: number
  active_project_count: number
  progress_percentage: number
  collection_percentage: number
  year_breakdown: YearBreakdown[]
  monthly_breakdown: Record<string, MonthlyData[]>
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ttoFinancials, setTtoFinancials] = useState<TTOFinancials | null>(null)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [loading, setLoading] = useState(true)
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null)
  const [cashFlowPeriod, setCashFlowPeriod] = useState<CashFlowPeriod>('month')
  const [cashFlowLoading, setCashFlowLoading] = useState(false)
  const router = useRouter()

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
      fetchDashboardStats(token)

      // Fetch TTO financials if user is admin or manager
      if (['admin', 'manager'].includes(parsedUser.role)) {
        fetchTTOFinancials(token)
        fetchDashboardMetrics(token)
        fetchCashFlowData(token, 'month')
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchDashboardStats = async (token: string) => {
    try {
      // Fetch projects
      const projectsResponse = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const projectsData = await projectsResponse.json()

      // Fetch incomes
      const incomesResponse = await fetch('/api/incomes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const incomesData = await incomesResponse.json()

      // Fetch payments
      const paymentsResponse = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const paymentsData = await paymentsResponse.json()

      // Fetch balances
      const balancesResponse = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const balancesData = await balancesResponse.json()

      if (projectsData.success && incomesData.success && paymentsData.success && balancesData.success) {
        const projects = projectsData.data.projects || []
        const incomes = incomesData.data.incomes || []
        const payments = paymentsData.data.payments || []
        const balances = balancesData.data.balances || []

        setStats({
          totalProjects: projects.length,
          activeProjects: projects.filter((p: any) => p.status === 'active').length,
          totalIncome: incomes.reduce((sum: number, i: any) => sum + (i.gross_amount || 0), 0),
          totalPayments: payments.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
          pendingPayments: payments.filter((p: any) => p.status === 'pending').length,
          totalUsers: balances.length,
          totalBalance: balances.reduce((sum: number, b: any) => sum + (b.available_amount || 0), 0)
        })
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTTOFinancials = async (token: string) => {
    try {
      const response = await fetch('/api/balances/admin-summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setTtoFinancials(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch TTO financials:', err)
    }
  }

  const fetchDashboardMetrics = async (token: string) => {
    try {
      const response = await fetch('/api/dashboard/metrics', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setDashboardMetrics(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch dashboard metrics:', err)
    }
  }

  const fetchCashFlowData = async (token: string, period: CashFlowPeriod) => {
    setCashFlowLoading(true)
    try {
      const response = await fetch(`/api/dashboard/cash-flow?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (result.success) {
        setCashFlowData(result.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch cash flow data:', err)
    } finally {
      setCashFlowLoading(false)
    }
  }

  // Cash flow period değiştiğinde yeniden fetch et
  const handleCashFlowPeriodChange = (newPeriod: CashFlowPeriod) => {
    setCashFlowPeriod(newPeriod)
    const token = localStorage.getItem('token')
    if (token) {
      fetchCashFlowData(token, newPeriod)
    }
  }

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Welcome Section Skeleton */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* Stat Cards Skeleton */}
          <StatCardSkeleton count={6} />

          {/* Admin-specific skeletons - only shows briefly during loading */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-lg" />
              <Skeleton className="h-6 w-64" />
            </div>

            {/* 6 Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            {/* Progress Bar Skeleton */}
            <ProgressBarSkeleton />

            {/* Year Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm p-4 border">
                  <Skeleton className="h-5 w-16 mb-3" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Table Skeleton */}
            <MonthlyTableSkeleton />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Different stat cards based on user role
  const statCards = user.role === 'manager' ? [
    {
      title: 'Bakiyeniz',
      value: `₺${(stats?.totalBalance || 0).toLocaleString('tr-TR')}`,
      icon: PiggyBank,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Dahil Olduğunuz Projeler',
      value: stats?.totalProjects || 0,
      icon: Building2,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Projelerden Toplam Gelir',
      value: `₺${(stats?.totalIncome || 0).toLocaleString('tr-TR')}`,
      icon: Wallet,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Ödeme Talepleriniz',
      value: `₺${(stats?.totalPayments || 0).toLocaleString('tr-TR')}`,
      icon: FileText,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Bekleyen Ödemeler',
      value: stats?.pendingPayments || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Aktif Projeler',
      value: stats?.activeProjects || 0,
      icon: CheckCircle,
      color: 'bg-pink-500',
      textColor: 'text-pink-600'
    },
  ] : [
    {
      title: 'Toplam Proje',
      value: stats?.totalProjects || 0,
      icon: Building2,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Aktif Proje',
      value: stats?.activeProjects || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Toplam Gelir',
      value: `₺${(stats?.totalIncome || 0).toLocaleString('tr-TR')}`,
      icon: Wallet,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Toplam Ödeme',
      value: `₺${(stats?.totalPayments || 0).toLocaleString('tr-TR')}`,
      icon: FileText,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600'
    },
    {
      title: 'Bekleyen Ödeme',
      value: stats?.pendingPayments || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Toplam Bakiye',
      value: `₺${(stats?.totalBalance || 0).toLocaleString('tr-TR')}`,
      icon: PiggyBank,
      color: 'bg-pink-500',
      textColor: 'text-pink-600'
    },
  ]

  // Use directly without filtering
  const visibleStats = statCards

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-base font-bold text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Hoş geldiniz, {user.full_name}
                </h1>
                <p className="text-sm text-slate-600">
                  {user.role === 'admin' && 'Sistem Yöneticisi Paneli'}
                  {user.role === 'manager' && 'Mali İşler Paneli'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-0.5">Bugün</p>
                <p className="text-sm font-semibold text-slate-900">
                  {new Date().toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* TTO Dashboard (Admin and Manager) */}
        {['admin', 'manager'].includes(user.role) && dashboardMetrics && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Finansal Gösterge Tablosu</h2>
              <p className="text-sm text-slate-600">TTO Mali Durum Özeti</p>
            </div>

            {/* Main 6 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Total Budget */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Toplam Bütçe</p>
                <p className="text-lg font-bold text-slate-900">
                  ₺{dashboardMetrics.total_budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 2. Invoiced (Kesilen Fatura) */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Kesilen Fatura</p>
                <p className="text-lg font-bold text-slate-900">
                  ₺{dashboardMetrics.total_invoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 3. Collected (Tahsil Edilen) */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Tahsil Edilen</p>
                <p className="text-lg font-bold text-emerald-600">
                  ₺{dashboardMetrics.total_collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 4. Outstanding (Açık Bakiye) */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Açık Bakiye</p>
                <p className="text-lg font-bold text-orange-600">
                  ₺{dashboardMetrics.total_outstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 5. Remaining to Invoice (Kesilecek Fatura) */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Kesilecek Fatura</p>
                <p className="text-lg font-bold text-red-600">
                  ₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* 6. TTO Commission */}
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">TTO Payı</p>
                <p className="text-lg font-bold text-purple-600">
                  ₺{dashboardMetrics.total_commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Multi-Segment Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 uppercase mb-1">Bütçe Durumu</p>
                    <p className="text-xl font-bold text-slate-900">
                      ₺{dashboardMetrics.total_budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* 3 Segmentli Progress Bar */}
                <div className="relative w-full h-8 bg-slate-200 rounded-lg overflow-hidden">
                  {/* Yeşil: Tahsil Edilen */}
                  <div
                    className="absolute h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${dashboardMetrics.total_budget > 0 ? (dashboardMetrics.total_collected / dashboardMetrics.total_budget) * 100 : 0}%`,
                      left: 0
                    }}
                    title={`Tahsil Edilen: ₺${dashboardMetrics.total_collected.toLocaleString('tr-TR')}`}
                  />

                  {/* Turuncu: Açık Bakiye (Kesilen ama tahsil edilmemiş) */}
                  <div
                    className="absolute h-full bg-orange-500 transition-all duration-500"
                    style={{
                      width: `${dashboardMetrics.total_budget > 0 ? (dashboardMetrics.total_outstanding / dashboardMetrics.total_budget) * 100 : 0}%`,
                      left: `${dashboardMetrics.total_budget > 0 ? (dashboardMetrics.total_collected / dashboardMetrics.total_budget) * 100 : 0}%`
                    }}
                    title={`Açık Bakiye: ₺${dashboardMetrics.total_outstanding.toLocaleString('tr-TR')}`}
                  />

                  {/* Gri kısım zaten arka planda görünüyor (remaining) */}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Tahsil Edilen</div>
                      <div className="text-slate-600">₺{dashboardMetrics.total_collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Açık Bakiye</div>
                      <div className="text-slate-600">₺{dashboardMetrics.total_outstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-slate-300 rounded"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Kesilecek</div>
                      <div className="text-slate-600">₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Flow Diagram */}
            <div className="bg-slate-800 rounded-lg shadow-sm p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">Nakit Akışı Diyagramı</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gelir ve gider akışı görselleştirmesi</p>
                </div>
                <select
                  value={cashFlowPeriod}
                  onChange={(e) => handleCashFlowPeriodChange(e.target.value as CashFlowPeriod)}
                  className="px-3 py-2 border border-slate-600 rounded text-sm font-semibold text-slate-100 bg-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {cashFlowLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                </div>
              ) : cashFlowData ? (
                <CashFlowDiagram data={cashFlowData} width={800} height={400} />
              ) : (
                <div className="flex items-center justify-center h-[400px] text-slate-400">
                  <p>Veri yüklenemedi</p>
                </div>
              )}
            </div>

            {/* Year Breakdown Cards */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-3">Yıllık Dağılım</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dashboardMetrics.year_breakdown.map((yearData) => (
                  <div key={yearData.year} className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{yearData.year}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <span className="text-xs text-red-700 uppercase">Kesilecek</span>
                        <span className="text-base font-bold text-red-700">
                          ₺{yearData.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-purple-50 rounded border border-purple-100">
                        <span className="text-xs text-purple-700 uppercase">TTO Payı</span>
                        <span className="text-base font-bold text-purple-700">
                          ₺{yearData.commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Income-Expense Table */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aylık Gelir-Gider Tablosu</h3>
                  <p className="text-xs text-slate-600 mt-0.5">12 aylık finansal özet</p>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50">
                      <th className="py-3 px-3 text-left font-semibold text-slate-900 sticky left-0 bg-slate-50">Kategori</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Oca</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Şub</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Mar</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Nis</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">May</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Haz</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Tem</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Ağu</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Eyl</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Eki</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Kas</th>
                      <th className="py-3 px-2 text-center font-semibold text-slate-700">Ara</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Gelirler Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900 sticky left-0 bg-white hover:bg-slate-50">Gelirler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-3 px-2 text-center text-emerald-600 font-semibold">
                          {monthData.income > 0 ? `₺${monthData.income.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Giderler Row */}
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900 sticky left-0 bg-white hover:bg-slate-50">Giderler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-3 px-2 text-center text-red-600 font-semibold">
                          {monthData.expense > 0 ? `-₺${monthData.expense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Fark Row */}
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td className="py-3 px-3 font-bold text-slate-900 sticky left-0 bg-slate-100">Net Kar</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td
                          key={index}
                          className={`py-3 px-2 text-center font-bold ${
                            monthData.difference > 0
                              ? 'text-teal-600'
                              : monthData.difference < 0
                              ? 'text-red-700'
                              : 'text-gray-500'
                          }`}
                        >
                          {monthData.difference !== 0 ? `₺${monthData.difference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Toplam Gelir</p>
                  <p className="text-base font-bold text-emerald-600">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.income, 0) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Toplam Gider</p>
                  <p className="text-base font-bold text-red-600">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.expense, 0) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Net Fark</p>
                  <p className={`text-base font-bold ${
                    (dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.difference, 0) || 0) > 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.difference, 0) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}