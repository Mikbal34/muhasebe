'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building2,
  Wallet,
  Save,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
import { usePaymentNotifications } from '@/contexts/notification-context'

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

export default function EditPaymentPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [payment, setPayment] = useState<PaymentInstruction | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { notifyPaymentStatusChange } = usePaymentNotifications()

  const [formData, setFormData] = useState({
    notes: '',
    status: 'pending' as 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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

      if (parsedUser.role !== 'admin' && parsedUser.role !== 'finance_officer') {
        router.push('/dashboard')
        return
      }

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
        const paymentData = data.data.payment
        setPayment(paymentData)

        // Populate form data
        setFormData({
          notes: paymentData.notes || '',
          status: paymentData.status
        })
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          text: 'Bekliyor'
        }
      case 'approved':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: CheckCircle,
          text: 'Onaylandı'
        }
      case 'processing':
        return {
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: AlertTriangle,
          text: 'İşleniyor'
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Status transitions validation
    if (payment && payment.status === 'completed') {
      newErrors.status = 'Tamamlanmış ödeme talimatları düzenlenemez'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/payments/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: formData.notes.trim() || null,
          status: formData.status
        })
      })

      const data = await response.json()

      if (data.success) {
        // Trigger notification if status changed
        if (payment && formData.status !== payment.status) {
          notifyPaymentStatusChange(
            payment.instruction_number,
            payment.status,
            formData.status,
            payment.total_amount
          )
        }

        router.push(`/dashboard/payments/${params.id}` as any)
      } else {
        setErrors({ submit: data.error || 'Ödeme talimatı güncellenemedi' })
      }
    } catch (err) {
      setErrors({ submit: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const currentStatusInfo = getStatusInfo(payment.status)
  const newStatusInfo = getStatusInfo(formData.status)

  const statusOptions = [
    { value: 'pending', label: 'Bekliyor', disabled: payment.status === 'completed' },
    { value: 'approved', label: 'Onaylandı', disabled: payment.status === 'completed' },
    { value: 'processing', label: 'İşleniyor', disabled: payment.status === 'completed' },
    { value: 'completed', label: 'Tamamlandı', disabled: false },
    { value: 'rejected', label: 'Reddedildi', disabled: payment.status === 'completed' }
  ]

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href={`/dashboard/payments/${params.id}` as any}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ödeme Talimatı Düzenle</h1>
              <p className="text-gray-600">{payment.instruction_number}</p>
            </div>
          </div>
        </div>

        {/* Current Payment Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Mevcut Ödeme Bilgileri
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Alıcı</p>
              <p className="text-gray-900">{payment.user.full_name}</p>
              <p className="text-sm text-gray-600">{payment.user.email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Toplam Tutar</p>
              <p className="text-lg font-bold text-gray-900">
                ₺{payment.total_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Mevcut Durum</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStatusInfo.color}`}>
                  <currentStatusInfo.icon className="h-3 w-3 mr-1" />
                  {currentStatusInfo.text}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Items */}
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Ödeme Kalemleri</h3>
            <div className="space-y-3">
              {payment.items.map((item, index) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.description}</p>
                      {item.income_distribution && (
                        <p className="text-sm text-gray-600">
                          {item.income_distribution.income.project.code} - {item.income_distribution.income.project.name}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-gray-900">
                      ₺{item.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Durum Güncelleme
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Durum
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={payment.status === 'completed'}
                >
                  {statusOptions.map(option => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Önizleme</p>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${newStatusInfo.color}`}>
                    <newStatusInfo.icon className="h-4 w-4 mr-2" />
                    {newStatusInfo.text}
                  </span>
                </div>
              </div>
            </div>

            {formData.status !== payment.status && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Durum değişikliği:</strong> {currentStatusInfo.text} → {newStatusInfo.text}
                </p>
                {formData.status === 'approved' && (
                  <p className="text-sm text-blue-700 mt-1">
                    Bu ödeme talimatı onaylandığında, alıcının bakiyesinden düşülecektir.
                  </p>
                )}
                {formData.status === 'completed' && (
                  <p className="text-sm text-blue-700 mt-1">
                    Bu durum değişikliği geri alınamaz. Ödeme talimatı tamamlandı olarak işaretlenecektir.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Notlar
            </h2>

            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ödeme talimatı ile ilgili notlar ve açıklamalar..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/dashboard/payments/${params.id}` as any}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving || payment.status === 'completed'}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  )
}