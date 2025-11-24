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
  FolderOpen
} from 'lucide-react'
import { StatCardSkeleton, ProgressBarSkeleton, MonthlyTableSkeleton, Skeleton } from '@/components/ui/skeleton'

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
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Hoş geldiniz, {user.full_name}
              </h1>
              <p className="text-gray-600 mt-1">
                {user.role === 'admin' && 'Sistem yöneticisi paneli'}
                {user.role === 'manager' && 'Mali işler paneli'}
                {user.role === 'manager' && 'Akademisyen paneli'}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {/* TTO Dashboard (Admin Only) */}
        {user.role === 'admin' && dashboardMetrics && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">TTO Finansal Dashboard</h2>
            </div>

            {/* Main 6 Cards - Compact Design */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* 1. Total Budget */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-700">Toplam Bütçe</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      ₺{dashboardMetrics.total_budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 2. Invoiced (Kesilen Fatura) */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg shadow-sm p-4 border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-indigo-700">Kesilen Fatura</p>
                    <p className="text-xl font-bold text-indigo-900 mt-1">
                      ₺{dashboardMetrics.total_invoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 3. Collected (Tahsil Edilen) - GREEN */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-green-700">Tahsil Edilen</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      ₺{dashboardMetrics.total_collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 4. Outstanding (Açık Bakiye) - ORANGE */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg shadow-sm p-4 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-orange-700">Açık Bakiye</p>
                    <p className="text-xl font-bold text-orange-900 mt-1">
                      ₺{dashboardMetrics.total_outstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-orange-600 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 5. Remaining to Invoice (Kesilecek Fatura) - RED */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-sm p-4 border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-red-700">Kesilecek Fatura</p>
                    <p className="text-xl font-bold text-red-900 mt-1">
                      ₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* 6. TTO Commission */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-purple-700">TTO Payı</p>
                    <p className="text-xl font-bold text-purple-900 mt-1">
                      ₺{dashboardMetrics.total_commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm p-4 border">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    Kesilen Fatura: ₺{dashboardMetrics.total_invoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="font-medium text-gray-700">
                    Kalan Bakiye: ₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                    style={{ width: `${Math.min(dashboardMetrics.progress_percentage, 100)}%` }}
                  >
                    {dashboardMetrics.progress_percentage > 10 && (
                      <span>%{dashboardMetrics.progress_percentage.toFixed(1)}</span>
                    )}
                  </div>
                  {dashboardMetrics.progress_percentage <= 10 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                      %{dashboardMetrics.progress_percentage.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Year Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dashboardMetrics.year_breakdown.map((yearData) => (
                <div key={yearData.year} className="bg-white rounded-lg shadow-sm p-4 border">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{yearData.year}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Kesilecek Fatura:</span>
                      <span className="text-sm font-bold text-red-600">
                        ₺{yearData.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">TTO Payı:</span>
                      <span className="text-sm font-bold text-purple-600">
                        ₺{yearData.commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly Income-Expense Table */}
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aylık Gelir-Gider Tablosu</h3>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-2 text-left font-semibold text-gray-700 bg-gray-50">Kategori</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Oca</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Şub</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Mar</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Nis</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">May</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Haz</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Tem</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Ağu</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Eyl</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Eki</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Kas</th>
                      <th className="py-3 px-2 text-center font-semibold text-gray-700 bg-gray-50">Ara</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Gelirler Row */}
                    <tr className="border-b border-gray-100 hover:bg-green-50">
                      <td className="py-3 px-2 font-medium text-gray-900">Gelirler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-3 px-2 text-center text-green-600 font-medium">
                          {monthData.income > 0 ? `₺${(monthData.income / 1000).toFixed(0)}K` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Giderler Row */}
                    <tr className="border-b border-gray-100 hover:bg-red-50">
                      <td className="py-3 px-2 font-medium text-gray-900">Giderler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="py-3 px-2 text-center text-red-600 font-medium">
                          {monthData.expense > 0 ? `₺${(monthData.expense / 1000).toFixed(0)}K` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Fark Row */}
                    <tr className="border-b border-gray-200 hover:bg-blue-50 bg-blue-50">
                      <td className="py-3 px-2 font-bold text-gray-900">Fark</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td
                          key={index}
                          className={`py-3 px-2 text-center font-bold ${
                            monthData.difference > 0
                              ? 'text-green-700'
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