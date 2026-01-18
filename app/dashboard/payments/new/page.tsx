'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Save,
  User,
  Plus,
  X,
  Building2,
  Wallet,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Info,
  Calculator
} from 'lucide-react'
import { usePaymentNotifications } from '@/contexts/notification-context'
import PersonBadge from '@/components/ui/person-badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useInvalidatePayments } from '@/hooks/use-payments'
import { useInvalidateBalances } from '@/hooks/use-balances'
import { useInvalidateDashboard } from '@/hooks/use-dashboard'

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

interface ProjectBalance {
  project_id: string
  project_code: string
  project_name: string
  available_amount: number
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
  income_distribution_id?: string
  amount: number
  description: string
  isManual?: boolean
}

export default function NewPaymentPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [people, setPeople] = useState<PersonWithBalance[]>([])
  const [projectBalances, setProjectBalances] = useState<ProjectBalance[]>([])
  const [availableDistributions, setAvailableDistributions] = useState<IncomeDistribution[]>([])
  const router = useRouter()
  const { notifyPaymentCreated } = usePaymentNotifications()
  const invalidatePayments = useInvalidatePayments()
  const invalidateBalances = useInvalidateBalances()
  const invalidateDashboard = useInvalidateDashboard()

  const [formData, setFormData] = useState({
    person_id: '',
    person_type: '' as 'user' | 'personnel' | '',
    project_id: '',
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
      fetchProjectBalances(formData.person_id, formData.person_type)
      fetchAvailableDistributions(formData.person_id, formData.person_type)
    } else {
      setProjectBalances([])
      setAvailableDistributions([])
      setSelectedItems([])
    }
    setFormData(prev => ({ ...prev, project_id: '' }))
  }, [formData.person_id, formData.person_type])

  const fetchPeopleWithBalances = async (token: string) => {
    try {
      const balanceResponse = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const balanceData = await balanceResponse.json()

      if (balanceData.success) {
        const peopleMap = new Map<string, PersonWithBalance>()

        console.log('Balances from API:', balanceData.data.balances)

        balanceData.data.balances.forEach((balance: any) => {
          let person = null
          let personType: 'user' | 'personnel' = 'user'

          // Check for user balance
          if (balance.user_id && balance.user && balance.user.id) {
            person = balance.user
            personType = 'user'
          }
          // Check for personnel balance
          else if (balance.personnel_id && balance.personnel && balance.personnel.id) {
            person = balance.personnel
            personType = 'personnel'
          }

          if (!person) return

          const personId = person.id
          const existingPerson = peopleMap.get(personId)

          if (existingPerson) {
            existingPerson.balance += (balance.available_amount || 0)
          } else {
            peopleMap.set(personId, {
              id: person.id,
              type: personType,
              full_name: person.full_name,
              email: person.email,
              iban: person.iban,
              balance: balance.available_amount || 0
            })
          }
        })

        const allPeople = Array.from(peopleMap.values())
          .sort((a, b) => a.full_name.localeCompare(b.full_name, 'tr'))

        console.log('All people from balances:', allPeople)
        console.log('People count:', allPeople.length)

        // Bakiyesi olanları üstte göster
        const sortedPeople = allPeople.sort((a, b) => b.balance - a.balance)
        setPeople(sortedPeople)
      }
    } catch (err) {
      console.error('Failed to fetch people with balances:', err)
    }
  }

  const fetchProjectBalances = async (personId: string, personType: 'user' | 'personnel') => {
    try {
      const token = localStorage.getItem('token')
      const balanceResponse = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const balanceData = await balanceResponse.json()

      if (balanceData.success) {
        const personBalances: ProjectBalance[] = balanceData.data.balances
          .filter((balance: any) => {
            if (personType === 'user') {
              return balance.user_id === personId
            } else {
              return balance.personnel_id === personId
            }
          })
          .filter((balance: any) => balance.project && balance.available_amount > 0)
          .map((balance: any) => ({
            project_id: balance.project.id,
            project_code: balance.project.code,
            project_name: balance.project.name,
            available_amount: balance.available_amount || 0
          }))

        setProjectBalances(personBalances)
      }
    } catch (err) {
      console.error('Failed to fetch project balances:', err)
    }
  }

  const fetchAvailableDistributions = async (personId: string, personType: 'user' | 'personnel') => {
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

    if (!formData.project_id) {
      newErrors.project_id = 'Proje seçimi gerekli'
    }

    if (selectedItems.length === 0) {
      newErrors.items = 'En az bir ödeme kalemi eklenme gerekli'
    }

    const selectedPerson = people.find(p => p.id === formData.person_id)
    const selectedProject = projectBalances.find(p => p.project_id === formData.project_id)
    const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

    if (selectedProject && totalAmount > selectedProject.available_amount) {
      newErrors.total = `Toplam tutar bu projedeki bakiyeden (₺${selectedProject.available_amount.toLocaleString('tr-TR')}) fazla olamaz`
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
          project_id: formData.project_id,
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
        invalidatePayments()
        invalidateBalances()
        invalidateDashboard()

        const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy border-t-transparent mx-auto"></div>
          <p className="mt-3 text-slate-600 font-medium">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedPerson = people.find(p => p.id === formData.person_id)
  const selectedProject = projectBalances.find(p => p.project_id === formData.project_id)
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/payments"
              className="w-11 h-11 flex items-center justify-center rounded-xl border-2 border-slate-200 text-slate-500 hover:text-navy hover:border-navy transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-navy text-4xl font-black tracking-tight">Yeni Ödeme Talimatı</h1>
              <p className="text-slate-500 text-base">Yeni bir ödeme talimatı oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recipient Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
                <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0 rounded-t-xl" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-navy" />
                    </div>
                    <h2 className="text-lg font-bold text-navy">Alıcı Bilgileri</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="relative z-50">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Alıcı Seçimi *
                      </label>
                      <SearchableSelect
                        options={people}
                        value={formData.person_id}
                        onChange={(personId, person) => {
                          setFormData({
                            ...formData,
                            person_id: personId,
                            person_type: person?.type || ''
                          })
                        }}
                        placeholder="Alıcı seçiniz veya isim yazarak arayın..."
                        searchPlaceholder="İsim ile ara..."
                        searchKeys={['full_name', 'email']}
                        getOptionLabel={(person) =>
                          `${person.full_name} (${person.type === 'user' ? 'Kullanıcı' : 'Personel'}) - ₺${person.balance?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} bakiye`
                        }
                        error={!!errors.person_id}
                      />
                      {errors.person_id && <p className="mt-1 text-sm text-red-600">{errors.person_id}</p>}
                    </div>

                    {selectedPerson && (
                      <div className="bg-gradient-to-br from-navy/5 to-gold/5 p-5 rounded-xl border border-navy/10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alıcı Bilgileri</p>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-navy">{selectedPerson.full_name}</p>
                              <PersonBadge type={selectedPerson.type} size="sm" />
                            </div>
                            <p className="text-sm text-slate-600">{selectedPerson.email}</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mevcut Bakiye</p>
                            <p className="text-2xl font-black text-navy">
                              ₺{selectedPerson.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">IBAN</p>
                            <p className="font-mono text-sm text-slate-700">
                              {selectedPerson.iban || 'IBAN bilgisi yok'}
                            </p>
                            {!selectedPerson.iban && (
                              <p className="text-red-600 text-xs font-medium mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> IBAN bilgisi eksik
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {errors.iban && <p className="text-sm text-red-600">{errors.iban}</p>}
                    {errors.total && <p className="text-sm text-red-600">{errors.total}</p>}
                  </div>
                </div>
              </div>

              {/* Project Selection */}
              {selectedPerson && projectBalances.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
                  <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0 rounded-t-xl" />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-navy" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-navy">Proje Seçimi</h2>
                        <p className="text-sm text-slate-500">Ödemenin hangi projeden yapılacağını seçin</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectBalances.map((project) => {
                        const isSelected = formData.project_id === project.project_id
                        return (
                          <div
                            key={project.project_id}
                            onClick={() => {
                              setFormData({ ...formData, project_id: project.project_id })
                              setSelectedItems([])
                            }}
                            className={`cursor-pointer border-2 rounded-xl p-5 transition-all ${
                              isSelected
                                ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                                : 'border-slate-200 hover:border-navy/30 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className={`font-bold ${isSelected ? 'text-navy' : 'text-slate-900'}`}>
                                  {project.project_code}
                                </p>
                                <p className={`text-sm ${isSelected ? 'text-navy/70' : 'text-slate-600'}`}>
                                  {project.project_name}
                                </p>
                              </div>
                              {isSelected && (
                                <div className="bg-navy rounded-full p-1">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="pt-3 border-t border-slate-200">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kullanılabilir Bakiye</p>
                              <p className={`text-xl font-black ${isSelected ? 'text-navy' : 'text-slate-900'}`}>
                                ₺{project.available_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {errors.project_id && <p className="mt-3 text-sm text-red-600">{errors.project_id}</p>}
                  </div>
                </div>
              )}

              {/* No projects warning */}
              {selectedPerson && projectBalances.length === 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-800 mb-1">Bakiye Bulunamadı</h3>
                      <p className="text-yellow-700">
                        Bu kişinin hiçbir projede bakiyesi bulunmamaktadır. Önce manuel dağıtım yaparak bakiye oluşturmanız gerekmektedir.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Items */}
              {formData.person_id && formData.project_id && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
                  <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0 rounded-t-xl" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-navy" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-navy">Ödeme Kalemleri</h2>
                          {selectedProject && (
                            <p className="text-sm text-slate-500">
                              <span className="font-semibold">{selectedProject.project_code}</span> -
                              Bakiye: <span className="font-bold text-navy">₺{selectedProject.available_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addManualItem}
                        className="flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-all shadow-lg shadow-navy/20"
                      >
                        <Plus className="h-4 w-4" />
                        Ödeme Ekle
                      </button>
                    </div>

                    {selectedItems.filter(item => item.isManual).length === 0 ? (
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Henüz ödeme kalemi eklenmedi</p>
                        <p className="text-sm text-slate-400">Yukarıdaki butona tıklayarak ödeme ekleyin</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedItems.map((item, index) => {
                          if (!item.isManual) return null

                          return (
                            <div key={index} className="border-2 border-slate-200 rounded-xl p-5 bg-slate-50/50">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-8 h-8 rounded-lg bg-navy/10 text-navy flex items-center justify-center text-sm font-bold">
                                    {index + 1}
                                  </span>
                                  <h3 className="font-bold text-slate-900">Ödeme Kalemi</h3>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeManualItem(index)}
                                  className="p-2 text-gold hover:text-gold/80 hover:bg-gold/10 rounded-lg transition-all"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Tutar (₺) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount || ''}
                                    onChange={(e) => updateItemAmount(index, parseFloat(e.target.value) || 0)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy font-bold text-lg"
                                    placeholder="0.00"
                                  />
                                  {errors[`item_${index}`] && (
                                    <p className="mt-1 text-sm text-gold">{errors[`item_${index}`]}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Açıklama
                                  </label>
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateItemDescription(index, e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                                    placeholder="Ödeme açıklaması"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {errors.items && <p className="mt-3 text-sm text-red-600">{errors.items}</p>}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
                <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0 rounded-t-xl" />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-navy" />
                    </div>
                    <h2 className="text-lg font-bold text-navy">Ek Notlar</h2>
                  </div>

                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                    placeholder="Ödeme talimatı ile ilgili notlar..."
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-4">
                <Link
                  href="/dashboard/payments"
                  className="px-6 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-all"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={loading || selectedItems.length === 0 || !formData.project_id}
                  className="flex items-center gap-2 px-6 py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-all shadow-lg shadow-navy/20"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Ödeme Talimatı Oluştur
                    </>
                  )}
                </button>
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-medium text-red-600">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Sidebar - 1/3 */}
            <div className="space-y-6">
              {/* Payment Summary */}
              {selectedItems.length > 0 && formData.project_id && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
                  <div className="h-0.5 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0 rounded-t-xl" />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-navy" />
                      </div>
                      <h2 className="text-lg font-bold text-navy">Ödeme Özeti</h2>
                    </div>

                    {selectedProject && (
                      <div className="bg-gradient-to-br from-navy/5 to-gold/5 p-4 rounded-xl mb-4 border border-navy/10">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Proje</p>
                        <p className="font-bold text-navy">{selectedProject.project_code}</p>
                        <p className="text-sm text-slate-600">{selectedProject.project_name}</p>
                      </div>
                    )}

                    <div className="space-y-3 mb-6">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{item.description}</p>
                          </div>
                          <p className="font-bold text-slate-900">
                            ₺{item.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="bg-navy/5 -mx-6 -mb-6 p-6 border-t border-navy/10">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-navy">Toplam Tutar</span>
                        <span className="text-2xl font-black text-navy">
                          ₺{totalAmount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Card */}
              <div className="bg-gradient-to-br from-navy/5 to-gold/5 rounded-xl p-6 border border-navy/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-navy" />
                  </div>
                  <h3 className="font-bold text-navy">Bilgi</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
                    <span>Ödeme talimatı oluşturulduktan sonra bakiye otomatik olarak güncellenir.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
                    <span>Talimat numarası sistem tarafından otomatik atanır.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-navy mt-0.5 flex-shrink-0" />
                    <span>Alıcının IBAN bilgisi zorunludur.</span>
                  </li>
                </ul>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-navy mb-4">Hızlı Bağlantılar</h3>
                <div className="space-y-2">
                  <Link
                    href="/dashboard/payments"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-700">Talimat Listesi</span>
                  </Link>
                  <Link
                    href="/dashboard/balances/allocate"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Wallet className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-700">Bakiye Dağıtımı</span>
                  </Link>
                  <Link
                    href="/dashboard/users"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-5 h-5 text-slate-400" />
                    <span className="font-medium text-slate-700">Kullanıcılar</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
