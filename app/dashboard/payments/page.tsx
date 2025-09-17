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

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ödeme Talimatları</h1>
            <p className="text-gray-600">
              {user.role === 'academician'
                ? 'Ödeme talimatlarınızı görüntüleyin'
                : 'Ödeme talimatlarını görüntüleyin ve yönetin'
              }
            </p>
          </div>

          {(user.role === 'admin' || user.role === 'finance_officer') && (
            <Link
              href="/dashboard/payments/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ödeme Talimatı
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-600 bg-yellow-100 rounded p-1" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Bekliyor</p>
                <p className="text-lg font-bold text-yellow-600">{statusStats.pending || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-blue-600 bg-blue-100 rounded p-1" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Onaylandı</p>
                <p className="text-lg font-bold text-blue-600">{statusStats.approved || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-purple-600 bg-purple-100 rounded p-1" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">İşleniyor</p>
                <p className="text-lg font-bold text-purple-600">{statusStats.processing || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-600 bg-green-100 rounded p-1" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Tamamlandı</p>
                <p className="text-lg font-bold text-green-600">{statusStats.completed || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 text-indigo-600 bg-indigo-100 rounded p-1" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">Toplam</p>
                <p className="text-lg font-bold text-indigo-600">
                  ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Kişi adı, talimat no veya not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="processing">İşleniyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="rejected">Reddedildi</option>
              </select>
            </div>

            <div className="text-sm text-gray-500 flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              {filteredPayments.length} talimat görüntüleniyor
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talimat No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notlar
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.instruction_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.user.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {payment.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₺{payment.total_amount.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.items.length} kalem
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(payment.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        {payment.approved_at && (
                          <div className="text-xs text-gray-500">
                            Onay: {new Date(payment.approved_at).toLocaleDateString('tr-TR')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {payment.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/payments/${payment.id}` as any}
                            className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {(user.role === 'admin' || user.role === 'finance_officer') && (
                            <>
                              <Link
                                href={`/dashboard/payments/${payment.id}/edit`}
                                className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>

                              <button
                                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4" />
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
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter ? 'Ödeme talimatı bulunamadı' : 'Henüz ödeme talimatı yok'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk ödeme talimatını oluşturmak için butona tıklayın'
                }
              </p>
              {(user.role === 'admin' || user.role === 'finance_officer') && !searchTerm && !statusFilter && (
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
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