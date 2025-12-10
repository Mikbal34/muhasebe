'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  CreditCard,
  IdCard,
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Briefcase,
  GraduationCap,
  TrendingUp,
  FolderOpen
} from 'lucide-react'

interface CurrentUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Personnel {
  id: string
  full_name: string
  email: string
  phone: string | null
  iban: string | null
  tc_no: string | null
  notes: string | null
  is_active: boolean
  title: string | null
  gender: string | null
  start_date: string | null
  faculty: string | null
  department: string | null
  university: string | null
  created_at: string
}

interface ProjectEarning {
  project_id: string
  project_code: string
  project_name: string
  total_amount: number
  percentage: number
}

export default function PersonnelDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [personnel, setPersonnel] = useState<Personnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [projectEarnings, setProjectEarnings] = useState<ProjectEarning[]>([])
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [totalEarnings, setTotalEarnings] = useState(0)
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

      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }

      fetchPersonnel(token)
      fetchProjectEarnings(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchPersonnel = async (token: string) => {
    try {
      const response = await fetch(`/api/personnel/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.personnel) {
        setPersonnel(data.data.personnel)
      } else {
        router.push('/dashboard/personnel')
      }
    } catch (err) {
      console.error('Failed to fetch personnel:', err)
      router.push('/dashboard/personnel')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectEarnings = async (token: string) => {
    setEarningsLoading(true)
    try {
      const response = await fetch(`/api/personnel/${params.id}/earnings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.earnings) {
        setProjectEarnings(data.data.earnings)
        setTotalEarnings(data.data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch earnings:', err)
    } finally {
      setEarningsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/personnel/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard/personnel')
      } else {
        alert(data.error || 'Silme işlemi başarısız')
      }
    } catch (err) {
      alert('Bir hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !user || !personnel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === 'admin'

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/personnel"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personel Detayı</h1>
              <p className="text-gray-600">{personnel.full_name}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/dashboard/personnel/${params.id}/edit`}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
            >
              <Edit className="h-4 w-4 mr-2" />
              Düzenle
            </Link>
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50"
              >
                {deleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Sil
              </button>
            )}
          </div>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg border ${personnel.is_active ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <div className="flex items-center">
            {personnel.is_active ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Aktif Personel</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Pasif Personel</span>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-teal-600" />
              Kişisel Bilgiler
            </h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                  <p className="text-gray-900 font-medium">{personnel.full_name}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">E-posta</p>
                  <p className="text-gray-900">{personnel.email}</p>
                </div>
              </div>

              {personnel.phone && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <p className="text-gray-900">{personnel.phone}</p>
                  </div>
                </div>
              )}

              {personnel.tc_no && (
                <div className="flex items-start">
                  <IdCard className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">TC Kimlik No</p>
                    <p className="text-gray-900 font-mono">{personnel.tc_no}</p>
                  </div>
                </div>
              )}

              {personnel.gender && (
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cinsiyet</p>
                    <p className="text-gray-900">
                      {personnel.gender === 'male' ? 'Erkek' : personnel.gender === 'female' ? 'Kadın' : 'Diğer'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Work Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-teal-600" />
              İş Bilgileri
            </h2>

            <div className="space-y-4">
              {personnel.title && (
                <div className="flex items-start">
                  <GraduationCap className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unvan</p>
                    <p className="text-gray-900">{personnel.title}</p>
                  </div>
                </div>
              )}

              {personnel.university && (
                <div className="flex items-start">
                  <Building2 className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Üniversite</p>
                    <p className="text-gray-900">{personnel.university}</p>
                  </div>
                </div>
              )}

              {personnel.faculty && (
                <div className="flex items-start">
                  <Building2 className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fakülte</p>
                    <p className="text-gray-900">{personnel.faculty}</p>
                  </div>
                </div>
              )}

              {personnel.department && (
                <div className="flex items-start">
                  <Building2 className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bölüm</p>
                    <p className="text-gray-900">{personnel.department}</p>
                  </div>
                </div>
              )}

              {personnel.start_date && (
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Başlangıç Tarihi</p>
                    <p className="text-gray-900">
                      {new Date(personnel.start_date).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-teal-600" />
              Finansal Bilgiler
            </h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">IBAN</p>
                  <p className="text-gray-900 font-mono text-sm">
                    {personnel.iban || <span className="text-gray-400 italic">Belirtilmemiş</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Earnings */}
          <div className="bg-white rounded-lg shadow-sm border p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
              Proje Bazlı Kazançlar
            </h2>

            {earningsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="ml-2 text-gray-600">Yükleniyor...</span>
              </div>
            ) : projectEarnings.length > 0 ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-800 font-medium">Toplam Kazanç</span>
                    <span className="text-teal-900 font-bold text-lg">
                      {totalEarnings.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                </div>

                {/* Earnings Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proje Kodu
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proje Adı
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kazanç
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Oran
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {projectEarnings.map((earning) => (
                        <tr key={earning.project_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <FolderOpen className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{earning.project_code}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{earning.project_name}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-emerald-600">
                              {earning.total_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                              %{earning.percentage.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Henüz proje kazancı bulunmuyor</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-teal-600" />
              Notlar
            </h2>

            {personnel.notes ? (
              <p className="text-gray-700 whitespace-pre-wrap">{personnel.notes}</p>
            ) : (
              <p className="text-gray-400 italic">Not bulunmuyor</p>
            )}
          </div>
        </div>

        {/* Meta Information */}
        <div className="bg-gray-50 rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Kayıt Tarihi: {personnel.created_at ? new Date(personnel.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : '-'}</span>
            </div>
            <div>
              <span className="font-mono text-xs text-gray-400">ID: {personnel.id}</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
