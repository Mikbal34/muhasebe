'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Building2,
  Wallet,
  FileText,
  PiggyBank,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import {
  StatCard,
  BarChart,
  PieChart,
  LineChart,
  ProgressBar,
  ActivityTimeline
} from '@/components/ui/chart-components'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface AnalyticsData {
  projects: {
    total: number
    active: number
    completed: number
    cancelled: number
    byMonth: Array<{ month: string; count: number }>
  }
  incomes: {
    total: number
    thisMonth: number
    lastMonth: number
    byProject: Array<{ project: string; amount: number }>
    byMonth: Array<{ month: string; amount: number }>
  }
  payments: {
    total: number
    pending: number
    approved: number
    completed: number
    rejected: number
    byStatus: Array<{ status: string; count: number }>
  }
  users: {
    total: number
    byRole: Array<{ role: string; count: number }>
    activeUsers: number
  }
  balances: {
    total: number
    distributed: number
    pending: number
    topRecipients: Array<{ name: string; amount: number }>
  }
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('thisMonth')
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

      // Only admin and finance officers can view analytics
      if (parsedUser.role === 'academician') {
        router.push('/dashboard')
        return
      }

      fetchAnalyticsData(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, dateRange])

  const fetchAnalyticsData = async (token: string) => {
    try {
      // Fetch all necessary data
      const [projectsRes, incomesRes, paymentsRes, balancesRes, usersRes] = await Promise.all([
        fetch('/api/projects', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/incomes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/payments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/balances', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      const [projectsData, incomesData, paymentsData, balancesData, usersData] = await Promise.all([
        projectsRes.json(),
        incomesRes.json(),
        paymentsRes.json(),
        balancesRes.json(),
        usersRes.json()
      ])

      if (projectsData.success && incomesData.success && paymentsData.success && balancesData.success && usersData.success) {
        const projects = projectsData.data.projects || []
        const incomes = incomesData.data.incomes || []
        const payments = paymentsData.data.payments || []
        const balances = balancesData.data.balances || []
        const users = usersData.data.users || []

        // Process analytics data
        const analytics: AnalyticsData = {
          projects: {
            total: projects.length,
            active: projects.filter((p: any) => p.status === 'active').length,
            completed: projects.filter((p: any) => p.status === 'completed').length,
            cancelled: projects.filter((p: any) => p.status === 'cancelled').length,
            byMonth: getProjectsByMonth(projects)
          },
          incomes: {
            total: incomes.reduce((sum: number, i: any) => sum + (i.gross_amount || 0), 0),
            thisMonth: getThisMonthIncome(incomes),
            lastMonth: getLastMonthIncome(incomes),
            byProject: getIncomeByProject(incomes),
            byMonth: getIncomeByMonth(incomes)
          },
          payments: {
            total: payments.length,
            pending: payments.filter((p: any) => p.status === 'pending').length,
            approved: payments.filter((p: any) => p.status === 'approved').length,
            completed: payments.filter((p: any) => p.status === 'completed').length,
            rejected: payments.filter((p: any) => p.status === 'rejected').length,
            byStatus: getPaymentsByStatus(payments)
          },
          users: {
            total: users.length,
            byRole: getUsersByRole(users),
            activeUsers: users.filter((u: any) => u.is_active).length
          },
          balances: {
            total: balances.reduce((sum: number, b: any) => sum + (b.balance || 0), 0),
            distributed: balances.reduce((sum: number, b: any) => sum + (b.total_distributed || 0), 0),
            pending: balances.reduce((sum: number, b: any) => sum + (b.pending_amount || 0), 0),
            topRecipients: getTopRecipients(balances)
          }
        }

        setAnalyticsData(analytics)
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for data processing
  const getProjectsByMonth = (projects: any[]) => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const result = []
    const currentMonth = new Date().getMonth()

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      const monthProjects = projects.filter(p => {
        const projectMonth = new Date(p.created_at).getMonth()
        return projectMonth === monthIndex
      })
      result.push({
        month: months[monthIndex],
        count: monthProjects.length
      })
    }
    return result
  }

  const getIncomeByMonth = (incomes: any[]) => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const result = []
    const currentMonth = new Date().getMonth()

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12
      const monthIncomes = incomes.filter(income => {
        const incomeMonth = new Date(income.income_date).getMonth()
        return incomeMonth === monthIndex
      })
      const totalAmount = monthIncomes.reduce((sum, income) => sum + income.gross_amount, 0)
      result.push({
        month: months[monthIndex],
        amount: totalAmount
      })
    }
    return result
  }

  const getThisMonthIncome = (incomes: any[]) => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return incomes
      .filter(i => {
        const incomeDate = new Date(i.income_date)
        return incomeDate.getMonth() === currentMonth && incomeDate.getFullYear() === currentYear
      })
      .reduce((sum, i) => sum + i.gross_amount, 0)
  }

  const getLastMonthIncome = (incomes: any[]) => {
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const month = lastMonth.getMonth()
    const year = lastMonth.getFullYear()
    return incomes
      .filter(i => {
        const incomeDate = new Date(i.income_date)
        return incomeDate.getMonth() === month && incomeDate.getFullYear() === year
      })
      .reduce((sum, i) => sum + i.gross_amount, 0)
  }

  const getIncomeByProject = (incomes: any[]) => {
    const projectMap: Record<string, number> = {}
    incomes.forEach(income => {
      const projectName = income.project?.name || 'Diğer'
      projectMap[projectName] = (projectMap[projectName] || 0) + income.gross_amount
    })
    return Object.entries(projectMap)
      .map(([project, amount]) => ({ project, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  const getPaymentsByStatus = (payments: any[]) => {
    const statusMap: Record<string, number> = {
      'Bekliyor': 0,
      'Onaylandı': 0,
      'İşleniyor': 0,
      'Tamamlandı': 0,
      'Reddedildi': 0
    }

    payments.forEach(payment => {
      const status = payment.status
      if (status === 'pending') statusMap['Bekliyor']++
      else if (status === 'approved') statusMap['Onaylandı']++
      else if (status === 'processing') statusMap['İşleniyor']++
      else if (status === 'completed') statusMap['Tamamlandı']++
      else if (status === 'rejected') statusMap['Reddedildi']++
    })

    return Object.entries(statusMap).map(([status, count]) => ({ status, count }))
  }

  const getUsersByRole = (users: any[]) => {
    const roleMap: Record<string, number> = {
      'Yönetici': 0,
      'Mali İşler': 0,
      'Akademisyen': 0
    }

    users.forEach(user => {
      if (user.role === 'admin') roleMap['Yönetici']++
      else if (user.role === 'finance_officer') roleMap['Mali İşler']++
      else if (user.role === 'academician') roleMap['Akademisyen']++
    })

    return Object.entries(roleMap).map(([role, count]) => ({ role, count }))
  }

  const getTopRecipients = (balances: any[]) => {
    return balances
      .map(b => ({
        name: b.user?.full_name || 'Unknown',
        amount: b.balance || 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  if (loading || !user || !analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const incomeGrowth = analyticsData.incomes.lastMonth > 0
    ? ((analyticsData.incomes.thisMonth - analyticsData.incomes.lastMonth) / analyticsData.incomes.lastMonth) * 100
    : 0

  const recentActivity = [
    {
      id: '1',
      title: 'Yeni proje oluşturuldu',
      description: 'AI Tabanlı Sistem Geliştirme',
      date: 'Bugün',
      icon: <Building2 className="h-4 w-4 text-white" />,
      color: '#3B82F6'
    },
    {
      id: '2',
      title: 'Gelir kaydedildi',
      description: '₺150,000 tutarında',
      date: 'Dün',
      icon: <Wallet className="h-4 w-4 text-white" />,
      color: '#10B981'
    },
    {
      id: '3',
      title: 'Ödeme talimatı onaylandı',
      description: '5 akademisyen için',
      date: '2 gün önce',
      icon: <FileText className="h-4 w-4 text-white" />,
      color: '#8B5CF6'
    }
  ]

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Detaylı sistem analitiği ve raporları</p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Bugün</option>
              <option value="thisWeek">Bu Hafta</option>
              <option value="thisMonth">Bu Ay</option>
              <option value="thisYear">Bu Yıl</option>
              <option value="all">Tümü</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Toplam Gelir"
            value={`₺${analyticsData.incomes.total.toLocaleString('tr-TR')}`}
            subtitle={`Bu ay: ₺${analyticsData.incomes.thisMonth.toLocaleString('tr-TR')}`}
            icon={<DollarSign className="h-6 w-6" />}
            trend={{
              value: incomeGrowth,
              isPositive: incomeGrowth > 0
            }}
            color="green"
          />

          <StatCard
            title="Aktif Projeler"
            value={analyticsData.projects.active}
            subtitle={`Toplam: ${analyticsData.projects.total}`}
            icon={<Building2 className="h-6 w-6" />}
            color="blue"
          />

          <StatCard
            title="Bekleyen Ödemeler"
            value={analyticsData.payments.pending}
            subtitle={`Toplam: ${analyticsData.payments.total}`}
            icon={<FileText className="h-6 w-6" />}
            color="yellow"
          />

          <StatCard
            title="Aktif Kullanıcılar"
            value={analyticsData.users.activeUsers}
            subtitle={`Toplam: ${analyticsData.users.total}`}
            icon={<Users className="h-6 w-6" />}
            color="purple"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income by Month */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Aylık Gelir Trendi
            </h2>
            <BarChart
              data={analyticsData.incomes.byMonth.map(item => ({
                label: item.month,
                value: item.amount,
                color: '#10B981'
              }))}
              height={200}
              formatValue={(v) => `₺${(v / 1000).toFixed(0)}K`}
            />
          </div>

          {/* Payment Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PieChartIcon className="h-5 w-5 mr-2" />
              Ödeme Durumu Dağılımı
            </h2>
            <PieChart
              data={[
                { label: 'Bekliyor', value: analyticsData.payments.pending, color: '#F59E0B' },
                { label: 'Onaylandı', value: analyticsData.payments.approved, color: '#3B82F6' },
                { label: 'İşleniyor', value: analyticsData.payments.completed, color: '#10B981' },
                { label: 'Reddedildi', value: analyticsData.payments.rejected, color: '#EF4444' }
              ]}
              size={180}
            />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Projects by Income */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              En Yüksek Gelirli Projeler
            </h2>
            <div className="space-y-3">
              {analyticsData.incomes.byProject.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 truncate flex-1">{item.project}</span>
                    <span className="text-sm font-medium text-gray-900">
                      ₺{(item.amount / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <ProgressBar
                    value={item.amount}
                    max={analyticsData.incomes.byProject[0]?.amount || 1}
                    showPercentage={false}
                    color="#3B82F6"
                    height={6}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* User Distribution */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Kullanıcı Dağılımı
            </h2>
            <div className="space-y-4">
              {analyticsData.users.byRole.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      item.role === 'Yönetici' ? 'bg-purple-500' :
                      item.role === 'Mali İşler' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    <span className="text-sm text-gray-700">{item.role}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Toplam</span>
                <span className="text-lg font-bold text-gray-900">{analyticsData.users.total}</span>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Son Aktiviteler
            </h2>
            <ActivityTimeline items={recentActivity} />
          </div>
        </div>

        {/* Balance Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Bakiye Özeti
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Toplam Bakiye</p>
              <p className="text-2xl font-bold text-gray-900">
                ₺{analyticsData.balances.total.toLocaleString('tr-TR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Dağıtılan</p>
              <p className="text-2xl font-bold text-green-600">
                ₺{analyticsData.balances.distributed.toLocaleString('tr-TR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-600">
                ₺{analyticsData.balances.pending.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-3">En Yüksek Bakiyeli Kullanıcılar</h3>
            <div className="space-y-2">
              {analyticsData.balances.topRecipients.map((recipient, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-700">{recipient.name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₺{recipient.amount.toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}