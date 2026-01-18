'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  User,
  Save,
  ArrowLeft,
  Shield,
  Building2,
  Mail,
  Eye,
  EyeOff
} from 'lucide-react'
import { useInvalidateUsers } from '@/hooks/use-users'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

export default function NewUserPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'manager' as 'admin' | 'manager'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const invalidateUsers = useInvalidateUsers()

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

      // Only admin and manager can create users
      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard/users')
        return
      }
    } catch (err) {
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

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

    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz'
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Şifre gereklidir'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır'
    }

    if (!formData.role) {
      newErrors.role = 'Rol seçimi gereklidir'
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

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        // Cache'i invalidate et
        invalidateUsers()

        // Başarılı - kullanıcılar listesine yönlendir
        alert('Kullanıcı başarıyla oluşturuldu!')
        router.push('/dashboard/users')
      } else {
        setErrors({ submit: data.message || 'Kullanıcı oluşturulurken hata oluştu' })
      }
    } catch (err) {
      console.error('Create user error:', err)
      setErrors({ submit: 'Kullanıcı oluşturulurken hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          color: 'bg-navy/10 text-navy',
          icon: Shield,
          text: 'Yönetici',
          description: 'Tam sistem erişimi'
        }
      case 'manager':
        return {
          color: 'bg-gold/20 text-gold',
          icon: Building2,
          text: 'Mali İşler',
          description: 'Tam sistem erişimi'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!['admin', 'manager'].includes(user.role)) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Yetkisi Yok</h3>
          <p className="text-gray-600">Bu sayfaya sadece yöneticiler erişebilir.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/users"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Yeni Kullanıcı Ekle
              </h1>
              <p className="text-sm text-slate-600">Sisteme yeni kullanıcı ekleyin</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Kullanıcı Bilgileri</h2>
            <p className="text-sm text-gray-600 mt-1">Yeni kullanıcının temel bilgilerini girin</p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-800">{errors.submit}</div>
                </div>
              </div>
            )}

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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${
                    errors.full_name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Kullanıcının ad ve soyadını girin"
                />
                {errors.full_name && (
                  <p className="text-red-600 text-sm mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-posta Adresi *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="kullanici@example.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 pr-10 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="En az 6 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Kullanıcı Rolü *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['admin', 'manager'] as const).map((role) => {
                  const roleInfo = getRoleInfo(role)
                  const RoleIcon = roleInfo.icon
                  const isSelected = formData.role === role

                  return (
                    <div
                      key={role}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-navy bg-navy/5'
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
                          isSelected ? 'border-navy bg-navy' : 'border-gray-300'
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

            {/* Info Box */}
            <div className="bg-navy/5 border border-navy/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-navy mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-navy">Giriş Bilgileri</h4>
                  <p className="text-sm text-slate-700 mt-1">
                    Kullanıcı sisteme girilen e-posta adresi ve şifre ile giriş yapabilecektir.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                href="/dashboard/users"
                className="px-3 py-2 border border-gray-300 text-sm font-semibold rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </DashboardLayout>
  )
}