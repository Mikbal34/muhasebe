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
  Percent
} from 'lucide-react'
import { useIncomeNotifications } from '@/contexts/notification-context'
import { triggerNotificationRefresh } from '@/utils/notifications'

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
}

export default function NewIncomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const router = useRouter()
  const { notifyIncomeCreated } = useIncomeNotifications()

  const [formData, setFormData] = useState({
    project_id: '',
    gross_amount: '',
    description: '',
    income_date: new Date().toISOString().split('T')[0],
    vat_rate: '18'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [calculatedAmounts, setCalculatedAmounts] = useState({
    gross_amount: 0,
    vat_amount: 0,
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

    // KDV hesaplama: brütGelir × kdvOranı ÷ 100
    const vatAmount = (grossAmount * vatRate) / 100
    const netAmount = grossAmount - vatAmount
    const companyAmount = (netAmount * companyRate) / 100
    const distributableAmount = netAmount - companyAmount

    setCalculatedAmounts({
      gross_amount: grossAmount,
      vat_amount: vatAmount,
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
        income_date: formData.income_date
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  const selectedProject = projects.find(p => p.id === formData.project_id)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/incomes"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yeni Gelir</h1>
              <p className="text-gray-600">Yeni bir gelir kaydı oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Wallet className="h-5 w-5 mr-2" />
              Gelir Bilgileri
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proje *
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value)
                    setFormData({
                      ...formData,
                      project_id: e.target.value,
                      vat_rate: project?.vat_rate.toString() || '18'
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Proje seçiniz...</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
                {errors.project_id && <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brüt Tutar (₺) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.gross_amount}
                  onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="100000"
                />
                {errors.gross_amount && <p className="mt-1 text-sm text-red-600">{errors.gross_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  KDV Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.vat_rate}
                  onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.vat_rate && <p className="mt-1 text-sm text-red-600">{errors.vat_rate}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gelir Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.income_date}
                  onChange={(e) => setFormData({ ...formData, income_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {errors.income_date && <p className="mt-1 text-sm text-red-600">{errors.income_date}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Gelir ile ilgili açıklama..."
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          {selectedProject && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-md font-semibold text-blue-900 mb-3 flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Seçilen Proje Detayları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-700 font-medium">Proje Kodu</p>
                  <p className="text-blue-900">{selectedProject.code}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Bütçe</p>
                  <p className="text-blue-900">₺{selectedProject.budget.toLocaleString('tr-TR')}</p>
                </div>
                <div>
                  <p className="text-blue-700 font-medium">Şirket Komisyonu</p>
                  <p className="text-blue-900">%{selectedProject.company_rate}</p>
                </div>
              </div>
            </div>
          )}

          {/* Calculation Preview */}
          {formData.gross_amount && parseFloat(formData.gross_amount) > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Hesaplama Önizlemesi
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <DollarSign className="h-6 w-6 text-green-600 bg-green-100 rounded p-1" />
                    <div className="ml-3">
                      <p className="text-xs text-green-700 font-medium">Brüt Tutar</p>
                      <p className="text-lg font-bold text-green-600">
                        ₺{calculatedAmounts.gross_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center">
                    <Percent className="h-6 w-6 text-red-600 bg-red-100 rounded p-1" />
                    <div className="ml-3">
                      <p className="text-xs text-red-700 font-medium">KDV (%{formData.vat_rate})</p>
                      <p className="text-lg font-bold text-red-600">
                        ₺{calculatedAmounts.vat_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <DollarSign className="h-6 w-6 text-blue-600 bg-blue-100 rounded p-1" />
                    <div className="ml-3">
                      <p className="text-xs text-blue-700 font-medium">Net Tutar</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₺{calculatedAmounts.net_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <Building2 className="h-6 w-6 text-orange-600 bg-orange-100 rounded p-1" />
                    <div className="ml-3">
                      <p className="text-xs text-orange-700 font-medium">
                        Şirket (%{selectedProject?.company_rate || 0})
                      </p>
                      <p className="text-lg font-bold text-orange-600">
                        ₺{calculatedAmounts.company_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center">
                    <Wallet className="h-6 w-6 text-purple-600 bg-purple-100 rounded p-1" />
                    <div className="ml-3">
                      <p className="text-xs text-purple-700 font-medium">Dağıtılabilir</p>
                      <p className="text-lg font-bold text-purple-600">
                        ₺{calculatedAmounts.distributable_amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/incomes"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor...' : 'Gelir Kaydet'}
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