'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  User,
  ArrowLeft,
  Shield,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  PiggyBank,
  FileText,
  Building
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface UserData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager'
  phone: string | null
  iban: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Balance {
  id: string
  available_amount: number
  debt_amount: number
  reserved_amount: number
}

interface Project {
  id: string
  name: string
  code: string
  status: string
  share_percentage: number
  is_lead: boolean
}

export default function UserDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userDataLocal = localStorage.getItem('user')

    if (!token || !userDataLocal) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userDataLocal)
      setUser(parsedUser)

      // Only admin can view other users
      if (parsedUser.role !== 'admin') {
        router.push('/dashboard/users')
        return
      }

      fetchUserData(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, userId])

  const fetchUserData = async (token: string) => {
    try {
      // Fetch user details
      const userResponse = await fetch(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const userResult = await userResponse.json()

      if (userResult.success) {
        setUserData(userResult.data.user)
      }

      // Fetch user balance
      const balanceResponse = await fetch(`/api/balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const balanceResult = await balanceResponse.json()

      if (balanceResult.success) {
        const userBalance = balanceResult.data.balances.find((b: any) => b.user.id === userId)
        if (userBalance) {
          setBalance({
            id: userBalance.id,
            available_amount: userBalance.available_amount,
            debt_amount: userBalance.debt_amount,
            reserved_amount: userBalance.reserved_amount
          })
        }
      }

      // Fetch user projects
      const projectsResponse = await fetch(`/api/projects?created_by=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const projectsResult = await projectsResponse.json()

      if (projectsResult.success) {
        setProjects(projectsResult.data.projects || [])
      }

    } catch (err) {
      console.error('Failed to fetch user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          color: 'bg-red-100 text-red-800',
          icon: Shield,
          text: 'Yönetici'
        }
      case 'manager':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: Building2,
          text: 'Mali İşler'
        }
      case 'manager':
        return {
          color: 'bg-green-100 text-green-800',
          icon: GraduationCap,
          text: 'Akademisyen'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: User,
          text: role
        }
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

  if (!userData) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı Bulunamadı</h3>
          <p className="text-gray-600 mb-4">İstenen kullanıcı bulunamadı.</p>
          <Link
            href="/dashboard/users"
            className="text-blue-600 hover:text-blue-800"
          >
            Kullanıcılar listesine dön
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const roleInfo = getRoleInfo(userData.role)
  const RoleIcon = roleInfo.icon

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/users"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Eye className="h-7 w-7 mr-3 text-blue-600" />
                Kullanıcı Detayları
              </h1>
              <p className="text-gray-600">{userData.full_name}</p>
            </div>
          </div>
          <Link
            href={`/dashboard/users/${userId}/edit` as any}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Link>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="flex items-center space-x-6">
              <div className="h-20 w-20 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {userData.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{userData.full_name}</h2>
                <p className="text-gray-600">{userData.email}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                    <RoleIcon className="h-4 w-4 mr-1" />
                    {roleInfo.text}
                  </span>
                  {userData.is_active ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <XCircle className="h-4 w-4 mr-1" />
                      Pasif
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                İletişim Bilgileri
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">E-posta</p>
                  <p className="text-gray-900">{userData.email}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Telefon</p>
                  <p className="text-gray-900">{userData.phone || 'Belirtilmemiş'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">IBAN</p>
                  <p className="text-gray-900">{userData.iban || 'Belirtilmemiş'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <PiggyBank className="h-5 w-5 mr-2 text-green-600" />
                Bakiye Bilgileri
              </h3>
            </div>
            <div className="p-6">
              {balance ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Mevcut Bakiye</span>
                    <span className="text-lg font-semibold text-green-600">
                      ₺{balance.available_amount.toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Borç Tutarı</span>
                    <span className="text-lg font-semibold text-red-600">
                      ₺{balance.debt_amount.toLocaleString('tr-TR')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Rezerve Tutar</span>
                    <span className="text-lg font-semibold text-yellow-600">
                      ₺{balance.reserved_amount.toLocaleString('tr-TR')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Bakiye bilgisi bulunamadı</p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-purple-600" />
                Hesap Bilgileri
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Oluşturulma Tarihi</p>
                <p className="text-gray-900">
                  {new Date(userData.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Son Güncelleme</p>
                <p className="text-gray-900">
                  {new Date(userData.updated_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Kullanıcı ID</p>
                <p className="text-gray-900 font-mono text-sm">{userData.id}</p>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Building className="h-5 w-5 mr-2 text-indigo-600" />
                Projeler ({projects.length})
              </h3>
            </div>
            <div className="p-6">
              {projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{project.name}</p>
                        <p className="text-sm text-gray-600">{project.code}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                        {project.is_lead && (
                          <p className="text-xs text-blue-600 mt-1">Lider</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {projects.length > 5 && (
                    <p className="text-sm text-gray-500 text-center pt-2">
                      ve {projects.length - 5} proje daha...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Henüz proje bulunmuyor</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}