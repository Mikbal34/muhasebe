'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Building2,
  Users,
  Calendar,
  DollarSign,
  Edit,
  ArrowLeft,
  Wallet,
  FileText,
  TrendingUp,
  User,
  Crown
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface Project {
  id: string
  code: string
  name: string
  budget: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  created_by_user: {
    full_name: string
  }
  representatives: Array<{
    id: string
    share_percentage: number
    is_lead: boolean
    user: {
      id: string
      full_name: string
      email: string
    }
  }>
  incomes?: Array<{
    id: string
    gross_amount: number
    net_amount: number
    vat_amount: number
    income_date: string
    description: string
    created_at: string
  }>
}

export default function ProjectDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
      fetchProject(token, params.id as string)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchProject = async (token: string, projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setProject(data.data.project)
      } else {
        router.push('/dashboard/projects')
      }
    } catch (err) {
      console.error('Failed to fetch project:', err)
      router.push('/dashboard/projects')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif'
      case 'completed': return 'Tamamlandı'
      case 'cancelled': return 'İptal Edildi'
      default: return status
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

  if (!project) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Proje bulunamadı</h3>
          <Link
            href="/dashboard/projects"
            className="text-blue-600 hover:text-blue-500"
          >
            Projeler listesine dön
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const totalIncome = project.incomes?.reduce((sum, income) => sum + (income.gross_amount || 0), 0) || 0
  const totalNetIncome = project.incomes?.reduce((sum, income) => sum + (income.net_amount || 0), 0) || 0

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/projects"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">{project.code}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(project.status)}`}>
              {getStatusText(project.status)}
            </span>

            {(user.role === 'admin' || user.role === 'finance_officer') && project.status === 'active' && (
              <Link
                href={`/dashboard/projects/${project.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </Link>
            )}
            {(user.role === 'admin' || user.role === 'finance_officer') && project.status !== 'active' && (
              <div className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed">
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </div>
            )}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Bütçe</p>
                <p className="text-2xl font-bold text-blue-600">
                  ₺{project.budget.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                <p className="text-2xl font-bold text-green-600">
                  ₺{totalIncome.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Gelir</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₺{totalNetIncome.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-indigo-600 bg-indigo-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Temsilci</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {project.representatives.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proje Bilgileri</h2>
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Başlangıç:</span>
                <span className="ml-2 font-medium">
                  {new Date(project.start_date).toLocaleDateString('tr-TR')}
                </span>
              </div>

              {project.end_date && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Bitiş:</span>
                  <span className="ml-2 font-medium">
                    {new Date(project.end_date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}

              <div className="flex items-center text-sm">
                <User className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Oluşturan:</span>
                <span className="ml-2 font-medium">
                  {project.created_by_user.full_name}
                </span>
              </div>

              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Oluşturulma:</span>
                <span className="ml-2 font-medium">
                  {new Date(project.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </div>

          {/* Representatives */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proje Temsilcileri</h2>
            <div className="space-y-3">
              {project.representatives.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-white">
                        {rep.user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 flex items-center">
                        {rep.user.full_name}
                        {rep.is_lead && (
                          <Crown className="h-4 w-4 text-yellow-500 ml-1" title="Proje Lideri" />
                        )}
                      </p>
                      <p className="text-sm text-gray-600">{rep.user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">%{rep.share_percentage}</p>
                    <p className="text-xs text-gray-500">Pay</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Incomes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Son Gelirler</h2>
            <Link
              href={`/dashboard/incomes?project_id=${project.id}`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Tümünü gör
            </Link>
          </div>

          {project.incomes && project.incomes.length > 0 ? (
            <div className="space-y-3">
              {project.incomes
                .sort((a, b) => {
                  const dateA = new Date(a.created_at || a.income_date).getTime()
                  const dateB = new Date(b.created_at || b.income_date).getTime()
                  return dateB - dateA
                })
                .slice(0, 5)
                .map((income) => (
                <div key={income.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{income.description || 'Gelir'}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(income.income_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ₺{income.gross_amount.toLocaleString('tr-TR')}
                    </p>
                    <p className="text-sm text-gray-600">
                      Net: ₺{income.net_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Henüz gelir kaydı yok</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}