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
  GraduationCap,
  Mail,
  UserPlus,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react'

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
    role: 'manager' as 'admin' | 'manager' | 'manager'
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

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

      // Only admin can create users
      if (parsedUser.role !== 'admin') {
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
        setGeneratedPassword(data.data.tempPassword)
        setShowPasswordModal(true)
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

  const copyToClipboard = async () => {
    if (generatedPassword) {
      try {
        await navigator.clipboard.writeText(generatedPassword)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy password:', err)
      }
    }
  }

  const closePasswordModal = () => {
    setShowPasswordModal(false)
    setGeneratedPassword(null)
    setCopied(false)
    setShowPassword(false)
    // Reset form
    setFormData({
      full_name: '',
      email: '',
      role: 'manager'
    })
    router.push('/dashboard/users')
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (user.role !== 'admin') {
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="kullanici@example.com"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email}</p>
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
                          ? 'border-teal-500 bg-teal-50'
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
                          isSelected ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Otomatik E-posta Gönderimi</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Kullanıcı oluşturulduktan sonra, geçici şifre ile birlikte e-posta gönderilecektir.
                    Kullanıcı ilk girişte şifresini değiştirmek zorunda kalacaktır.
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
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors"
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

      {/* Password Modal */}
      {showPasswordModal && generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Kullanıcı Başarıyla Oluşturuldu!
              </h3>
              <p className="text-sm text-gray-600">
                Aşağıdaki geçici şifre oluşturuldu. Bu şifreyi güvenli bir yerde saklayın ve kullanıcıya iletin.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                {formData.email}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geçici Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={generatedPassword}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm pr-20"
                />
                <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Kopyala"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {copied && (
                <p className="text-xs text-green-600 mt-1">Şifre panoya kopyalandı!</p>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Önemli Not</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Bu şifre sadece bir kez gösteriliyor. Lütfen güvenli bir yerde saklayın ve kullanıcıya güvenli bir şekilde iletin.
                    İlk girişte kullanıcı şifresini değiştirebilir.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={closePasswordModal}
                className="px-6 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 transition-colors"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}