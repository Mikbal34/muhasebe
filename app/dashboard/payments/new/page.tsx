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
  Plus,
  X,
  Building2,
  Wallet
} from 'lucide-react'
import { usePaymentNotifications } from '@/contexts/notification-context'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface UserWithBalance {
  id: string
  full_name: string
  email: string
  iban: string | null
  balance: number
}

interface IncomeDistribution {
  id: string
  amount: number
  user: {
    id: string
    full_name: string
    email: string
    iban: string | null
  }
  balance: number
  income: {
    id: string
    description: string | null
    project: {
      id: string
      code: string
      name: string
    }
  }
}

interface PaymentItem {
  income_distribution_id?: string  // Optional for manual items
  amount: number
  description: string
  isManual?: boolean  // Flag for manual items
}

export default function NewPaymentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserWithBalance[]>([])
  const [availableDistributions, setAvailableDistributions] = useState<IncomeDistribution[]>([])
  const router = useRouter()
  const { notifyPaymentCreated } = usePaymentNotifications()

  const [formData, setFormData] = useState({
    user_id: '',
    notes: ''
  })

  const [selectedItems, setSelectedItems] = useState<PaymentItem[]>([])
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

      fetchUsersWithBalances(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (formData.user_id) {
      fetchAvailableDistributions(formData.user_id)
    } else {
      setAvailableDistributions([])
      setSelectedItems([])
    }
  }, [formData.user_id])

  const fetchUsersWithBalances = async (token: string) => {
    try {
      // Fetch all users with academician role
      const response = await fetch('/api/users?role=academician', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        const usersWithBalances = data.data.users
          .map((user: any) => ({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            iban: user.iban,
            balance: 0 // Will be updated if balance exists
          }))

        // Now fetch balances to update the balance info
        const balanceResponse = await fetch('/api/balances', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const balanceData = await balanceResponse.json()

        if (balanceData.success) {
          // Update balance info for users who have balances
          balanceData.data.balances.forEach((balance: any) => {
            const user = usersWithBalances.find((u: any) => u.id === balance.user.id)
            if (user) {
              user.balance = balance.available_amount || 0
            }
          })
        }

        setUsers(usersWithBalances)
      }
    } catch (err) {
      console.error('Failed to fetch users with balances:', err)
    }
  }

  const fetchAvailableDistributions = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/income-distributions?user_id=${userId}&unpaid_only=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setAvailableDistributions(data.data.distributions || [])
      }
    } catch (err) {
      console.error('Failed to fetch distributions:', err)
    }
  }

  const toggleDistributionSelection = (distribution: IncomeDistribution) => {
    const existingIndex = selectedItems.findIndex(
      item => item.income_distribution_id === distribution.id
    )

    if (existingIndex >= 0) {
      setSelectedItems(selectedItems.filter((_, index) => index !== existingIndex))
    } else {
      const newItem: PaymentItem = {
        income_distribution_id: distribution.id,
        amount: distribution.amount,
        description: distribution.income.description || `${distribution.income.project.code} projesi`,
        isManual: false
      }
      setSelectedItems([...selectedItems, newItem])
    }
  }

  const addManualItem = () => {
    const newItem: PaymentItem = {
      amount: 0,
      description: 'Manuel ödeme',
      isManual: true
    }
    setSelectedItems([...selectedItems, newItem])
  }

  const removeManualItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index))
  }

  const updateItemAmount = (index: number, amount: number) => {
    setSelectedItems(items =>
      items.map((item, i) =>
        i === index
          ? { ...item, amount }
          : item
      )
    )
  }

  const updateItemDescription = (index: number, description: string) => {
    setSelectedItems(items =>
      items.map((item, i) =>
        i === index
          ? { ...item, description }
          : item
      )
    )
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.user_id) {
      newErrors.user_id = 'Alıcı seçimi gerekli'
    }

    if (selectedItems.length === 0) {
      newErrors.items = 'En az bir gelir dağıtımı seçilmeli'
    }

    selectedItems.forEach((item, index) => {
      const distribution = availableDistributions.find(d => d.id === item.income_distribution_id)
      if (distribution && item.amount > distribution.amount) {
        newErrors[`item_${index}`] = 'Tutar mevcut bakiyeden fazla olamaz'
      }
      if (item.amount <= 0) {
        newErrors[`item_${index}`] = 'Tutar sıfırdan büyük olmalı'
      }
    })

    const selectedUser = users.find(u => u.id === formData.user_id)
    if (selectedUser && !selectedUser.iban) {
      newErrors.iban = 'Seçilen kullanıcının IBAN bilgisi eksik'
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
          user_id: formData.user_id,
          notes: formData.notes.trim() || null,
          items: selectedItems
        })
      })

      const data = await response.json()

      if (data.success) {
        // Calculate total amount
        const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

        // Trigger notification for new payment
        notifyPaymentCreated(data.data.instruction_number, totalAmount)

        router.push('/dashboard/payments')
      } else {
        setErrors({ submit: data.error || 'Ödeme talimatı oluşturulamadı' })
      }
    } catch (err) {
      setErrors({ submit: 'Bir hata oluştu' })
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedUser = users.find(u => u.id === formData.user_id)
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/payments"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yeni Ödeme Talimatı</h1>
              <p className="text-gray-600">Yeni bir ödeme talimatı oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient Selection */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Alıcı Bilgileri
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alıcı *
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Alıcı seçiniz...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} - ₺{user.balance.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} bakiye
                    </option>
                  ))}
                </select>
                {errors.user_id && <p className="mt-1 text-sm text-red-600">{errors.user_id}</p>}
              </div>

              {selectedUser && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Alıcı Bilgileri</p>
                      <p className="text-blue-900">{selectedUser.full_name}</p>
                      <p className="text-sm text-blue-700">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">IBAN</p>
                      <p className="text-blue-900 font-mono text-sm">
                        {selectedUser.iban || 'IBAN bilgisi yok'}
                      </p>
                      {!selectedUser.iban && (
                        <p className="text-red-600 text-sm">⚠️ IBAN bilgisi eksik</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {errors.iban && <p className="text-sm text-red-600">{errors.iban}</p>}
            </div>
          </div>

          {/* Available Distributions */}
          {availableDistributions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Mevcut Gelir Dağıtımları
              </h2>

              <div className="space-y-3">
                {availableDistributions.map((distribution) => {
                  const isSelected = selectedItems.some(item => item.income_distribution_id === distribution.id)
                  const selectedItem = selectedItems.find(item => item.income_distribution_id === distribution.id)

                  return (
                    <div
                      key={distribution.id}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDistributionSelection(distribution)}
                            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {distribution.income.project.code} - {distribution.income.project.name}
                              </span>
                            </div>
                            {distribution.income.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {distribution.income.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₺{distribution.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-gray-500">mevcut bakiye</p>
                        </div>
                      </div>

                      {isSelected && selectedItem && (
                        <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ödenecek Tutar (₺)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={distribution.amount}
                              step="0.01"
                              value={selectedItem.amount}
                              onChange={(e) => updateItemAmount(selectedItems.indexOf(selectedItem), parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {errors[`item_${selectedItems.indexOf(selectedItem)}`] && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors[`item_${selectedItems.indexOf(selectedItem)}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Açıklama
                            </label>
                            <input
                              type="text"
                              value={selectedItem.description}
                              onChange={(e) => updateItemDescription(selectedItems.indexOf(selectedItem), e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                              placeholder="Ödeme açıklaması"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {errors.items && <p className="mt-2 text-sm text-red-600">{errors.items}</p>}
            </div>
          )}

          {/* Manual Payment Items */}
          {formData.user_id && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Manuel Ödeme
                </h2>
                <button
                  type="button"
                  onClick={addManualItem}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Manuel Ödeme Ekle
                </button>
              </div>

              {selectedItems.some(item => item.isManual) && (
                <div className="space-y-4">
                  {selectedItems.map((item, index) => {
                    if (!item.isManual) return null

                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900">Manuel Ödeme #{index + 1}</h3>
                          <button
                            type="button"
                            onClick={() => removeManualItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Tutar (₺)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateItemAmount(index, parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Açıklama
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItemDescription(index, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              placeholder="Ödeme açıklaması"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Payment Summary */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Ödeme Özeti
              </h2>

              <div className="space-y-3">
                {selectedItems.map((item, index) => {
                  const distribution = availableDistributions.find(d => d.id === item.income_distribution_id)
                  return (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                      <div>
                        <p className="font-medium text-gray-900">{item.description}</p>
                        {item.isManual ? (
                          <p className="text-sm text-green-600">
                            Manuel ödeme
                          </p>
                        ) : distribution && (
                          <p className="text-sm text-gray-600">
                            {distribution.income.project.code} - {distribution.income.project.name}
                          </p>
                        )}
                      </div>
                      <p className="font-bold text-gray-900">
                        ₺{item.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Toplam Tutar:</span>
                  <span className="text-xl font-bold text-purple-600">
                    ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Ek Notlar
            </h2>

            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ödeme talimatı ile ilgili notlar..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/payments"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Ödeme Talimatı Oluştur'}
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