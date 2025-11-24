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

      // Fetch TTO financials if user is admin
      if (parsedUser.role === 'admin') {
        fetchTTOFinancials(token)
        fetchDashboardMetrics(token)
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
        {/* Welcome Section - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-2xl font-bold text-white">
                  {user.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">
                  Hoş geldiniz, {user.full_name}
                </h1>
                <p className="text-slate-600 font-medium">
                  {user.role === 'admin' && '🔐 Sistem Yöneticisi Paneli'}
                  {user.role === 'manager' && '💼 Mali İşler Paneli'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Bugün</p>
                <p className="text-sm font-bold text-slate-900">
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

        {/* TTO Dashboard (Admin Only) */}
        {user.role === 'admin' && dashboardMetrics && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-xl flex items-center justify-center shadow-lg">
                <Landmark className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Finansal Gösterge Tablosu</h2>
                <p className="text-sm text-slate-600">TTO Mali Durum Özeti</p>
              </div>
            </div>

            {/* Main 6 Cards - Modern Design with Mini Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* 1. Total Budget */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-accent-teal group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Toplam Bütçe</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.total_budget / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[1.2, 1.8, 1.5, 2.1, 2.5, 2.3, 2.8, 3.2]}
                    color="#14B8A6"
                    height={45}
                  />
                </div>
              </div>

              {/* 2. Invoiced (Kesilen Fatura) */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-blue-400 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kesilen Fatura</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.total_invoiced / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[0.5, 0.7, 1.2, 1.0, 1.5, 1.8, 2.0, 2.2]}
                    color="#4F46E5"
                    height={45}
                  />
                </div>
              </div>

              {/* 3. Collected (Tahsil Edilen) - GREEN */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-emerald-400 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tahsil Edilen</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.total_collected / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[0.8, 1.2, 1.1, 1.4, 1.7, 1.6, 1.9, 2.0]}
                    color="#10B981"
                    height={45}
                  />
                </div>
              </div>

              {/* 4. Outstanding (Açık Bakiye) - ORANGE */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-orange-400 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Açık Bakiye</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.total_outstanding / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[300, 250, 280, 220, 200, 180, 150, 120]}
                    color="#F97316"
                    height={45}
                  />
                </div>
              </div>

              {/* 5. Remaining to Invoice (Kesilecek Fatura) - RED */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-red-400 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kesilecek Fatura</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.remaining_to_invoice / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[1.5, 1.3, 1.1, 0.9, 0.7, 0.6, 0.4, 0.3]}
                    color="#EF4444"
                    height={45}
                  />
                </div>
              </div>

              {/* 6. TTO Commission */}
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-purple-400 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">TTO Payı</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ₺{(dashboardMetrics.total_commission / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <MiniChart
                    data={[100, 120, 115, 140, 160, 155, 180, 200]}
                    color="#8B5CF6"
                    height={45}
                  />
                </div>
              </div>
            </div>

            {/* Progress Bar - Modern Design */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-md p-6 border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Fatura İlerleme Durumu</p>
                    <p className="text-3xl font-bold text-slate-900">
                      %{dashboardMetrics.progress_percentage.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-600 mb-1">Kesilen</p>
                    <p className="text-lg font-bold text-accent-teal">
                      ₺{(dashboardMetrics.total_invoiced / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
                <div className="relative w-full h-10 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="absolute h-full bg-gradient-to-r from-accent-teal to-accent-cyan flex items-center justify-center text-sm font-bold text-white transition-all duration-500 shadow-lg"
                    style={{ width: `${Math.min(dashboardMetrics.progress_percentage, 100)}%` }}
                  >
                    {dashboardMetrics.progress_percentage > 15 && (
                      <span>%{dashboardMetrics.progress_percentage.toFixed(1)}</span>
                    )}
                  </div>
                  {dashboardMetrics.progress_percentage <= 15 && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">
                      %{dashboardMetrics.progress_percentage.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Year Breakdown Cards - Modern Design */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Yıllık Dağılım</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardMetrics.year_breakdown.map((yearData) => (
                  <div key={yearData.year} className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-slate-900">{yearData.year}</h3>
                      <div className="h-8 w-8 bg-gradient-to-br from-accent-cyan to-blue-500 rounded-lg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Kesilecek</span>
                        <span className="text-lg font-bold text-red-700">
                          ₺{(yearData.remaining / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">TTO Payı</span>
                        <span className="text-lg font-bold text-purple-700">
                          ₺{(yearData.commission / 1000).toFixed(0)}K
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Income-Expense Table - Modern Design */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Aylık Gelir-Gider Tablosu</h3>
                  <p className="text-sm text-slate-600 mt-1">12 aylık finansal özet</p>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-5 py-3 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 bg-white hover:border-accent-teal focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-accent-teal transition-all shadow-sm"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-100 to-slate-50">
                      <th className="py-4 px-4 text-left font-bold text-slate-900 sticky left-0 bg-slate-100">Kategori</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Oca</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Şub</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Mar</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Nis</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">May</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Haz</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Tem</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Ağu</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Eyl</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Eki</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Kas</th>
                      <th className="py-4 px-3 text-center font-bold text-slate-700">Ara</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Gelirler Row */}
                    <tr className="hover:bg-emerald-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900 sticky left-0 bg-white hover:bg-emerald-50">💰 Gelirler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-4 px-3 text-center text-emerald-600 font-bold">
                          {monthData.income > 0 ? `₺${(monthData.income / 1000).toFixed(0)}K` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Giderler Row */}
                    <tr className="hover:bg-red-50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900 sticky left-0 bg-white hover:bg-red-50">📤 Giderler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-4 px-3 text-center text-red-600 font-bold">
                          {monthData.expense > 0 ? `-₺${(monthData.expense / 1000).toFixed(0)}K` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Fark Row */}
                    <tr className="bg-gradient-to-r from-accent-teal/10 to-accent-cyan/10 hover:from-accent-teal/20 hover:to-accent-cyan/20 transition-colors border-t-2 border-accent-teal">
                      <td className="py-4 px-4 font-extrabold text-slate-900 sticky left-0 bg-gradient-to-r from-accent-teal/10 to-accent-cyan/10">📊 Net Kar</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td
                          key={index}
                          className={`py-4 px-3 text-center font-extrabold ${
                            monthData.difference > 0
                              ? 'text-accent-teal'
                              : monthData.difference < 0
                              ? 'text-red-700'
                              : 'text-gray-500'
                          }`}
                        >
                          {monthData.difference !== 0 ? `₺${(monthData.difference / 1000).toFixed(0)}K` : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Toplam Gelir</p>
                  <p className="text-lg font-bold text-green-600">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.income, 0) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Toplam Gider</p>
                  <p className="text-lg font-bold text-red-600">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.expense, 0) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Net Fark</p>
                  <p className={`text-lg font-bold ${
                    (dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.difference, 0) || 0) > 0
                      ? 'text-green-600'
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