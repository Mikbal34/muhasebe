'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  Settings,
  Save,
  RefreshCw,
  Shield,
  DollarSign,
  Mail,
  Bell,
  Database,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface SystemSettings {
  company: {
    name: string
    tax_number: string
    address: string
    phone: string
    email: string
  }
  banking: {
    company_iban: string
    bank_name: string
  }
  financial: {
    default_vat_rate: number
    default_company_rate: number
    currency: string
    decimal_places: number
  }
  notifications: {
    email_enabled: boolean
    payment_status_changes: boolean
    new_income_notifications: boolean
    project_updates: boolean
  }
  system: {
    backup_enabled: boolean
    backup_frequency: string
    max_file_size: number
    session_timeout: number
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>({
    company: {
      name: 'Akademik Gelir Dağıtım Sistemi',
      tax_number: '1234567890',
      address: 'Üniversite Kampüsü, Şehir',
      phone: '+90 212 123 4567',
      email: 'info@university.edu.tr'
    },
    banking: {
      company_iban: '',
      bank_name: 'HALKBANK'
    },
    financial: {
      default_vat_rate: 18,
      default_company_rate: 10,
      currency: 'TRY',
      decimal_places: 2
    },
    notifications: {
      email_enabled: true,
      payment_status_changes: true,
      new_income_notifications: true,
      project_updates: true
    },
    system: {
      backup_enabled: true,
      backup_frequency: 'daily',
      max_file_size: 10,
      session_timeout: 60
    }
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)

        // Allow all authenticated users to access settings

        // Load saved settings from localStorage
        const savedSettings = localStorage.getItem('systemSettings')
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings))
        }
      } catch (err) {
        console.error('Failed to parse user data:', err)
        window.location.href = '/login'
      }
    } else {
      window.location.href = '/login'
    }
    setLoading(false)
  }, [])

  const handleInputChange = (section: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))

    // Clear error for this field
    const errorKey = `${section}.${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const validateSettings = () => {
    const newErrors: Record<string, string> = {}

    // Company validation
    if (!settings.company.name.trim()) {
      newErrors['company.name'] = 'Şirket adı gereklidir'
    }
    if (!settings.company.tax_number.trim()) {
      newErrors['company.tax_number'] = 'Vergi numarası gereklidir'
    }
    if (settings.company.tax_number && !/^\d{10}$/.test(settings.company.tax_number)) {
      newErrors['company.tax_number'] = 'Vergi numarası 10 haneli olmalıdır'
    }
    if (!settings.company.email.trim()) {
      newErrors['company.email'] = 'E-posta adresi gereklidir'
    }
    if (settings.company.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.company.email)) {
      newErrors['company.email'] = 'Geçerli bir e-posta adresi giriniz'
    }

    // Financial validation
    if (settings.financial.default_vat_rate < 0 || settings.financial.default_vat_rate > 100) {
      newErrors['financial.default_vat_rate'] = 'KDV oranı 0-100 arasında olmalıdır'
    }
    if (settings.financial.default_company_rate < 0 || settings.financial.default_company_rate > 100) {
      newErrors['financial.default_company_rate'] = 'Şirket komisyonu 0-100 arasında olmalıdır'
    }

    // System validation
    if (settings.system.max_file_size < 1 || settings.system.max_file_size > 100) {
      newErrors['system.max_file_size'] = 'Maksimum dosya boyutu 1-100 MB arasında olmalıdır'
    }
    if (settings.system.session_timeout < 15 || settings.system.session_timeout > 480) {
      newErrors['system.session_timeout'] = 'Oturum süresi 15-480 dakika arasında olmalıdır'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateSettings()) {
      return
    }

    setSaving(true)
    setSuccessMessage('')

    try {
      // Simulate API call - in real app, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Save to localStorage for demo
      localStorage.setItem('systemSettings', JSON.stringify(settings))

      setSuccessMessage('Ayarlar başarıyla kaydedildi!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setErrors({ submit: 'Ayarlar kaydedilemedi' })
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings({
      company: {
        name: 'Akademik Gelir Dağıtım Sistemi',
        tax_number: '1234567890',
        address: 'Üniversite Kampüsü, Şehir',
        phone: '+90 212 123 4567',
        email: 'info@university.edu.tr'
      },
      banking: {
        company_iban: '',
        bank_name: 'HALKBANK'
      },
      financial: {
        default_vat_rate: 18,
        default_company_rate: 10,
        currency: 'TRY',
        decimal_places: 2
      },
      notifications: {
        email_enabled: true,
        payment_status_changes: true,
        new_income_notifications: true,
        project_updates: true
      },
      system: {
        backup_enabled: true,
        backup_frequency: 'daily',
        max_file_size: 10,
        session_timeout: 60
      }
    })
    setErrors({})
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

  // Show different settings based on user role
  const isAdmin = user.role === 'admin'
  const isManager = user.role === 'manager'

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Sistem Ayarları
              </h1>
              <p className="text-sm text-slate-600">
                {isAdmin ? 'Sistem geneli konfigürasyon ayarları' :
                  isManager ? 'Mali işler ve bildirim ayarları' :
                    'Bildirim ve kişisel ayarlar'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {isAdmin && (
                <button
                  onClick={resetToDefaults}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-semibold rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Varsayılanlara Döndür
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-navy hover:bg-navy/90 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-navy/5 border border-navy/20 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-navy mr-2" />
              <span className="text-navy">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Company Settings - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Şirket Bilgileri</h2>
              <p className="text-gray-600 text-sm mt-1">Organizasyon bilgileri ve iletişim detayları</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şirket Adı
                  </label>
                  <input
                    type="text"
                    value={settings.company.name}
                    onChange={(e) => handleInputChange('company', 'name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['company.name'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['company.name'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['company.name']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vergi Numarası
                  </label>
                  <input
                    type="text"
                    value={settings.company.tax_number}
                    onChange={(e) => handleInputChange('company', 'tax_number', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['company.tax_number'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['company.tax_number'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['company.tax_number']}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <textarea
                    value={settings.company.address}
                    onChange={(e) => handleInputChange('company', 'address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={settings.company.phone}
                    onChange={(e) => handleInputChange('company', 'phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => handleInputChange('company', 'email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['company.email'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['company.email'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['company.email']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banking Settings - Admin and Manager */}
        {(isAdmin || isManager) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Banka Bilgileri</h2>
              <p className="text-gray-600 text-sm mt-1">Ödeme talimatları için şirket banka bilgileri</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banka Adı
                  </label>
                  <select
                    value={settings.banking.bank_name}
                    onChange={(e) => handleInputChange('banking', 'bank_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30"
                  >
                    <option value="HALKBANK">Halkbank</option>
                    <option value="ZIRAAT">Ziraat Bankası</option>
                    <option value="VAKIFBANK">VakıfBank</option>
                    <option value="ISBANK">İş Bankası</option>
                    <option value="GARANTI">Garanti BBVA</option>
                    <option value="YAPI_KREDI">Yapı Kredi</option>
                    <option value="AKBANK">Akbank</option>
                    <option value="DENIZBANK">DenizBank</option>
                    <option value="QNB">QNB Finansbank</option>
                    <option value="TEB">TEB</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şirket IBAN
                  </label>
                  <input
                    type="text"
                    value={settings.banking.company_iban}
                    onChange={(e) => {
                      // IBAN formatı: sadece büyük harf ve rakam, max 26 karakter
                      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26)
                      handleInputChange('banking', 'company_iban', value)
                    }}
                    placeholder="TR000000000000000000000000"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 font-mono ${
                      errors['banking.company_iban'] ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors['banking.company_iban'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['banking.company_iban']}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Ödeme talimatı Excel export'larında gönderen IBAN olarak kullanılacak
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Financial Settings - Admin and Manager */}
        {(isAdmin || isManager) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Mali Ayarlar</h2>
              <p className="text-gray-600 text-sm mt-1">Varsayılan finansal parametreler</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varsayılan KDV Oranı (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.financial.default_vat_rate}
                    onChange={(e) => handleInputChange('financial', 'default_vat_rate', parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['financial.default_vat_rate'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['financial.default_vat_rate'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['financial.default_vat_rate']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Varsayılan Şirket Komisyonu (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.financial.default_company_rate}
                    onChange={(e) => handleInputChange('financial', 'default_company_rate', parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['financial.default_company_rate'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['financial.default_company_rate'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['financial.default_company_rate']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Para Birimi
                  </label>
                  <select
                    value={settings.financial.currency}
                    onChange={(e) => handleInputChange('financial', 'currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30"
                  >
                    <option value="TRY">Turkish Lira (₺)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ondalık Basamak Sayısı
                  </label>
                  <select
                    value={settings.financial.decimal_places}
                    onChange={(e) => handleInputChange('financial', 'decimal_places', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30"
                  >
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Settings - All Users */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Bildirim Ayarları</h2>
            <p className="text-gray-600 text-sm mt-1">Sistem bildirimi tercihleri</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">E-posta Bildirimleri</h4>
                  <p className="text-sm text-gray-600">Sistem olayları için e-posta gönderimi</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.email_enabled}
                    onChange={(e) => handleInputChange('notifications', 'email_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Ödeme Durumu Değişiklikleri</h4>
                  <p className="text-sm text-gray-600">Ödeme talimatı durumu güncellendiğinde bildir</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.payment_status_changes}
                    onChange={(e) => handleInputChange('notifications', 'payment_status_changes', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Yeni Gelir Bildirimleri</h4>
                  <p className="text-sm text-gray-600">Yeni gelir kaydı oluşturulduğunda bildir</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.new_income_notifications}
                    onChange={(e) => handleInputChange('notifications', 'new_income_notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Proje Güncellemeleri</h4>
                  <p className="text-sm text-gray-600">Proje oluşturulduğunda ve güncellendiğinde bildir</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications.project_updates}
                    onChange={(e) => handleInputChange('notifications', 'project_updates', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings - Admin Only */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Sistem Ayarları</h2>
              <p className="text-gray-600 text-sm mt-1">Sistem performansı ve güvenlik ayarları</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Otomatik Yedekleme</h4>
                    <p className="text-sm text-gray-600">Veritabanı otomatik yedeklemesi</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.system.backup_enabled}
                      onChange={(e) => handleInputChange('system', 'backup_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-navy/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-navy"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yedekleme Sıklığı
                  </label>
                  <select
                    value={settings.system.backup_frequency}
                    onChange={(e) => handleInputChange('system', 'backup_frequency', e.target.value)}
                    disabled={!settings.system.backup_enabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-50"
                  >
                    <option value="hourly">Saatlik</option>
                    <option value="daily">Günlük</option>
                    <option value="weekly">Haftalık</option>
                    <option value="monthly">Aylık</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimum Dosya Boyutu (MB)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.system.max_file_size}
                    onChange={(e) => handleInputChange('system', 'max_file_size', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['system.max_file_size'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['system.max_file_size'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['system.max_file_size']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Oturum Süresi (dakika)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={settings.system.session_timeout}
                    onChange={(e) => handleInputChange('system', 'session_timeout', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-navy/30 ${errors['system.session_timeout'] ? 'border-red-300' : 'border-gray-300'
                      }`}
                  />
                  {errors['system.session_timeout'] && (
                    <p className="text-red-600 text-sm mt-1">{errors['system.session_timeout']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}