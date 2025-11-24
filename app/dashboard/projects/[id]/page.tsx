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
  Crown,
  Download,
  CheckCircle,
  Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import PersonBadge from '@/components/ui/person-badge'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
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
  referee_payment: number
  referee_payer: 'company' | 'client' | null
  stamp_duty_payer: 'company' | 'client' | null
  stamp_duty_amount: number
  contract_path: string | null
  has_assignment_permission: boolean
  assignment_document_path: string | null
  sent_to_referee: boolean
  referee_approved: boolean
  referee_approval_date: string | null
  representatives: Array<{
    id: string
    role: 'project_leader' | 'researcher'
    user_id?: string | null
    personnel_id?: string | null
    user?: {
      id: string
      full_name: string
      email: string
    } | null
    personnel?: {
      id: string
      full_name: string
      email: string
    } | null
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
  const [approvingReferee, setApprovingReferee] = useState(false)
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

  const handleApproveReferee = async () => {
    if (!project || !user) return

    setApprovingReferee(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${project.id}/approve-referee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        // Refresh project data
        await fetchProject(token!, project.id)
      } else {
        alert('Hata: ' + (data.error || 'Hakem onayı işlenirken bir hata oluştu'))
      }
    } catch (err) {
      console.error('Failed to approve referee:', err)
      alert('Bir hata oluştu')
    } finally {
      setApprovingReferee(false)
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

            {/* Hakem Heyeti Onayı Butonu */}
            {(user.role === 'admin' || user.role === 'manager') &&
             project.sent_to_referee &&
             !project.referee_approved && (
              <button
                onClick={handleApproveReferee}
                disabled={approvingReferee}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {approvingReferee ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Hakem Onayını İşaretle
                  </>
                )}
              </button>
            )}

            {(user.role === 'admin' || user.role === 'manager') && project.status === 'active' && (
              <Link
                href={`/dashboard/projects/${project.id}/edit` as any}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Düzenle
              </Link>
            )}
            {(user.role === 'admin' || user.role === 'manager') && project.status !== 'active' && (
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

              <div className="flex items-center text-sm">
                <DollarSign className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-gray-600">Hakem Heyeti:</span>
                <span className="ml-2 font-medium">
                  {project.referee_payer === 'company' ? 'Şirket' : 'Karşı Taraf'}
                  {project.referee_payer === 'company' && ` (₺${project.referee_payment.toLocaleString('tr-TR')})`}
                </span>
              </div>

              {project.stamp_duty_payer && (
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Damga Vergisi:</span>
                  <span className="ml-2 font-medium">
                    {project.stamp_duty_payer === 'company' ? 'Şirket' : 'Karşı Taraf'}
                    {project.stamp_duty_payer === 'company' && ` (₺${project.stamp_duty_amount.toLocaleString('tr-TR')})`}
                  </span>
                </div>
              )}

              {/* Hakem Heyeti Durumu */}
              {project.sent_to_referee && (
                <div className="flex items-center text-sm">
                  {project.referee_approved ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-500 mr-3" />
                  )}
                  <span className="text-gray-600">Hakem Heyeti:</span>
                  <span className={`ml-2 font-medium ${project.referee_approved ? 'text-green-600' : 'text-yellow-600'}`}>
                    {project.referee_approved
                      ? `Onaylandı (${new Date(project.referee_approval_date!).toLocaleDateString('tr-TR')})`
                      : 'Onay Bekliyor'}
                  </span>
                </div>
              )}

              {/* Sözleşme Belgesi */}
              {project.contract_path && (
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Sözleşme:</span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${project.contract_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-medium text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    İndir
                  </a>
                </div>
              )}

              {/* Görevlendirme İzni */}
              <div className="flex items-center text-sm">
                {project.has_assignment_permission ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-3" />
                ) : (
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                )}
                <span className="text-gray-600">Görevlendirme İzni:</span>
                <span className={`ml-2 font-medium ${project.has_assignment_permission ? 'text-green-600' : 'text-gray-600'}`}>
                  {project.has_assignment_permission ? 'Var' : 'Yok'}
                </span>
              </div>

              {/* Görevlendirme Yazısı */}
              {project.has_assignment_permission && project.assignment_document_path && (
                <div className="flex items-center text-sm">
                  <FileText className="h-4 w-4 text-gray-400 mr-3" />
                  <span className="text-gray-600">Görevlendirme Yazısı:</span>
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${project.assignment_document_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-medium text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    İndir
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Representatives */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Proje Temsilcileri</h2>
            <div className="space-y-3">
              {project.representatives.map((rep) => {
                const person = rep.user || rep.personnel
                const personType = rep.user_id ? 'user' : 'personnel'
                const personName = person?.full_name || 'Bilinmiyor'
                const personEmail = person?.email || ''

                return (
                  <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-white">
                          {personName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {personName}
                          {rep.role === 'project_leader' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                          <PersonBadge type={personType} />
                        </p>
                        <p className="text-sm text-gray-600">{personEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${rep.role === 'project_leader' ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {rep.role === 'project_leader' ? 'Proje Yürütücüsü' : 'Araştırmacı'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Incomes */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Son Gelirler</h2>
            <Link
              href={`/dashboard/incomes?project_id=${project.id}` as any}
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