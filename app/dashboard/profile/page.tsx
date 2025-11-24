'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Shield,
  Save,
  Edit,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Alert } from '@/components/ui/form-components'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
  phone: string | null
  iban: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const router = useRouter()

  // Profile form state
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    iban: ''
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      fetchUserProfile(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.profile) {
        const profile = data.data.profile
        setUser(profile)
        setProfileData({
          full_name: profile.full_name,
          email: profile.email,
          phone: profile.phone || '',
          iban: profile.iban || ''
        })
      } else {
        router.push('/login')
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const validateProfileForm = () => {
    const newErrors: Record<string, string> = {}

    if (!profileData.full_name.trim()) {
      newErrors.full_name = 'Ad soyad gerekli'
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email adresi gerekli'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz'
    }

    if (profileData.phone && !/^(\+90|0)?[1-9]\d{9}$/.test(profileData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz'
    }

    if (profileData.iban && !/^TR\d{24}$/.test(profileData.iban.replace(/\s/g, ''))) {
      newErrors.iban = 'Geçerli bir TR IBAN giriniz'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {}

    if (!passwordData.current_password) {
      newErrors.current_password = 'Mevcut şifre gerekli'
    }

    if (!passwordData.new_password) {
      newErrors.new_password = 'Yeni şifre gerekli'
    } else if (passwordData.new_password.length < 8) {
      newErrors.new_password = 'Şifre en az 8 karakter olmalı'
    }

    if (!passwordData.confirm_password) {
      newErrors.confirm_password = 'Şifre tekrarı gerekli'
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      newErrors.confirm_password = 'Şifreler eşleşmiyor'
    }

    if (passwordData.current_password === passwordData.new_password) {
      newErrors.new_password = 'Yeni şifre mevcut şifreden farklı olmalı'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateProfileForm()) {
      return
    }

    setSaving(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: profileData.full_name.trim(),
          email: profileData.email.trim(),
          phone: profileData.phone.trim() || null,
          iban: profileData.iban.replace(/\s/g, '') || null
        })
      })

      const data = await response.json()

      if (data.success) {
        // Update local storage
        const userData = localStorage.getItem('user')
        if (userData) {
          const user = JSON.parse(userData)
          user.full_name = profileData.full_name.trim()
          user.email = profileData.email.trim()
          localStorage.setItem('user', JSON.stringify(user))
        }

        setSuccessMessage('Profil bilgileri başarıyla güncellendi')
        fetchUserProfile(token!)
      } else {
        setErrors({ submit: data.error || 'Profil güncellenemedi' })
      }
    } catch (err) {
      setErrors({ submit: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswordForm()) {
      return
    }

    setChangingPassword(true)
    setErrors({})
    setSuccessMessage('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccessMessage('Şifre başarıyla değiştirildi')
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
        setShowPasswordForm(false)
      } else {
        setErrors({ password_submit: data.error || 'Şifre değiştirilemedi' })
      }
    } catch (err) {
      setErrors({ password_submit: 'Bir hata oluştu' })
    } finally {
      setChangingPassword(false)
    }
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return { text: 'Sistem Yöneticisi', color: 'bg-purple-100 text-purple-800' }
      case 'manager':
        return { text: 'Yönetici', color: 'bg-blue-100 text-blue-800' }
      default:
        return { text: role, color: 'bg-gray-100 text-gray-800' }
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

  const roleInfo = getRoleDisplay(user.role)

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profil Ayarları</h1>
          <p className="text-gray-600">Kişisel bilgilerinizi ve hesap ayarlarınızı yönetin</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert type="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Profil Bilgileri
            </h2>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleInfo.color}`}>
                {roleInfo.text}
              </span>
              {user.is_active ? (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                  Aktif
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Pasif
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ad Soyad"
                  />
                </div>
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Adresi *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+90 555 123 4567"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={profileData.iban}
                    onChange={(e) => setProfileData({ ...profileData, iban: e.target.value })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="TR33 0006 1005 1978 6457 8413 26"
                    maxLength={34}
                  />
                </div>
                {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban}</p>}
                <p className="mt-1 text-xs text-gray-500">
                  Ödeme talimatları için IBAN bilginiz gereklidir
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Kaydediliyor...' : 'Profili Güncelle'}
              </button>
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </form>
        </div>

        {/* Password Change */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Şifre Değiştir
            </h2>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Şifre Değiştir
              </button>
            )}
          </div>

          {!showPasswordForm ? (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Şifrenizi değiştirmek için butona tıklayın</p>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mevcut Şifre *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.current_password && <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.new_password && <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>}
                  <p className="mt-1 text-xs text-gray-500">En az 8 karakter olmalı</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yeni Şifre Tekrarı *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      className="pl-10 pr-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordData({
                      current_password: '',
                      new_password: '',
                      confirm_password: ''
                    })
                    setErrors({})
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {changingPassword && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  {changingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                </button>
              </div>

              {errors.password_submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.password_submit}</p>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Hesap Bilgileri
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700">Hesap Oluşturma Tarihi</p>
              <p className="text-gray-900">{new Date(user.created_at).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Son Güncelleme</p>
              <p className="text-gray-900">{new Date(user.updated_at).toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Kullanıcı ID</p>
              <p className="text-gray-900 font-mono text-sm">{user.id}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700">Hesap Durumu</p>
              <div className="flex items-center mt-1">
                {user.is_active ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600">Aktif</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-red-600">Pasif</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}