'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Shield,
  Building2
} from 'lucide-react'
import { StatCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useUsers, useInvalidateUsers } from '@/hooks/use-users'

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
  balance?: {
    id: string
    available_amount: number
    debt_amount: number
    reserved_amount: number
  }
  project_count?: number
  payment_count?: number
}

export default function UsersPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const router = useRouter()

  // React Query hooks - 5 dakika cache
  const { data: users = [], isLoading: usersLoading } = useUsers()
  const invalidateUsers = useInvalidateUsers()

  // Sadece user kontrolü - data fetching React Query'de
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

      // Only admin can access users page
      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const filteredUsers = users.filter(userData => {
    const matchesSearch = userData.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userData.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || userData.role === roleFilter
    const matchesStatus = !statusFilter || (statusFilter === 'active' && userData.is_active) || (statusFilter === 'inactive' && !userData.is_active)
    return matchesSearch && matchesRole && matchesStatus
  })

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
          icon: User,
          text: 'Yönetici'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: User,
          text: role
        }
    }
  }

  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`${userName} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        invalidateUsers() // Cache'i invalidate et
        alert('Kullanıcı başarıyla silindi')
      } else {
        const data = await response.json()
        alert(data.message || 'Kullanıcı silinirken hata oluştu')
      }
    } catch (err) {
      console.error('Delete user error:', err)
      alert('Kullanıcı silinirken hata oluştu')
    }
  }

  if (usersLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'admin' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stat Cards Skeleton - 3 cards */}
          <StatCardSkeleton count={3} />

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={8} columns={6} />
        </div>
      </DashboardLayout>
    )
  }

  if (user.role !== 'admin') {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Yetkisi Yok</h3>
          <p className="text-gray-600">Bu sayfaya sadece yöneticiler erişebilir.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Kullanıcı Yönetimi</h1>
              <p className="text-sm text-slate-600">Sistem kullanıcılarını görüntüleyin ve yönetin</p>
            </div>

            <Link
              href="/dashboard/users/new"
              className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kullanıcı
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-xs text-slate-600 uppercase mb-1">Toplam Kullanıcı</p>
            <p className="text-lg font-bold text-slate-900">
              {users.length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-xs text-slate-600 uppercase mb-1">Yöneticiler</p>
            <p className="text-lg font-bold text-slate-900">
              {roleStats.manager || 0}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <p className="text-xs text-slate-600 uppercase mb-1">Admin</p>
            <p className="text-lg font-bold text-slate-900">
              {roleStats.admin || 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Ad, soyad veya e-posta ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tüm Roller</option>
                <option value="admin">Yönetici (Admin)</option>
                <option value="manager">Yönetici</option>
              </select>
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>

            <div className="text-sm text-gray-500 flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {filteredUsers.length} kullanıcı görüntüleniyor
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bakiye
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IBAN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((userData) => {
                  const roleInfo = getRoleInfo(userData.role)
                  const RoleIcon = roleInfo.icon

                  return (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-slate-700 rounded-lg flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-white">
                              {userData.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {userData.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {userData.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleInfo.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Mail className="h-4 w-4 text-gray-400 mr-1" />
                          {userData.email}
                        </div>
                        {userData.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 text-gray-400 mr-1" />
                            {userData.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {userData.balance ? (
                          <div>
                            <div className="text-sm font-medium text-green-600">
                              ₺{userData.balance.available_amount.toLocaleString('tr-TR')}
                            </div>
                            {userData.balance.debt_amount > 0 && (
                              <div className="text-xs text-red-600">
                                Borç: ₺{userData.balance.debt_amount.toLocaleString('tr-TR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {userData.iban ? (
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-gray-900">
                              {userData.iban.slice(0, 8)}...
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            <span className="text-sm text-red-600">Eksik</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {userData.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/users/${userData.id}` as any}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/users/${userData.id}/edit` as any}
                            className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDeleteUser(userData.id, userData.full_name)}
                            className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {searchTerm || roleFilter || statusFilter ? 'Kullanıcı bulunamadı' : 'Henüz kullanıcı yok'}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {searchTerm || roleFilter || statusFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk kullanıcıyı eklemek için butona tıklayın'
                }
              </p>
              {!searchTerm && !roleFilter && !statusFilter && (
                <Link
                  href="/dashboard/users/new"
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Kullanıcı Ekle
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}