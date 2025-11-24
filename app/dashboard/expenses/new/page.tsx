'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { MoneyInput } from '@/components/ui/money-input'
import Link from 'next/link'
import { Receipt, ArrowLeft, Save, Building2, Calendar, FileText } from 'lucide-react'

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
}

export default function NewExpensePage() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const [formData, setFormData] = useState({
    project_id: '',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0]
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

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.project_id) {
      newErrors.project_id = 'Proje seçimi zorunludur'
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
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
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
              <p className="text-sm text-slate-600">Projeye ait gider kaydı oluşturun</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-4 space-y-4">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline h-4 w-4 mr-1" />
                Proje *
              </label>
              <select
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                  errors.project_id ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.project_id}
                onChange={(e) => {
                  setFormData({ ...formData, project_id: e.target.value })
                  setErrors({ ...errors, project_id: '' })
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
            </div>

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
                rows={4}
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
                className={`w-full px-4 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
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
