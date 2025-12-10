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
import PersonBadge from '@/components/ui/person-badge'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PersonWithBalance {
  id: string
  type: 'user' | 'personnel'
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
  const [people, setPeople] = useState<PersonWithBalance[]>([])
  const [availableDistributions, setAvailableDistributions] = useState<IncomeDistribution[]>([])
  const router = useRouter()
  const { notifyPaymentCreated } = usePaymentNotifications()

  const [formData, setFormData] = useState({
    person_id: '',  // Will hold either user_id or personnel_id
    person_type: '' as 'user' | 'personnel' | '',
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

      if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
        router.push('/dashboard')
        return
      }

      fetchPeopleWithBalances(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (formData.person_id && formData.person_type) {
      fetchAvailableDistributions(formData.person_id, formData.person_type)
    } else {
      setAvailableDistributions([])
      setSelectedItems([])
    }
  }, [formData.person_id, formData.person_type])

  const fetchPeopleWithBalances = async (token: string) => {
    try {
      // Fetch balances (includes both users and personnel)
      const balanceResponse = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const balanceData = await balanceResponse.json()

      if (balanceData.success) {
        // Map balances to people with balances
        const peopleWithBalances: PersonWithBalance[] = balanceData.data.balances
          .map((balance: any) => {
            const person = balance.user || balance.personnel
            if (!person) return null

            return {
              id: person.id,
              type: balance.user_id ? 'user' as const : 'personnel' as const,
              full_name: person.full_name,
              email: person.email,
              iban: person.iban,
              balance: balance.available_amount || 0
            }
          })
          .filter((p: any) => p !== null && p.balance > 0) // Only show people with balance > 0

        setPeople(peopleWithBalances)
      }
    } catch (err) {
      console.error('Failed to fetch people with balances:', err)
    }
  }

  const fetchAvailableDistributions = async (personId: string, personType: 'user' | 'personnel') => {
    // For manual allocation system, we don't fetch income distributions
    // Users can only create manual payments based on their available balance
    setAvailableDistributions([])
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

    if (!formData.person_id) {
      newErrors.person_id = 'Alıcı seçimi gerekli'
    }

    if (selectedItems.length === 0) {
      newErrors.items = 'En az bir ödeme kalemi eklenme gerekli'
    }

    const selectedPerson = people.find(p => p.id === formData.person_id)
    const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

    if (selectedPerson && totalAmount > selectedPerson.balance) {
      newErrors.total = `Toplam tutar kullanılabilir bakiyeden (₺${selectedPerson.balance.toLocaleString('tr-TR')}) fazla olamaz`
    }

    selectedItems.forEach((item, index) => {
      if (item.amount <= 0) {
        newErrors[`item_${index}`] = 'Tutar sıfırdan büyük olmalı'
      }
    })

    if (selectedPerson && !selectedPerson.iban) {
      newErrors.iban = 'Seçilen kişinin IBAN bilgisi eksik'
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
          user_id: formData.person_type === 'user' ? formData.person_id : null,
          personnel_id: formData.person_type === 'personnel' ? formData.person_id : null,
          total_amount: selectedItems.reduce((sum, item) => sum + item.amount, 0),
          notes: formData.notes.trim() || null,
          items: selectedItems.map(item => ({
            income_distribution_id: item.income_distribution_id || null,
            amount: item.amount,
            description: item.description || null
          }))
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedPerson = people.find(p => p.id === formData.person_id)
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/payments"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yeni Ödeme Talimatı</h1>
              <p className="text-sm text-slate-600">Yeni bir ödeme talimatı oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipient Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Alıcı Bilgileri
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alıcı *
                </label>
                <select
                  value={formData.person_id}
                  onChange={(e) => {
                    const personId = e.target.value
                    const person = people.find(p => p.id === personId)
                    setFormData({
                      ...formData,
                      person_id: personId,
                      person_type: person?.type || ''
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Alıcı seçiniz...</option>
                  {people.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.full_name} ({person.type === 'user' ? 'Kullanıcı' : 'Personel'}) - ₺{person.balance.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} bakiye
                    </option>
                  ))}
                </select>
                {errors.person_id && <p className="mt-1 text-sm text-red-600">{errors.person_id}</p>}
              </div>

              {selectedPerson && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Alıcı Bilgileri</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-blue-900">{selectedPerson.full_name}</p>
                        <PersonBadge type={selectedPerson.type} size="sm" />
                      </div>
                      <p className="text-sm text-blue-700">{selectedPerson.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">Mevcut Bakiye</p>
                      <p className="text-lg font-bold text-blue-900">
                        ₺{selectedPerson.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-700">IBAN</p>
                      <p className="text-blue-900 font-mono text-sm">
                        {selectedPerson.iban || 'IBAN bilgisi yok'}
                      </p>
                      {!selectedPerson.iban && (
                        <p className="text-red-600 text-sm">⚠️ IBAN bilgisi eksik</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {errors.iban && <p className="text-sm text-red-600">{errors.iban}</p>}
              {errors.total && <p className="text-sm text-red-600">{errors.total}</p>}
            </div>
          </div>

          {/* Available Distributions */}
          {availableDistributions.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
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
                        isSelected ? 'border-teal-300 bg-teal-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDistributionSelection(distribution)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
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
                        <div className="mt-4 pt-4 border-t border-teal-200 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          {formData.person_id && (
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Manuel Ödeme
                </h2>
                <button
                  type="button"
                  onClick={addManualItem}
                  className="px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors flex items-center gap-2"
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
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
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
                  <span className="text-base font-semibold text-gray-900">Toplam Tutar:</span>
                  <span className="text-lg font-bold text-teal-600">
                    ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Ek Notlar
            </h2>

            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Ödeme talimatı ile ilgili notlar..."
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/payments"
              className="px-3 py-2 border border-gray-300 text-sm font-semibold rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading || selectedItems.length === 0}
              className="px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 disabled:opacity-50 transition-colors"
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