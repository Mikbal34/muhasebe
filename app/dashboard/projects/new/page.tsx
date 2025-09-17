'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Plus,
  X,
  User,
  Crown
} from 'lucide-react'
import { useProjectNotifications } from '@/contexts/notification-context'
import { triggerNotificationRefresh } from '@/utils/notifications'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface ProjectRepresentative {
  user_id: string
  share_percentage: number
  is_lead: boolean
  user?: {
    id: string
    full_name: string
    email: string
  }
}

export default function NewProjectPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const router = useRouter()
  const { notifyProjectCreated } = useProjectNotifications()

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    budget: '',
    start_date: '',
    end_date: '',
    company_rate: '10',
    vat_rate: '18'
  })

  const [representatives, setRepresentatives] = useState<ProjectRepresentative[]>([])
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

      fetchUsers(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users.filter((u: User) => u.role === 'academician') || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) {
      newErrors.code = 'Proje kodu gerekli'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Proje adı gerekli'
    }

    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Geçerli bir bütçe giriniz'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Başlangıç tarihi gerekli'
    }

    if (!formData.end_date) {
      newErrors.end_date = 'Bitiş tarihi gerekli'
    }

    if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      newErrors.end_date = 'Bitiş tarihi başlangıç tarihinden sonra olmalı'
    }

    if (representatives.length === 0) {
      newErrors.representatives = 'En az bir temsilci eklenmeli'
    }

    const companyRate = parseFloat(formData.company_rate) || 0
    const availableForAcademicians = 100 - companyRate
    const totalPercentage = representatives.reduce((sum, rep) => sum + rep.share_percentage, 0)

    if (totalPercentage !== availableForAcademicians) {
      newErrors.representatives = `Akademisyen payları toplamı ${availableForAcademicians}% olmalı (Şirket: ${companyRate}%, Akademisyenler: ${totalPercentage}%)`
    }

    const leadCount = representatives.filter(rep => rep.is_lead).length
    if (leadCount === 0) {
      newErrors.representatives = 'En az bir lider temsilci seçilmeli'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addRepresentative = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user || representatives.some(rep => rep.user_id === userId)) return

    const newRepresentative: ProjectRepresentative = {
      user_id: userId,
      share_percentage: 0,
      is_lead: representatives.length === 0,
      user: user
    }

    setRepresentatives([...representatives, newRepresentative])
  }

  const removeRepresentative = (userId: string) => {
    setRepresentatives(representatives.filter(rep => rep.user_id !== userId))
  }

  const updateRepresentativeShare = (userId: string, share: number) => {
    setRepresentatives(representatives.map(rep =>
      rep.user_id === userId ? { ...rep, share_percentage: share } : rep
    ))
  }

  const toggleLeadRole = (userId: string) => {
    setRepresentatives(representatives.map(rep =>
      rep.user_id === userId ? { ...rep, is_lead: !rep.is_lead } : rep
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          company_rate: parseFloat(formData.company_rate),
          vat_rate: parseFloat(formData.vat_rate),
          representatives: representatives.map(rep => ({
            user_id: rep.user_id,
            share_percentage: rep.share_percentage,
            is_lead: rep.is_lead
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        // Trigger notification for new project
        notifyProjectCreated(formData.name, formData.code)

        // Refresh notifications to show server-side notifications
        triggerNotificationRefresh()

        router.push('/dashboard/projects')
      } else {
        setErrors({ submit: data.error || 'Proje oluşturulamadı' })
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

  const availableUsers = users.filter(u => !representatives.some(rep => rep.user_id === u.id))
  const totalPercentage = representatives.reduce((sum, rep) => sum + rep.share_percentage, 0)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/projects"
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Yeni Proje</h1>
              <p className="text-gray-600">Yeni bir proje oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Temel Bilgiler
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proje Kodu *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="PRJ-2024-001"
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proje Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AI Tabanlı Sistem Geliştirme"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Proje hakkında detaylı açıklama..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bütçe (₺) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000000"
                />
                {errors.budget && <p className="mt-1 text-sm text-red-600">{errors.budget}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şirket Komisyon Oranı (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.company_rate}
                  onChange={(e) => setFormData({ ...formData, company_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.end_date && <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>}
              </div>
            </div>
          </div>

          {/* Representatives */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Proje Temsilcileri
            </h2>

            {/* Add Representative */}
            {availableUsers.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temsilci Ekle
                </label>
                <select
                  onChange={(e) => e.target.value && addRepresentative(e.target.value)}
                  value=""
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Bir akademisyen seçin...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} - {user.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Representatives List */}
            <div className="space-y-4">
              {representatives.map((rep) => (
                <div key={rep.user_id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {rep.is_lead && (
                        <Crown className="h-4 w-4 text-yellow-500 mr-1" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{rep.user?.full_name}</p>
                        <p className="text-sm text-gray-600">{rep.user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={rep.share_percentage}
                        onChange={(e) => updateRepresentativeShare(rep.user_id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleLeadRole(rep.user_id)}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        rep.is_lead
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {rep.is_lead ? 'Lider' : 'Lider Yap'}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeRepresentative(rep.user_id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {representatives.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Şirket Komisyonu: {formData.company_rate}% | Akademisyenler: {totalPercentage}%
                  {totalPercentage !== (100 - parseFloat(formData.company_rate || '0')) && (
                    <span className="text-red-600 ml-2">
                      ({100 - parseFloat(formData.company_rate || '0')}% olmalı)
                    </span>
                  )}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  * Toplam: {parseFloat(formData.company_rate || '0') + totalPercentage}% (100% olmalı)
                </p>
              </div>
            )}

            {errors.representatives && (
              <p className="mt-2 text-sm text-red-600">{errors.representatives}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3">
            <Link
              href="/dashboard/projects"
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Proje Oluştur'}
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