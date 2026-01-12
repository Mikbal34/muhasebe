'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Wallet,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingUp
} from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useIncomeNotifications } from '@/contexts/notification-context'
import { triggerNotificationRefresh } from '@/utils/notifications'
import { useInvalidateIncomes } from '@/hooks/use-incomes'
import { useInvalidateDashboard } from '@/hooks/use-dashboard'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Project {
  id: string
  code: string
  name: string
  budget: number
  company_rate: number
  vat_rate: number
  status: 'active' | 'completed' | 'cancelled'
  remaining_budget: number | null
  total_commission_due: number | null
  total_commission_collected: number | null
  has_withholding_tax: boolean
  withholding_tax_rate: number
}

export default function NewIncomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const router = useRouter()
  const { notifyIncomeCreated } = useIncomeNotifications()
  const invalidateIncomes = useInvalidateIncomes()
  const invalidateDashboard = useInvalidateDashboard()

  const [formData, setFormData] = useState({
    project_id: '',
    gross_amount: '',
    description: '',
    income_date: new Date().toISOString().split('T')[0],
    vat_rate: '18',
    is_fsmh_income: false,
    income_type: 'ozel' as 'ozel' | 'kamu',
    is_tto_income: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    gross_amount: 0,
    full_vat_amount: 0,
    withholding_tax_amount: 0,
    paid_vat_amount: 0,
    net_amount: 0,
    company_amount: 0,
    distributable_amount: 0
  })

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

      fetchProjects(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    calculateAmounts()
  }, [formData.gross_amount, formData.vat_rate, formData.project_id])

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        // Sadece aktif projeleri göster
        const activeProjects = (data.data.projects || []).filter((p: Project) => p.status === 'active')
        setProjects(activeProjects)
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const calculateAmounts = () => {
    const grossAmount = parseFloat(formData.gross_amount) || 0
    const vatRate = parseFloat(formData.vat_rate) || 0
    const selectedProject = projects.find(p => p.id === formData.project_id)
    const companyRate = selectedProject?.company_rate || 0
    const hasWithholdingTax = selectedProject?.has_withholding_tax || false
    const withholdingTaxRate = selectedProject?.withholding_tax_rate || 0

    // Tam KDV hesaplama: brütGelir × kdvOranı ÷ (100 + kdvOranı)
    // Türk KDV sistemi: Brüt tutar KDV dahildir, iç yüzde hesabı yapılır
    const fullVatAmount = (grossAmount * vatRate) / (100 + vatRate)

    // Tevkifat hesaplama (varsa)
    let withholdingTaxAmount = 0
    let paidVatAmount = fullVatAmount

    if (hasWithholdingTax && withholdingTaxRate > 0) {
      // Tevkifat = Tam KDV × Tevkifat Oranı / 100
      withholdingTaxAmount = (fullVatAmount * withholdingTaxRate) / 100
      // Ödenen KDV = Tam KDV - Tevkifat
      paidVatAmount = fullVatAmount - withholdingTaxAmount
    }

    // Net = Brüt - Ödenen KDV
    const netAmount = grossAmount - paidVatAmount
    const companyAmount = (netAmount * companyRate) / 100
    const distributableAmount = netAmount - companyAmount

    setCalculatedAmounts({
      gross_amount: grossAmount,
      full_vat_amount: fullVatAmount,
      withholding_tax_amount: withholdingTaxAmount,
      paid_vat_amount: paidVatAmount,
      net_amount: netAmount,
      company_amount: companyAmount,
      distributable_amount: distributableAmount
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Proje seçimi validasyonu
    if (!formData.project_id) {
      newErrors.project_id = 'Proje seçimi gereklidir'
    } else {
      const selectedProject = projects.find(p => p.id === formData.project_id)
      if (!selectedProject) {
        newErrors.project_id = 'Seçilen proje geçerli değil'
      }
    }

    // Brüt tutar validasyonu
    if (!formData.gross_amount) {
      newErrors.gross_amount = 'Brüt tutar gereklidir'
    } else {
      const amount = parseFloat(formData.gross_amount)
      if (isNaN(amount)) {
        newErrors.gross_amount = 'Geçerli bir sayı giriniz'
      } else if (amount <= 0) {
        newErrors.gross_amount = 'Brüt tutar sıfırdan büyük olmalıdır'
      } else if (amount > 10000000) {
        newErrors.gross_amount = 'Brüt tutar 10,000,000 TL\'den fazla olamaz'
      } else if (!/^\d+(\.\d{1,2})?$/.test(formData.gross_amount)) {
        newErrors.gross_amount = 'En fazla 2 ondalık basamak girebilirsiniz'
      }
    }

    // Tarih validasyonu
    if (!formData.income_date) {
      newErrors.income_date = 'Gelir tarihi gereklidir'
    } else {
      const incomeDate = new Date(formData.income_date)
      const today = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(today.getFullYear() - 1)

      if (incomeDate > today) {
        newErrors.income_date = 'Gelir tarihi bugünden sonra olamaz'
      } else if (incomeDate < oneYearAgo) {
        newErrors.income_date = 'Gelir tarihi 1 yıldan eski olamaz'
      }
    }

    // KDV oranı validasyonu
    const vatRate = parseFloat(formData.vat_rate)
    if (isNaN(vatRate)) {
      newErrors.vat_rate = 'Geçerli bir KDV oranı giriniz'
    } else if (vatRate < 0) {
      newErrors.vat_rate = 'KDV oranı negatif olamaz'
    } else if (vatRate > 100) {
      newErrors.vat_rate = 'KDV oranı %100\'den fazla olamaz'
    } else if (!/^\d+(\.\d{1,2})?$/.test(formData.vat_rate)) {
      newErrors.vat_rate = 'En fazla 2 ondalık basamak girebilirsiniz'
    }

    // Açıklama validasyonu (opsiyonel ama varsa kontrol et)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Açıklama 500 karakterden uzun olamaz'
    }

    // Proje bütçesi kontrolü
    if (formData.project_id && formData.gross_amount) {
      const selectedProject = projects.find(p => p.id === formData.project_id)
      const amount = parseFloat(formData.gross_amount)
      if (selectedProject && !isNaN(amount) && amount > selectedProject.budget) {
        newErrors.gross_amount = `Bu tutar proje bütçesini (₺${selectedProject.budget.toLocaleString('tr-TR')}) aşıyor`
      }
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
      const requestPayload = {
        project_id: formData.project_id,
        gross_amount: parseFloat(formData.gross_amount),
        vat_rate: parseFloat(formData.vat_rate),
        description: formData.description.trim() || null,
        income_date: formData.income_date,
        is_fsmh_income: formData.is_fsmh_income,
        income_type: formData.income_type,
        is_tto_income: formData.is_tto_income
      }

      console.log('🚀 SENDING REQUEST:', requestPayload)

      const response = await fetch('/api/incomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      })

      const data = await response.json()

      console.log('🔴 API RESPONSE:', data)

      if (data.success) {
        // Cache'leri invalidate et
        invalidateIncomes()
        invalidateDashboard()

        // Başarılı durumda bildirimi ekle
        const selectedProject = projects.find(p => p.id === formData.project_id)
        if (selectedProject) {
          notifyIncomeCreated(selectedProject.name, parseFloat(formData.gross_amount))
        }

        // Refresh notifications to show server-side notifications
        triggerNotificationRefresh()

        router.push('/dashboard/incomes')
      } else {
        // API'den gelen spesifik hata mesajını göster
        const errorMessage = data.error || 'Gelir kaydı oluşturulamadı'

        // HTTP status koduna göre daha detaylı hata mesajları
        if (response.status === 400) {
          setErrors({ submit: `Geçersiz veri: ${errorMessage}` })
        } else if (response.status === 401) {
          setErrors({ submit: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' })
          // Token geçersizse login sayfasına yönlendir
          setTimeout(() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            router.push('/login')
          }, 2000)
        } else if (response.status === 403) {
          setErrors({ submit: 'Bu işlem için yetkiniz bulunmuyor.' })
        } else if (response.status === 409) {
          setErrors({ submit: 'Bu gelir kaydı zaten mevcut.' })
        } else if (response.status >= 500) {
          setErrors({ submit: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' })
        } else {
          setErrors({ submit: errorMessage })
        }
      }
    } catch (err) {
      console.error('Income creation error:', err)

      // Network hatası kontrolü
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setErrors({ submit: 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.' })
      } else if (err instanceof SyntaxError) {
        setErrors({ submit: 'Sunucudan geçersiz yanıt alındı.' })
      } else {
        setErrors({ submit: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedProject = projects.find(p => p.id === formData.project_id)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/incomes"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yeni Gelir</h1>
              <p className="text-sm text-slate-600">Yeni bir gelir kaydı oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
              <Wallet className="h-4 w-4 mr-2 text-slate-700" />
              Gelir Bilgileri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proje *
                </label>
                <SearchableSelect
                  options={projects}
                  value={formData.project_id}
                  onChange={(value, option) => {
                    setFormData({
                      ...formData,
                      project_id: value,
                      vat_rate: option?.vat_rate?.toString() || '18'
                    })
                  }}
                  placeholder="Proje seçiniz veya kod yazarak arayın..."
                  error={!!errors.project_id}
                />
                {errors.project_id && <p className="mt-1 text-xs text-red-600">{errors.project_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brüt Tutar (₺) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.gross_amount}
                  onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="100000"
                />
                {errors.gross_amount && <p className="mt-1 text-xs text-red-600">{errors.gross_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  KDV Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                {errors.vat_rate && <p className="mt-1 text-xs text-red-600">{errors.vat_rate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gelir Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                {errors.income_date && <p className="mt-1 text-xs text-red-600">{errors.income_date}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="Gelir ile ilgili açıklama..."
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          {selectedProject && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2 text-slate-700" />
                Seçilen Proje Detayları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-600 font-medium text-xs">Proje Kodu</p>
                  <p className="text-slate-900">{selectedProject.code}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium text-xs">Bütçe</p>
                  <p className="text-slate-900">₺{selectedProject.budget.toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-slate-600 font-medium text-xs">Şirket Komisyonu</p>
                  <p className="text-slate-900">%{selectedProject.company_rate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Commission Status Card */}
          {selectedProject && (() => {
            const currentRemainingBudget = selectedProject.remaining_budget ?? selectedProject.budget
            const grossAmount = parseFloat(formData.gross_amount) || 0
            const newRemainingBudget = currentRemainingBudget - grossAmount
            const totalCommissionDue = selectedProject.total_commission_due ?? 0
            const totalCommissionCollected = selectedProject.total_commission_collected ?? 0
            const remainingCommission = totalCommissionDue - totalCommissionCollected
            const canSelectNonTTO = newRemainingBudget >= remainingCommission
            const commissionProgress = totalCommissionDue > 0 ? (totalCommissionCollected / totalCommissionDue) * 100 : 0

            return (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-slate-700" />
                  Komisyon Durumu
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">Toplam Komisyon Alacağı</p>
                    <p className="text-sm font-bold text-slate-900">₺{totalCommissionDue.toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">Alınmış Komisyon</p>
                    <p className="text-sm font-bold text-emerald-600">₺{totalCommissionCollected.toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">Kalan Komisyon</p>
                    <p className="text-sm font-bold text-orange-600">₺{remainingCommission.toLocaleString('tr-TR')}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-600 font-medium mb-1">Kalan Bütçe (Bu gelir sonrası)</p>
                    <p className={`text-sm font-bold ${newRemainingBudget < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ₺{newRemainingBudget.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>

                {/* Commission Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>Komisyon Tahsilat İlerlemesi</span>
                    <span>%{commissionProgress.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(commissionProgress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* TTO Selection Warning */}
                {!canSelectNonTTO && grossAmount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800">
                      <p className="font-semibold">TTO Dışı Gelir Seçilemez</p>
                      <p className="mt-0.5">
                        Bu gelir sonrası kalan bütçe (₺{newRemainingBudget.toLocaleString('tr-TR')}) kalan komisyon alacağını
                        (₺{remainingCommission.toLocaleString('tr-TR')}) karşılayamıyor. Komisyon hiçbir zaman ödenmemiş bırakılamaz.
                      </p>
                    </div>
                  </div>
                )}

                {canSelectNonTTO && grossAmount > 0 && remainingCommission > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-800">
                      <p className="font-semibold">TTO Dışı Gelir Seçilebilir</p>
                      <p className="mt-0.5">
                        Bu gelir sonrası kalan bütçe komisyon alacağını karşılamaya yetecek.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Income Type Selection */}
          {selectedProject && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center">
                <Info className="h-4 w-4 mr-2 text-slate-700" />
                Gelir Tipi Seçenekleri
              </h3>

              <div className="space-y-4">
                {/* FSMH Geliri */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">FSMH Geliri mi?</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_fsmh_income: true })}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.is_fsmh_income
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Evet, FSMH
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_fsmh_income: false })}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        !formData.is_fsmh_income
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Hayır
                    </button>
                  </div>
                </div>

                {/* Gelir Tipi (Özel/Kamu) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gelir Tipi</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, income_type: 'ozel' })}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.income_type === 'ozel'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Özel
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, income_type: 'kamu' })}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        formData.income_type === 'kamu'
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Kamu
                    </button>
                  </div>
                </div>

                {/* TTO Geliri */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    TTO Geliri mi?
                    <span className="ml-1 text-xs text-slate-500">(Komisyon kesintisi)</span>
                  </label>
                  {(() => {
                    const currentRemainingBudget = selectedProject.remaining_budget ?? selectedProject.budget
                    const grossAmount = parseFloat(formData.gross_amount) || 0
                    const newRemainingBudget = currentRemainingBudget - grossAmount
                    const totalCommissionDue = selectedProject.total_commission_due ?? 0
                    const totalCommissionCollected = selectedProject.total_commission_collected ?? 0
                    const remainingCommission = totalCommissionDue - totalCommissionCollected
                    const canSelectNonTTO = newRemainingBudget >= remainingCommission

                    return (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, is_tto_income: true })}
                          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            formData.is_tto_income
                              ? 'bg-teal-600 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Evet, TTO (Komisyon kesilir)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (canSelectNonTTO) {
                              setFormData({ ...formData, is_tto_income: false })
                            }
                          }}
                          disabled={!canSelectNonTTO}
                          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            !formData.is_tto_income
                              ? 'bg-teal-600 text-white'
                              : canSelectNonTTO
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          title={!canSelectNonTTO ? 'Kalan bütçe komisyon alacağını karşılayamıyor' : ''}
                        >
                          Hayır, TTO Değil
                          {!canSelectNonTTO && <span className="ml-1 text-xs">(Engelli)</span>}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Calculation Preview */}
          {formData.gross_amount && parseFloat(formData.gross_amount) > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-2 text-slate-700" />
                Hesaplama Önizlemesi
                {selectedProject?.has_withholding_tax && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                    Tevkifatlı Proje
                  </span>
                )}
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Brüt Tutar</p>
                  <p className="text-sm font-bold text-slate-900">
                    ₺{calculatedAmounts.gross_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Tam KDV (%{formData.vat_rate})</p>
                  <p className="text-sm font-bold text-slate-600">
                    ₺{calculatedAmounts.full_vat_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                {selectedProject?.has_withholding_tax && calculatedAmounts.withholding_tax_amount > 0 && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <p className="text-xs text-orange-700 font-medium mb-1">
                      Tevkifat (%{selectedProject.withholding_tax_rate})
                    </p>
                    <p className="text-sm font-bold text-orange-600">
                      -₺{calculatedAmounts.withholding_tax_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">Karşı taraf öder</p>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    {selectedProject?.has_withholding_tax ? 'Ödenen KDV' : 'KDV'}
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    -₺{calculatedAmounts.paid_vat_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">Net Tutar</p>
                  <p className="text-sm font-bold text-slate-900">
                    ₺{calculatedAmounts.net_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium mb-1">
                    Şirket (%{selectedProject?.company_rate || 0})
                  </p>
                  <p className="text-sm font-bold text-orange-600">
                    -₺{calculatedAmounts.company_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium mb-1">Dağıtılabilir</p>
                  <p className="text-sm font-bold text-emerald-600">
                    ₺{calculatedAmounts.distributable_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Tevkifat Açıklaması */}
              {selectedProject?.has_withholding_tax && calculatedAmounts.withholding_tax_amount > 0 && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-800">
                    <strong>Tevkifat:</strong> Karşı taraf KDV'nin %{selectedProject.withholding_tax_rate}'ını
                    (₺{calculatedAmounts.withholding_tax_amount.toLocaleString('tr-TR')}) doğrudan devlete öder.
                    Bize ödenen KDV: ₺{calculatedAmounts.paid_vat_amount.toLocaleString('tr-TR')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard/incomes"
              className="px-3 py-2 border border-slate-300 rounded text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 bg-teal-600 text-white rounded text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Kaydediliyor...' : 'Gelir Kaydet'}
            </button>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  )
}