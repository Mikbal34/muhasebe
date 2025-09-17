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
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
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

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
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
      setUser(JSON.parse(userData))
      fetchDashboardStats(token)
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

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // Different stat cards based on user role
  const statCards = user.role === 'academician' ? [
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
                {user.role === 'finance_officer' && 'Mali işler paneli'}
                {user.role === 'academician' && 'Akademisyen paneli'}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.textColor}`}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Hızlı İşlemler
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role !== 'academician' && (
              <>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <Building2 className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium">Yeni Proje</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <Wallet className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium">Gelir Ekle</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <FileText className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium">Ödeme Talimatı</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <TrendingUp className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-sm font-medium">Rapor Oluştur</span>
                </button>
              </>
            )}
            {user.role === 'academician' && (
              <>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <Building2 className="h-5 w-5 text-blue-600 mr-3" />
                  <span className="text-sm font-medium">Projelerim</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <PiggyBank className="h-5 w-5 text-green-600 mr-3" />
                  <span className="text-sm font-medium">Bakiye</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <FileText className="h-5 w-5 text-purple-600 mr-3" />
                  <span className="text-sm font-medium">Ödemelerim</span>
                </button>
                <button className="flex items-center p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                  <Wallet className="h-5 w-5 text-indigo-600 mr-3" />
                  <span className="text-sm font-medium">Gelir Geçmişi</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Son Aktiviteler
          </h2>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <div className="h-2 w-2 bg-blue-600 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Sistem başarıyla kuruldu ve test edildi
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-green-50 rounded-lg">
              <div className="h-2 w-2 bg-green-600 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Tüm API endpoint'ları aktif
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleString('tr-TR')}
                </p>
              </div>
            </div>

            <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
              <div className="h-2 w-2 bg-yellow-600 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Frontend arayüzü geliştiriliyor
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}