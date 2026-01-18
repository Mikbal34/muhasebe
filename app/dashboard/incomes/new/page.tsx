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
  TrendingUp,
  Calculator,
  Save,
  Tags
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

    const fullVatAmount = (grossAmount * vatRate) / (100 + vatRate)

    let withholdingTaxAmount = 0
    let paidVatAmount = fullVatAmount

    if (hasWithholdingTax && withholdingTaxRate > 0) {
      withholdingTaxAmount = (fullVatAmount * withholdingTaxRate) / 100
      paidVatAmount = fullVatAmount - withholdingTaxAmount
    }

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

    if (!formData.project_id) {
      newErrors.project_id = 'Proje seçimi gereklidir'
    } else {
      const selectedProject = projects.find(p => p.id === formData.project_id)
      if (!selectedProject) {
        newErrors.project_id = 'Seçilen proje geçerli değil'
      }
    }

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
      }
    }

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

    const vatRate = parseFloat(formData.vat_rate)
    if (isNaN(vatRate)) {
      newErrors.vat_rate = 'Geçerli bir KDV oranı giriniz'
    } else if (vatRate < 0) {
      newErrors.vat_rate = 'KDV oranı negatif olamaz'
    } else if (vatRate > 100) {
      newErrors.vat_rate = 'KDV oranı %100\'den fazla olamaz'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Açıklama 500 karakterden uzun olamaz'
    }

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

      const response = await fetch('/api/incomes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      })

      const data = await response.json()

      if (data.success) {
        invalidateIncomes()
        invalidateDashboard()

        const selectedProject = projects.find(p => p.id === formData.project_id)
        if (selectedProject) {
          notifyIncomeCreated(selectedProject.name, parseFloat(formData.gross_amount))
        }

        triggerNotificationRefresh()
        router.push('/dashboard/incomes')
      } else {
        const errorMessage = data.error || 'Gelir kaydı oluşturulamadı'

        if (response.status === 400) {
          setErrors({ submit: `Geçersiz veri: ${errorMessage}` })
        } else if (response.status === 401) {
          setErrors({ submit: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.' })
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
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
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/incomes"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <Wallet className="w-6 h-6 text-gold" />
              Yeni Gelir
            </h1>
            <p className="text-sm text-slate-500">Yeni bir gelir kaydı oluşturun</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gelir Bilgileri */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold rounded-t-xl" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Gelir Bilgileri
                  </h2>

                  <div className="space-y-4">
                    <div className="relative z-50">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Brüt Tutar (₺) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.gross_amount}
                          onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                          placeholder="100000"
                        />
                        {errors.gross_amount && <p className="mt-1 text-xs text-red-600">{errors.gross_amount}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          KDV Oranı (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.vat_rate}
                          onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        />
                        {errors.vat_rate && <p className="mt-1 text-xs text-red-600">{errors.vat_rate}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Gelir Tarihi *
                        </label>
                        <input
                          type="date"
                          value={formData.income_date}
                          onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        />
                        {errors.income_date && <p className="mt-1 text-xs text-red-600">{errors.income_date}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Açıklama
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm resize-none"
                        placeholder="Gelir ile ilgili açıklama..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Gelir Tipi Seçenekleri */}
              {selectedProject && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-5">
                    <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                      <Tags className="w-5 h-5" />
                      Gelir Tipi Seçenekleri
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* FSMH */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          FSMH Geliri mi?
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_fsmh_income: true })}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              formData.is_fsmh_income
                                ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Evet
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_fsmh_income: false })}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              !formData.is_fsmh_income
                                ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Hayır
                          </button>
                        </div>
                      </div>

                      {/* Özel/Kamu */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Gelir Tipi
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, income_type: 'ozel' })}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              formData.income_type === 'ozel'
                                ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Özel
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, income_type: 'kamu' })}
                            className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              formData.income_type === 'kamu'
                                ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            Kamu
                          </button>
                        </div>
                      </div>

                      {/* TTO */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          TTO Geliri mi?
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
                                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                  formData.is_tto_income
                                    ? 'bg-navy text-white shadow-lg shadow-navy/20'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                              >
                                TTO
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (canSelectNonTTO) {
                                    setFormData({ ...formData, is_tto_income: false })
                                  }
                                }}
                                disabled={!canSelectNonTTO}
                                className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                  !formData.is_tto_income
                                    ? 'bg-gold text-white shadow-lg shadow-gold/20'
                                    : canSelectNonTTO
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                TTO Dışı
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Hesaplama Önizlemesi */}
              {formData.gross_amount && parseFloat(formData.gross_amount) > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-5">
                    <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Hesaplama Önizlemesi
                      {selectedProject?.has_withholding_tax && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                          Tevkifatlı Proje
                        </span>
                      )}
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Brüt Tutar</p>
                        <p className="text-sm font-black text-navy">
                          ₺{calculatedAmounts.gross_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">KDV (%{formData.vat_rate})</p>
                        <p className="text-sm font-black text-slate-600">
                          ₺{calculatedAmounts.full_vat_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      {selectedProject?.has_withholding_tax && calculatedAmounts.withholding_tax_amount > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                          <p className="text-[10px] text-amber-700 font-bold uppercase mb-1">
                            Tevkifat (%{selectedProject.withholding_tax_rate})
                          </p>
                          <p className="text-sm font-black text-amber-600">
                            -₺{calculatedAmounts.withholding_tax_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-[10px] text-red-600 font-bold uppercase mb-1">Ödenen KDV</p>
                        <p className="text-sm font-black text-red-600">
                          -₺{calculatedAmounts.paid_vat_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Net Tutar</p>
                        <p className="text-sm font-black text-navy">
                          ₺{calculatedAmounts.net_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-gold/10 p-3 rounded-lg border border-gold/30">
                        <p className="text-[10px] text-gold font-bold uppercase mb-1">TTO (%{selectedProject?.company_rate || 0})</p>
                        <p className="text-sm font-black text-gold">
                          -₺{calculatedAmounts.company_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 md:col-span-2 lg:col-span-1">
                        <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Dağıtılabilir</p>
                        <p className="text-sm font-black text-emerald-600">
                          ₺{calculatedAmounts.distributable_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Link
                  href="/dashboard/incomes"
                  className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-all shadow-lg shadow-gold/20 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Gelir Kaydet
                    </>
                  )}
                </button>
              </div>

              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}
            </div>

            {/* Right Column - Project Summary & Commission Status */}
            <div className="space-y-6">
              {/* Proje Bilgileri */}
              {selectedProject && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-5">
                    <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Proje Bilgileri
                    </h2>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Proje Kodu</span>
                        <span className="text-sm font-bold text-navy">{selectedProject.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Bütçe</span>
                        <span className="text-sm font-bold">₺{selectedProject.budget.toLocaleString('tr-TR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">TTO Komisyonu</span>
                        <span className="text-sm font-bold text-gold">%{selectedProject.company_rate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">KDV Oranı</span>
                        <span className="text-sm font-bold">%{selectedProject.vat_rate}</span>
                      </div>
                      {selectedProject.has_withholding_tax && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Tevkifat</span>
                          <span className="text-sm font-bold text-amber-600">%{selectedProject.withholding_tax_rate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Komisyon Durumu */}
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
                  <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                    <div className="p-5">
                      <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Komisyon Durumu
                      </h2>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Komisyon Tahsilatı</span>
                            <span className="font-bold text-navy">%{commissionProgress.toFixed(1)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-gold h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(commissionProgress, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-3 rounded-lg">
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Toplam</p>
                            <p className="text-sm font-black text-navy">₺{totalCommissionDue.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-lg">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Alınan</p>
                            <p className="text-sm font-black text-emerald-600">₺{totalCommissionCollected.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-lg">
                            <p className="text-[10px] text-amber-600 font-bold uppercase">Kalan</p>
                            <p className="text-sm font-black text-amber-600">₺{remainingCommission.toLocaleString('tr-TR')}</p>
                          </div>
                          <div className={`p-3 rounded-lg ${newRemainingBudget < 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                            <p className={`text-[10px] font-bold uppercase ${newRemainingBudget < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              Yeni Bütçe
                            </p>
                            <p className={`text-sm font-black ${newRemainingBudget < 0 ? 'text-red-600' : 'text-navy'}`}>
                              ₺{newRemainingBudget.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        </div>

                        {!canSelectNonTTO && grossAmount > 0 && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700">
                              <span className="font-bold">TTO Dışı Seçilemez:</span> Kalan bütçe komisyon alacağını karşılayamıyor.
                            </p>
                          </div>
                        )}

                        {canSelectNonTTO && grossAmount > 0 && remainingCommission > 0 && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-emerald-700">
                              <span className="font-bold">TTO Dışı Seçilebilir:</span> Bütçe komisyon alacağını karşılıyor.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )
              })()}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
