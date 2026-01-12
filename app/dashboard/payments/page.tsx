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
  AlertTriangle,
  Download
} from 'lucide-react'
import { StatCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { usePayments } from '@/hooks/use-payments'

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
  } | null
  personnel: {
    id: string
    full_name: string
    email: string
    iban: string
  } | null
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
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const router = useRouter()

  // React Query hooks - 5 dakika cache
  const { data: payments = [], isLoading: paymentsLoading } = usePayments()

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('token')

      // Get settings from localStorage
      const savedSettings = localStorage.getItem('systemSettings')
      let banking = {
        company_iban: '',
        bank_name: 'HALKBANK',
        company_vkn: '',
        company_name: ''
      }

      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        banking = {
          company_iban: settings.banking?.company_iban || '',
          bank_name: settings.banking?.bank_name || 'HALKBANK',
          company_vkn: settings.company?.tax_number || '',
          company_name: settings.company?.name || ''
        }
      }

      // Check if required settings are configured
      if (!banking.company_iban || !banking.company_vkn) {
        alert('Excel export için şirket IBAN ve VKN bilgileri gereklidir. Lütfen Ayarlar sayfasından banka bilgilerini doldurun.')
        setExporting(false)
        return
      }

      const response = await fetch('/api/reports/export/payment-instructions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          banking
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.detail || 'Export failed')
      }

      const contentDisposition = response.headers.get('content-disposition')
      let filename = `odeme_talimati_halkbank_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Export error:', error)
      alert(error.message || 'Excel dışa aktarma başarısız oldu')
    } finally {
      setExporting(false)
    }
  }

  // Sadece user kontrolü - data fetching React Query'de
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const filteredPayments = payments.filter(payment => {
    const recipientName = payment.user?.full_name || payment.personnel?.full_name || ''
    const matchesSearch = recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      case 'completed':
        return {
          color: 'bg-teal-100 text-teal-800',
          icon: CheckCircle,
          text: 'Tamamlandı'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          text: 'İptal Edildi'
        }
      default:
        return {
          color: 'bg-slate-100 text-slate-800',
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

  if (paymentsLoading || !user) {
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Ödeme Talimatları</h1>
              <p className="text-sm text-slate-600">
                {user.role === 'manager'
                  ? 'Ödeme talimatlarınızı görüntüleyin'
                  : 'Ödeme talimatlarını görüntüleyin ve yönetin'
                }
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                disabled={exporting}
                className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-semibold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {exporting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exporting ? 'İndiriliyor...' : 'Dışarı Aktar'}
              </button>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Ödeme Talimatı
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Bekliyor</p>
            <p className="text-lg font-bold text-yellow-600">{statusStats.pending || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Tamamlandı</p>
            <p className="text-lg font-bold text-teal-600">{statusStats.completed || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">İptal Edildi</p>
            <p className="text-lg font-bold text-red-600">{statusStats.rejected || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Toplam Tutar</p>
            <p className="text-lg font-bold text-slate-900">
              ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Kişi adı, talimat no veya not ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Bekliyor</option>
                <option value="completed">Tamamlandı</option>
                <option value="rejected">İptal Edildi</option>
              </select>
            </div>

            <div className="col-span-full text-sm text-slate-700">
              {filteredPayments.length} talimat görüntüleniyor
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Talimat No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Alıcı
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Tutar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                    Notlar
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-900 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredPayments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-teal-600">
                          {payment.instruction_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {payment.user?.full_name || payment.personnel?.full_name || '-'}
                          </div>
                          <div className="text-xs font-medium text-slate-500">
                            {payment.user?.email || payment.personnel?.email || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-900">
                          ₺{payment.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <div className="text-center py-12 px-6">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {searchTerm || statusFilter ? 'Ödeme talimatı bulunamadı' : 'Henüz ödeme talimatı yok'}
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                {searchTerm || statusFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk ödeme talimatını oluşturmak için butona tıklayın'
                }
              </p>
              {(user.role === 'admin' || user.role === 'manager') && !searchTerm && !statusFilter && (
                <Link
                  href="/dashboard/payments/new"
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
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