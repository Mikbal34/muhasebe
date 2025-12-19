'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { MoneyInput } from '@/components/ui/money-input'
import Link from 'next/link'
import { Receipt, ArrowLeft, Save, Building2, Calendar, FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
        // Filter only active projects
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

  // Get selected project for calculation preview
  const selectedProject = projects.find(p => p.id === formData.project_id)

  // Calculate TTO and distributable amounts
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
      // TTO gideri: Sadece TTO payı kadar TTO'dan düşer
      const ttoAmount = formData.amount * rate / 100
      return { ttoAmount, distributableAmount: 0 }
    } else if (formData.expense_share_type === 'shared') {
      // Ortak gider: TTO payı TTO'dan, temsilci payı dağıtılabilirden düşer
      const ttoAmount = formData.amount * rate / 100
      const distributableAmount = formData.amount * (100 - rate) / 100
      return { ttoAmount, distributableAmount }
    } else {
      // Karşı taraf gideri: Tamamı dağıtılabilirden düşer
      return {
        ttoAmount: 0,
        distributableAmount: formData.amount
      }
    }
  }

  const amounts = calculateAmounts()

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Proje gideri için proje seçimi zorunlu
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

      // Build request body based on expense type
      const requestBody = {
        expense_type: formData.expense_type,
        amount: formData.amount,
        description: formData.description,
        expense_date: formData.expense_date,
        // Only include project_id for proje type
        ...(formData.expense_type === 'proje' && { project_id: formData.project_id }),
        // Only include is_tto_expense and expense_share_type for proje type
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
        alert('Gider başarıyla oluşturuldu')
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
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header Skeleton */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded" />
              <div>
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>

          {/* Form Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 space-y-4">
              {/* Expense Type */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-md" />
                  <Skeleton className="h-10 flex-1 rounded-md" />
                </div>
              </div>

              {/* Project */}
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              {/* TTO Toggle */}
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1 rounded-md" />
                  <Skeleton className="h-10 flex-1 rounded-md" />
                </div>
              </div>

              {/* Amount */}
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              {/* Description */}
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>

              {/* Date */}
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>

            {/* Form Actions */}
            <div className="px-4 py-4 border-t border-slate-200 flex justify-end gap-2">
              <Skeleton className="h-10 w-16 rounded" />
              <Skeleton className="h-10 w-32 rounded" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/expenses"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yeni Gider Ekle</h1>
              <p className="text-sm text-slate-600">Genel veya proje gideri kaydı oluşturun</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 space-y-4">
            {/* Expense Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gider Tipi *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expense_type: 'genel', project_id: '' })}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.expense_type === 'genel'
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Genel Gider
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, expense_type: 'proje' })}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.expense_type === 'proje'
                      ? 'bg-teal-600 text-white hover:bg-teal-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Proje Gideri
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formData.expense_type === 'genel'
                  ? 'Genel giderler %100 TTO bakiyesinden düşer ve projeyle ilişkilendirilmez.'
                  : 'Proje giderleri seçilen projeyle ilişkilendirilir.'}
              </p>
            </div>

            {/* Project Selection - Only for Proje type */}
            {formData.expense_type === 'proje' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  Proje *
                </label>
                <select
                  className={`w-full px-4 py-2 border rounded-md focus:ring-teal-500 focus:border-teal-500 ${
                    errors.project_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={formData.project_id}
                  onChange={(e) => {
                    const projectId = e.target.value
                    setFormData({ ...formData, project_id: projectId })
                    setErrors({ ...errors, project_id: '' })
                    if (projectId) {
                      fetchProjectCollected(projectId)
                    } else {
                      setProjectCollected(0)
                    }
                  }}
                >
                  <option value="">Proje seçiniz...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
                {errors.project_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
                )}

                {/* Proje Özet Kartları */}
                {selectedProject && (
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Proje Bütçesi</p>
                      <p className="text-lg font-semibold text-slate-900">
                        ₺{selectedProject.budget?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0'}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <p className="text-xs text-green-600 mb-1">Tahsil Edilen</p>
                      <p className="text-lg font-semibold text-green-700">
                        ₺{projectCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                      <p className="text-xs text-teal-600 mb-1">TTO Oranı</p>
                      <p className="text-lg font-semibold text-teal-700">
                        %{selectedProject.company_rate}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Expense Payer Selection - Only for Proje type */}
            {formData.expense_type === 'proje' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gideri Kim Ödeyecek?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_tto_expense: true, expense_share_type: 'client' })}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.is_tto_expense
                        ? 'bg-teal-600 text-white hover:bg-teal-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    TTO
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_tto_expense: false, expense_share_type: 'shared' })}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !formData.is_tto_expense && formData.expense_share_type === 'shared'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Ortak
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_tto_expense: false, expense_share_type: 'client' })}
                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !formData.is_tto_expense && formData.expense_share_type === 'client'
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Karşı Taraf
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formData.is_tto_expense
                    ? 'TTO Gideri: Sadece TTO bakiyesinden düşer.'
                    : formData.expense_share_type === 'shared'
                    ? 'Ortak Gider: TTO ve temsilcilerden oransal düşülür.'
                    : 'Karşı Taraf Gideri: Tamamı dağıtılabilir miktardan düşülür.'}
                </p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tutar (₺) *
              </label>
              <MoneyInput
                value={formData.amount.toString()}
                onChange={(value) => {
                  setFormData({ ...formData, amount: parseFloat(value) || 0 })
                  setErrors({ ...errors, amount: '' })
                }}
                placeholder="0,00"
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${errors.amount ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Açıklama *
              </label>
              <textarea
                rows={3}
                className={`w-full px-4 py-2 border rounded-md focus:ring-teal-500 focus:border-teal-500 ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Gider açıklaması (örn: Ofis kira ödemesi, Ekipman alımı, vs.)"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value })
                  setErrors({ ...errors, description: '' })
                }}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            {/* Expense Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Gider Tarihi *
              </label>
              <input
                type="date"
                className={`w-full px-4 py-2 border rounded-md focus:ring-teal-500 focus:border-teal-500 ${
                  errors.expense_date ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.expense_date}
                onChange={(e) => {
                  setFormData({ ...formData, expense_date: e.target.value })
                  setErrors({ ...errors, expense_date: '' })
                }}
              />
              {errors.expense_date && (
                <p className="mt-1 text-sm text-red-600">{errors.expense_date}</p>
              )}
            </div>

            {/* Calculation Preview */}
            {formData.amount > 0 && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-medium text-slate-700 mb-3">Hesaplama Önizlemesi</h4>

                {formData.expense_type === 'genel' ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">TTO&apos;dan Düşecek (%100):</span>
                    <span className="text-sm font-semibold text-red-600">
                      ₺{formData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : selectedProject && amounts ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Toplam Gider:</span>
                      <span className="text-sm font-semibold text-slate-900">
                        ₺{formData.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {formData.is_tto_expense ? (
                      // TTO Gideri
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          TTO&apos;dan Düşecek (%{selectedProject.company_rate}):
                        </span>
                        <span className="text-sm font-semibold text-red-600">
                          ₺{amounts.ttoAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ) : formData.expense_share_type === 'shared' ? (
                      // Ortak Gider
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">
                            TTO Payı (%{selectedProject.company_rate}):
                          </span>
                          <span className="text-sm font-semibold text-red-600">
                            ₺{amounts.ttoAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">
                            Temsilciler Payı (%{100 - selectedProject.company_rate}):
                          </span>
                          <span className="text-sm font-semibold text-amber-600">
                            ₺{amounts.distributableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    ) : (
                      // Karşı Taraf Gideri
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Dağıtılabilirden Düşecek:</span>
                        <span className="text-sm font-semibold text-amber-600">
                          ₺{amounts.distributableAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                      {formData.is_tto_expense
                        ? 'TTO gideri: Sadece TTO bakiyesinden düşülür.'
                        : formData.expense_share_type === 'shared'
                        ? 'Ortak gider: TTO payı TTO bakiyesinden, temsilci payı dağıtılabilir miktardan düşülür.'
                        : 'Karşı taraf gideri: Tamamı dağıtılabilir miktardan düşülür.'}
                    </p>
                  </div>
                ) : formData.expense_type === 'proje' && !selectedProject ? (
                  <p className="text-sm text-slate-500">Hesaplama için proje seçiniz.</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="px-4 py-4 border-t border-slate-200 flex justify-end gap-2">
            <Link
              href="/dashboard/expenses"
              className="px-3 py-2 border border-gray-300 text-sm font-semibold rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Gider Oluştur
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
