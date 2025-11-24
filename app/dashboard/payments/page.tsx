'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { StatCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PaymentInstruction {
  id: string
  instruction_number: string
  user_id: string
  total_amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  notes: string | null
  created_at: string
  approved_at: string | null
  user: {
    id: string
    full_name: string
    email: string
    iban: string
  }
  created_by_user: {
    full_name: string
  }
  items: Array<{
    id: string
    amount: number
    description: string | null
    income_distribution: {
      id: string
      amount: number
      income: {
        id: string
        description: string
        project: {
          id: string
          code: string
          name: string
        }
      }
    } | null
  }>
}

export default function PaymentsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [payments, setPayments] = useState<PaymentInstruction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
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
      fetchPayments(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchPayments = async (token: string) => {
    try {
      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setPayments(data.data.payments || [])
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.instruction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || payment.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          text: 'Bekliyor'
        }
      case 'approved':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle,
          text: 'Onaylandı'
        }
      case 'processing':
        return {
          color: 'bg-purple-100 text-purple-800',
          icon: AlertTriangle,
          text: 'İşleniyor'
        }
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          text: 'Tamamlandı'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          text: 'Reddedildi'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Clock,
          text: status
        }
    }
  }

  const statusStats = payments.reduce((acc, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.total_amount, 0)

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>

          {/* Stat Cards Skeleton - 5 cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 border">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-6 rounded" />
                  <div className="ml-3 flex-1">
                    <Skeleton className="h-3 w-16 mb-1" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>

          {/* Table Skeleton */}
          <TableSkeleton rows={8} columns={6} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Ödeme Talimatları</h1>
                <p className="text-slate-600 font-medium">
                  {user.role === 'manager'
                    ? 'Ödeme talimatlarınızı görüntüleyin'
                    : 'Ödeme talimatlarını görüntüleyin ve yönetin'
                  }
                </p>
              </div>
            </div>

            {(user.role === 'admin' || user.role === 'manager') && (
              <Link
                href="/dashboard/payments/new"
                className="inline-flex items-center px-5 py-3 border-2 border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-5 w-5 mr-2" />
                Yeni Ödeme Talimatı
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-yellow-500 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Bekliyor</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{statusStats.pending || 0}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-blue-500 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Onaylandı</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{statusStats.approved || 0}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-purple-500 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">İşleniyor</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{statusStats.processing || 0}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border border-slate-200 hover:border-accent-teal group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tamamlandı</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{statusStats.completed || 0}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-5 border-2 border-indigo-400 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-wide">Toplam Tutar</p>
                <p className="text-xl font-bold text-white mt-1">
                  ₺{(totalAmount / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="h-10 w-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-indigo-100 font-medium mt-2">
              ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Filters - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-5 w-5" />
              <input
                type="text"
                placeholder="Kişi adı, talimat no veya not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-5 w-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="processing">İşleniyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </div>

            <div className="col-span-full flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center text-sm text-slate-700 font-medium">
                <FileText className="h-5 w-5 mr-2 text-purple-500" />
                {filteredPayments.length} talimat görüntüleniyor
              </div>
            </div>
          </div>
        </div>

        {/* Payments Table - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Talimat No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Alıcı
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notlar
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-900 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPayments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <tr key={payment.id} className="hover:bg-purple-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-purple-600">
                          {payment.instruction_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {payment.user.full_name}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {payment.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">
                          ₺{payment.total_amount.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                          {payment.items.length} kalem
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {new Date(payment.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        {payment.approved_at && (
                          <div className="text-xs font-medium text-emerald-600">
                            Onay: {new Date(payment.approved_at).toLocaleDateString('tr-TR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700 max-w-xs truncate">
                          {payment.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/payments/${payment.id}` as any}
                            className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-110"
                            title="Görüntüle"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>

                          {(user.role === 'admin' || user.role === 'manager') && (
                            <>
                              <Link
                                href={`/dashboard/payments/${payment.id}/edit` as any}
                                className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Düzenle"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>

                              <button
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-110"
                                title="Sil"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredPayments.length === 0 && (
            <div className="bg-gradient-to-br from-white to-slate-50 text-center py-16 px-6">
              <div className="h-20 w-20 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FileText className="h-10 w-10 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter ? 'Ödeme talimatı bulunamadı' : 'Henüz ödeme talimatı yok'}
              </h3>
              <p className="text-slate-600 font-medium mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk ödeme talimatını oluşturmak için butona tıklayın'
                }
              </p>
              {(user.role === 'admin' || user.role === 'manager') && !searchTerm && !statusFilter && (
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center px-6 py-3 border-2 border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Yeni Ödeme Talimatı
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}