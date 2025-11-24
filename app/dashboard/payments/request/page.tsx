'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  DollarSign,
  User,
  Wallet,
  AlertTriangle,
  CreditCard
} from 'lucide-react'
import { usePaymentNotifications, useNotifications } from '@/contexts/notification-context'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
  iban?: string
}

interface Balance {
  id: string
  available_amount: number
  debt_amount: number
  reserved_amount: number
}

export default function RequestPaymentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { notifyPaymentCreated } = usePaymentNotifications()
  const { refreshNotifications } = useNotifications()

  const [formData, setFormData] = useState({
    amount: '',
    notes: ''
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

      if (parsedUser.role !== 'manager') {
        router.push('/dashboard')
        return
      }

      fetchBalance(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchBalance = async (token: string) => {
    try {
      const response = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.balances.length > 0) {
        setBalance(data.data.balances[0])
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Amount validation
    if (!formData.amount) {
      newErrors.amount = 'Tutar gereklidir'
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount)) {
        newErrors.amount = 'Geçerli bir sayı giriniz'
      } else if (amount <= 0) {
        newErrors.amount = 'Tutar sıfırdan büyük olmalıdır'
      // Temporarily disable frontend balance validation to test backend
      // } else if (balance && amount > balance.available_amount) {
      //   newErrors.amount = `Yetersiz bakiye. Mevcut: ₺${balance.available_amount.toLocaleString('tr-TR')}`
      } else if (!/^\d+(\.\d{1,2})?$/.test(formData.amount)) {
        newErrors.amount = 'En fazla 2 ondalık basamak girebilirsiniz'
      }
    }

    // IBAN check
    if (!user?.iban) {
      newErrors.iban = 'IBAN bilginiz eksik. Lütfen profil ayarlarından IBAN bilginizi güncelleyin.'
    }

    // Debt check
    if (balance && balance.debt_amount > 0) {
      newErrors.debt = `${balance.debt_amount.toLocaleString('tr-TR')} TL borcunuz bulunuyor. Önce borcunuzu kapatmanız gerekiyor.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          notes: formData.notes.trim() || null
        })
      })

      const data = await response.json()

      if (data.success) {
        // Refresh notifications from database (database trigger should have created notification)
        setTimeout(() => {
          refreshNotifications()
        }, 500)
        router.push('/dashboard/payments')
      } else {
        setErrors({ submit: data.error || 'Ödeme talebi oluşturulamadı' })
      }
    } catch (error: any) {
      console.error('Payment request error:', error)
      setErrors({ submit: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' })
    } finally {
      setLoading(false)
    }
  }

  if (!user || !balance) {
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/balances"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ödeme Talebi</h1>
              <p className="text-gray-600">Bakiyenizden ödeme talep edin</p>
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Wallet className="h-5 w-5 mr-2" />
            Mevcut Bakiye
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center">
                <DollarSign className="h-6 w-6 text-green-600 bg-green-100 rounded p-1" />
                <div className="ml-3">
                  <p className="text-xs text-green-700 font-medium">Kullanılabilir</p>
                  <p className="text-lg font-bold text-green-600">
                    ₺{balance.available_amount.toLocaleString('tr-TR')}
                  </p>
                  {balance.reserved_amount > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Rezerve: ₺{balance.reserved_amount.toLocaleString('tr-TR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {balance.debt_amount > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-red-600 bg-red-100 rounded p-1" />
                  <div className="ml-3">
                    <p className="text-xs text-red-700 font-medium">Borç</p>
                    <p className="text-lg font-bold text-red-600">
                      ₺{balance.debt_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {balance.reserved_amount > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-blue-600 bg-blue-100 rounded p-1" />
                  <div className="ml-3">
                    <p className="text-xs text-blue-700 font-medium">Rezerve</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₺{balance.reserved_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Request Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Ödeme Talebi Detayları
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Talep Edilen Tutar (₺) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  disabled={balance.debt_amount > 0 || !user.iban}
                />
                {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
                {balance.available_amount > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Maksimum: ₺{balance.available_amount.toLocaleString('tr-TR')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ödeme talebi ile ilgili açıklama..."
                />
              </div>

              {/* IBAN Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <User className="h-5 w-5 text-gray-600 mt-1 mr-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Ödeme Bilgileri</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Ad Soyad: {user.full_name}
                    </p>
                    {user.iban ? (
                      <p className="text-sm text-gray-600">
                        IBAN: {user.iban}
                      </p>
                    ) : (
                      <p className="text-sm text-red-600">
                        IBAN bilginiz eksik. Profil ayarlarından güncelleyin.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {errors.iban && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.iban}</p>
            </div>
          )}

          {errors.debt && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.debt}</p>
            </div>
          )}

          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/balances"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading || balance.debt_amount > 0 || !user.iban || balance.available_amount === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Gönderiliyor...' : 'Ödeme Talebi Gönder'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}