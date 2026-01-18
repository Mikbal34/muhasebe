'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { MoneyInput } from '@/components/ui/money-input'
import Link from 'next/link'
import {
  Receipt,
  ArrowLeft,
  Save,
  Building2,
  Calendar,
  FileText,
  TrendingDown,
  Wallet,
  Percent,
  DollarSign,
  AlertTriangle,
  Calculator,
  Tags
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useInvalidateExpenses } from '@/hooks/use-expenses'
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
  status: string
  company_rate: number
  budget: number
}

type ExpenseType = 'genel' | 'proje'

export default function NewExpensePage() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [projectCollected, setProjectCollected] = useState<number>(0)
  const router = useRouter()
  const invalidateExpenses = useInvalidateExpenses()
  const invalidateDashboard = useInvalidateDashboard()

  const [formData, setFormData] = useState({
    expense_type: 'proje' as ExpenseType,
    project_id: '',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    is_tto_expense: true,
    expense_share_type: 'client' as 'shared' | 'client'
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

      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }

      fetchProjects(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

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
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectCollected = async (projectId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/incomes?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        const total = (data.data.incomes || []).reduce(
          (sum: number, inc: any) => sum + (inc.collected_amount || 0), 0
        )
        setProjectCollected(total)
      }
    } catch (err) {
      console.error('Failed to fetch project collected:', err)
      setProjectCollected(0)
    }
  }

  const selectedProject = projects.find(p => p.id === formData.project_id)

  const calculateAmounts = () => {
    if (!selectedProject || formData.amount <= 0) return null

    if (formData.expense_type === 'genel') {
      return {
        ttoAmount: formData.amount,
        distributableAmount: 0
      }
    }

    const rate = selectedProject.company_rate || 15

    if (formData.is_tto_expense) {
      const ttoAmount = formData.amount * rate / 100
      return { ttoAmount, distributableAmount: 0 }
    } else if (formData.expense_share_type === 'shared') {
      const ttoAmount = formData.amount * rate / 100
      const distributableAmount = formData.amount * (100 - rate) / 100
      return { ttoAmount, distributableAmount }
    } else {
      return {
        ttoAmount: 0,
        distributableAmount: formData.amount
      }
    }
  }

  const amounts = calculateAmounts()

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (formData.expense_type === 'proje' && !formData.project_id) {
      newErrors.project_id = 'Proje gideri için proje seçimi zorunludur'
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Geçerli bir tutar giriniz'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama zorunludur'
    }

    if (!formData.expense_date) {
      newErrors.expense_date = 'Gider tarihi zorunludur'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      const token = localStorage.getItem('token')

      const requestBody = {
        expense_type: formData.expense_type,
        amount: formData.amount,
        description: formData.description,
        expense_date: formData.expense_date,
        ...(formData.expense_type === 'proje' && { project_id: formData.project_id }),
        ...(formData.expense_type === 'proje' && {
          is_tto_expense: formData.is_tto_expense,
          expense_share_type: formData.is_tto_expense ? 'client' : formData.expense_share_type
        })
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        invalidateExpenses()
        invalidateDashboard()
        router.push('/dashboard/expenses')
      } else {
        alert(data.error || 'Gider oluşturulamadı')
      }
    } catch (err) {
      console.error('Failed to create expense:', err)
      alert('Gider oluşturulurken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
            <p className="mt-2 text-slate-600">Yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <TrendingDown className="w-6 h-6 text-red-500" />
              Yeni Gider
            </h1>
            <p className="text-sm text-slate-500">Yeni bir gider kaydı oluşturun</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gider Tipi */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold rounded-t-xl" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Tags className="w-5 h-5" />
                    Gider Tipi
                  </h2>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, expense_type: 'genel', project_id: '' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.expense_type === 'genel'
                          ? 'bg-gold/10 border-gold shadow-lg shadow-gold/10'
                          : 'bg-white border-slate-200 hover:border-gold/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        formData.expense_type === 'genel' ? 'bg-gold text-white' : 'bg-gold/10 text-gold'
                      }`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <h3 className={`font-bold ${formData.expense_type === 'genel' ? 'text-gold' : 'text-slate-700'}`}>
                        Genel Gider
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">TTO genel işletme giderleri</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, expense_type: 'proje' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.expense_type === 'proje'
                          ? 'bg-navy/5 border-navy shadow-lg shadow-navy/10'
                          : 'bg-white border-slate-200 hover:border-navy/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        formData.expense_type === 'proje' ? 'bg-navy text-white' : 'bg-slate-100 text-navy'
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <h3 className={`font-bold ${formData.expense_type === 'proje' ? 'text-navy' : 'text-slate-700'}`}>
                        Proje Gideri
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Projeye özel giderler</p>
                    </button>
                  </div>
                </div>
              </section>

              {/* Gider Bilgileri */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold rounded-t-xl" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Gider Bilgileri
                  </h2>

                  <div className="space-y-4">
                    {/* Proje Seçimi - Sadece Proje Gideri için */}
                    {formData.expense_type === 'proje' && (
                      <div className="relative z-50">
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Proje *
                        </label>
                        <SearchableSelect
                          options={projects}
                          value={formData.project_id}
                          onChange={(value) => {
                            setFormData({ ...formData, project_id: value })
                            setErrors({ ...errors, project_id: '' })
                            if (value) {
                              fetchProjectCollected(value)
                            } else {
                              setProjectCollected(0)
                            }
                          }}
                          placeholder="Proje seçiniz veya kod yazarak arayın..."
                          error={!!errors.project_id}
                        />
                        {errors.project_id && <p className="mt-1 text-xs text-red-600">{errors.project_id}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Tutar (₺) *
                        </label>
                        <MoneyInput
                          value={formData.amount.toString()}
                          onChange={(value) => {
                            setFormData({ ...formData, amount: parseFloat(value) || 0 })
                            setErrors({ ...errors, amount: '' })
                          }}
                          placeholder="0,00"
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm ${errors.amount ? 'border-red-500' : 'border-slate-200'}`}
                        />
                        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Gider Tarihi *
                        </label>
                        <input
                          type="date"
                          value={formData.expense_date}
                          onChange={(e) => {
                            setFormData({ ...formData, expense_date: e.target.value })
                            setErrors({ ...errors, expense_date: '' })
                          }}
                          className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm ${errors.expense_date ? 'border-red-500' : 'border-slate-200'}`}
                        />
                        {errors.expense_date && <p className="mt-1 text-xs text-red-600">{errors.expense_date}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Açıklama *
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => {
                          setFormData({ ...formData, description: e.target.value })
                          setErrors({ ...errors, description: '' })
                        }}
                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm resize-none ${errors.description ? 'border-red-500' : 'border-slate-200'}`}
                        placeholder="Gider açıklaması (örn: Ofis kira ödemesi, Ekipman alımı, vs.)"
                      />
                      {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
                    </div>
                  </div>
                </div>
              </section>

              {/* Gideri Ödeyen - Sadece Proje Gideri için */}
              {formData.expense_type === 'proje' && selectedProject && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-5">
                    <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      Gideri Kim Ödeyecek?
                    </h2>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_tto_expense: true, expense_share_type: 'client' })}
                        className={`p-3 rounded-lg text-sm font-bold transition-all ${
                          formData.is_tto_expense
                            ? 'bg-gold text-white shadow-lg shadow-gold/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        TTO
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_tto_expense: false, expense_share_type: 'shared' })}
                        className={`p-3 rounded-lg text-sm font-bold transition-all ${
                          !formData.is_tto_expense && formData.expense_share_type === 'shared'
                            ? 'bg-navy text-white shadow-lg shadow-navy/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Ortak
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_tto_expense: false, expense_share_type: 'client' })}
                        className={`p-3 rounded-lg text-sm font-bold transition-all ${
                          !formData.is_tto_expense && formData.expense_share_type === 'client'
                            ? 'bg-gold text-white shadow-lg shadow-gold/20'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Karşı Taraf
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {formData.is_tto_expense
                        ? 'TTO Gideri: Sadece TTO bakiyesinden düşer.'
                        : formData.expense_share_type === 'shared'
                        ? 'Ortak Gider: TTO ve temsilcilerden oransal düşülür.'
                        : 'Karşı Taraf Gideri: Tamamı dağıtılabilir miktardan düşülür.'}
                    </p>
                  </div>
                </section>
              )}

              {/* Hesaplama Önizlemesi */}
              {formData.amount > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                  <div className="p-5">
                    <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5" />
                      Hesaplama Önizlemesi
                    </h2>

                    {formData.expense_type === 'genel' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Toplam Gider</p>
                          <p className="text-lg font-black text-navy">
                            ₺{formData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-gold/10 p-3 rounded-lg border border-gold/30">
                          <p className="text-[10px] text-gold font-bold uppercase mb-1">TTO&apos;dan Düşecek (%100)</p>
                          <p className="text-lg font-black text-gold">
                            -₺{formData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ) : selectedProject && amounts ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Toplam Gider</p>
                          <p className="text-sm font-black text-navy">
                            ₺{formData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {formData.is_tto_expense ? (
                          <div className="bg-navy/10 p-3 rounded-lg border border-navy/20">
                            <p className="text-[10px] text-navy font-bold uppercase mb-1">TTO (%{selectedProject.company_rate})</p>
                            <p className="text-sm font-black text-navy">
                              -₺{amounts.ttoAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        ) : formData.expense_share_type === 'shared' ? (
                          <>
                            <div className="bg-navy/10 p-3 rounded-lg border border-navy/20">
                              <p className="text-[10px] text-navy font-bold uppercase mb-1">TTO (%{selectedProject.company_rate})</p>
                              <p className="text-sm font-black text-navy">
                                -₺{amounts.ttoAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="bg-gold/10 p-3 rounded-lg border border-gold/30">
                              <p className="text-[10px] text-gold font-bold uppercase mb-1">Temsilci (%{100 - selectedProject.company_rate})</p>
                              <p className="text-sm font-black text-gold">
                                -₺{amounts.distributableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-gold/10 p-3 rounded-lg border border-gold/30">
                            <p className="text-[10px] text-gold font-bold uppercase mb-1">Dağıtılabilirden</p>
                            <p className="text-sm font-black text-gold">
                              -₺{amounts.distributableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : formData.expense_type === 'proje' && !selectedProject ? (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                        <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Hesaplama için proje seçiniz</p>
                      </div>
                    ) : null}
                  </div>
                </section>
              )}

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3">
                <Link
                  href="/dashboard/expenses"
                  className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-navy text-white font-bold rounded-lg hover:bg-navy/90 disabled:opacity-50 transition-all shadow-lg shadow-navy/20 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Gider Kaydet
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column - Info Sidebar */}
            <div className="space-y-6">
              {/* Proje Bilgileri */}
              {formData.expense_type === 'proje' && selectedProject && (
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
                        <span className="text-sm text-slate-500">TTO Oranı</span>
                        <span className="text-sm font-bold text-gold">%{selectedProject.company_rate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Tahsil Edilen</span>
                        <span className="text-sm font-bold text-navy">₺{projectCollected.toLocaleString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Gider Tipleri Bilgisi */}
              <section className="bg-navy/5 rounded-xl border border-navy/10 p-5">
                <h3 className="text-sm font-bold text-navy mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Gider Tipleri Hakkında
                </h3>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Receipt className="w-3 h-3 text-gold" />
                    </div>
                    <div>
                      <span className="font-bold text-gold">Genel Gider</span>
                      <p className="text-slate-500 mt-0.5">TTO&apos;nun genel işletme giderleri. %100 TTO&apos;dan düşer.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-3 h-3 text-navy" />
                    </div>
                    <div>
                      <span className="font-bold text-navy">TTO Gideri</span>
                      <p className="text-slate-500 mt-0.5">Proje bazlı TTO payından düşülen giderler.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wallet className="w-3 h-3 text-slate-600" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Karşı Taraf</span>
                      <p className="text-slate-500 mt-0.5">Temsilci payından düşülen giderler.</p>
                    </div>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
