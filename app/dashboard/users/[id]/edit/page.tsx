'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  User,
  Save,
  ArrowLeft,
  Shield,
  Building2,
  GraduationCap,
  Mail,
  Phone,
  CreditCard,
  Edit,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface UserData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager'
  phone: string | null
  iban: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EditUserPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    role: 'manager' as 'admin' | 'manager' | 'manager',
    phone: '',
    iban: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userDataLocal = localStorage.getItem('user')

    if (!token || !userDataLocal) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userDataLocal)
      setUser(parsedUser)

      // Only admin can edit other users
      if (parsedUser.role !== 'admin') {
        router.push('/dashboard/users')
        return
      }

      fetchUserData(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, userId])

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const result = await response.json()

      if (result.success) {
        setUserData(result.data.user)
        setFormData({
          full_name: result.data.user.full_name,
          role: result.data.user.role,
          phone: result.data.user.phone || '',
          iban: result.data.user.iban || ''
        })
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Ad soyad gereklidir'
    }

    if (!formData.role) {
      newErrors.role = 'Rol seçimi gereklidir'
    }

    if (formData.iban && formData.iban.length > 0) {
      // Basic IBAN validation for Turkey (starts with TR)
      if (!formData.iban.startsWith('TR') || formData.iban.length !== 26) {
        newErrors.iban = 'Geçerli bir IBAN giriniz (TR ile başlamalı ve 26 karakter olmalı)'
      }
    }

    if (formData.phone && formData.phone.length > 0) {
      // Basic phone validation
      if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Geçerli bir telefon numarası giriniz'
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

    setSaving(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Kullanıcı başarıyla güncellendi!')
        setTimeout(() => {
          router.push(`/dashboard/users/${userId}` as any)
        }, 1500)
      } else {
        setErrors({ submit: data.message || 'Kullanıcı güncellenirken hata oluştu' })
      }
    } catch (err) {
      console.error('Update user error:', err)
      setErrors({ submit: 'Kullanıcı güncellenirken hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          color: 'bg-red-100 text-red-800',
          icon: Shield,
          text: 'Yönetici',
          description: 'Tam sistem erişimi'
        }
      case 'manager':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: Building2,
          text: 'Mali İşler',
          description: 'Mali işlemler ve raporlar'
        }
      case 'manager':
        return {
          color: 'bg-green-100 text-green-800',
          icon: GraduationCap,
          text: 'Akademisyen',
          description: 'Proje ve ödeme görüntüleme'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: User,
          text: role,
          description: ''
        }
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

  if (!userData) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Kullanıcı Bulunamadı</h3>
          <p className="text-gray-600 mb-4">İstenen kullanıcı bulunamadı.</p>
          <Link
            href="/dashboard/users"
            className="text-blue-600 hover:text-blue-800"
          >
            Kullanıcılar listesine dön
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/dashboard/users/${userId}` as any}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Edit className="h-7 w-7 mr-3 text-blue-600" />
                Kullanıcı Düzenle
              </h1>
              <p className="text-gray-600">{userData.full_name}</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Kullanıcı Bilgileri</h2>
            <p className="text-gray-600 text-sm mt-1">Kullanıcının bilgilerini güncelleyin</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800">{errors.submit}</span>
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.full_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Kullanıcının ad ve soyadını girin"
                />
                {errors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={userData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">E-posta adresi değiştirilemez</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+90 555 123 4567"
                />
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* IBAN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CreditCard className="h-4 w-4 inline mr-1" />
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban}
                  onChange={(e) => handleInputChange('iban', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.iban ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="TR33 0006 1005 1978 6457 8413 26"
                  maxLength={26}
                />
                {errors.iban && (
                  <p className="text-red-600 text-sm mt-1">{errors.iban}</p>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Kullanıcı Rolü *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['admin', 'manager', 'manager'] as const).map((role) => {
                  const roleInfo = getRoleInfo(role)
                  const RoleIcon = roleInfo.icon
                  const isSelected = formData.role === role

                  return (
                    <div
                      key={role}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('role', role)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                          <RoleIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{roleInfo.text}</div>
                          <div className="text-sm text-gray-600">{roleInfo.description}</div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white scale-50"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {errors.role && (
                <p className="text-red-600 text-sm mt-2">{errors.role}</p>
              )}
            </div>

            {/* Warning for role change */}
            {formData.role !== userData.role && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900">Rol Değişikliği Uyarısı</h4>
                    <p className="text-sm text-yellow-800 mt-1">
                      Kullanıcının rolünü değiştiriyorsunuz. Bu, kullanıcının sistem erişim yetkilerini etkileyecektir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                href={`/dashboard/users/${userId}` as any}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}