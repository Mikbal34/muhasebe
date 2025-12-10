'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  CreditCard,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Banknote
} from 'lucide-react'

interface CurrentUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PaymentInstruction {
  id: string
  instruction_number: string
  user_id: string | null
  personnel_id: string | null
  total_amount: number
  status: 'pending' | 'completed' | 'rejected'
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
    email: string
  } | null
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

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [payment, setPayment] = useState<PaymentInstruction | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
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
      fetchPayment(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchPayment = async (token: string) => {
    try {
      const response = await fetch(`/api/payments/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.payment) {
        setPayment(data.data.payment)
      } else {
        router.push('/dashboard/payments')
      }
    } catch (err) {
      console.error('Failed to fetch payment:', err)
      router.push('/dashboard/payments')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu ödeme talimatını silmek istediğinizden emin misiniz?')) {
      return
    }

    setDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/payments/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard/payments')
      } else {
        alert(data.error || 'Silme işlemi başarısız')
      }
    } catch (err) {
      alert('Bir hata oluştu')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          text: 'Bekliyor'
        }
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          text: 'Tamamlandı'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          text: 'Reddedildi'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          text: status
        }
    }
  }

  if (loading || !user || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(payment.status)
  const recipientName = payment.user?.full_name || payment.personnel?.full_name || '-'
  const recipientEmail = payment.user?.email || payment.personnel?.email || '-'
  const recipientIban = payment.user?.iban || payment.personnel?.iban || '-'
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager'
  const canEdit = isAdminOrManager && payment.status !== 'completed'
  const canDelete = user.role === 'admin' && payment.status !== 'completed'

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/payments"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ödeme Talimatı Detayı</h1>
              <p className="text-gray-600">{payment.instruction_number}</p>
            </div>
          </div>

          {isAdminOrManager && (
            <div className="flex items-center space-x-2">
              {canEdit && (
                <Link
                  href={`/dashboard/payments/${params.id}/edit`}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Düzenle
                </Link>
              )}
              {canDelete && (
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
          )}
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg border ${statusInfo.color}`}>
          <div className="flex items-center">
            <statusInfo.icon className="h-5 w-5 mr-2" />
            <span className="font-medium">{statusInfo.text}</span>
            {payment.approved_at && payment.status === 'completed' && (
              <span className="ml-2 text-sm">
                - {new Date(payment.approved_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Items */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-teal-600" />
                Ödeme Kalemleri
              </h2>

              <div className="space-y-3">
                {payment.items.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {item.description || 'Açıklama yok'}
                        </p>
                        {item.income_distribution && (
                          <div className="mt-1 flex items-center text-sm text-gray-600">
                            <Building2 className="h-4 w-4 mr-1" />
                            <span>
                              {item.income_distribution.income.project.code} - {item.income_distribution.income.project.name}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 ml-4">
                        ₺{item.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Toplam</span>
                <span className="text-xl font-bold text-teal-600">
                  ₺{payment.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-teal-600" />
                  Notlar
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{payment.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Recipient Info */}
          <div className="space-y-6">
            {/* Recipient Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-teal-600" />
                Alıcı Bilgileri
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ad Soyad</p>
                  <p className="text-gray-900 font-medium">{recipientName}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">E-posta</p>
                  <p className="text-gray-900">{recipientEmail}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">IBAN</p>
                  <p className="text-gray-900 font-mono text-sm">{recipientIban}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Tür</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    payment.user_id ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {payment.user_id ? 'Akademisyen' : 'Personel'}
                  </span>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-teal-600" />
                Detaylar
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Oluşturulma Tarihi</p>
                  <p className="text-gray-900">
                    {new Date(payment.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {payment.created_by_user && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Oluşturan</p>
                    <p className="text-gray-900">{payment.created_by_user.full_name}</p>
                  </div>
                )}

                {payment.approved_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {payment.status === 'completed' ? 'Tamamlanma Tarihi' : 'Onay Tarihi'}
                    </p>
                    <p className="text-gray-900">
                      {new Date(payment.approved_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
