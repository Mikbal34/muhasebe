'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { ArrowLeft, Save, User, Mail, Phone, CreditCard, IdCard, FileText, Building2, GraduationCap, Calendar } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

export default function NewPersonnelPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    iban: '',
    tc_no: '',
    notes: '',
    is_active: true,
    title: '',
    gender: '',
    start_date: '',
    faculty: '',
    department: '',
    university: 'Yıldız Teknik Üniversitesi',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
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

      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Ad soyad gereklidir'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email gereklidir'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz'
    }

    if (formData.iban && formData.iban.replace(/\s/g, '').length !== 26) {
      newErrors.iban = 'IBAN 26 karakter olmalıdır'
    }

    if (formData.tc_no && formData.tc_no.length !== 11) {
      newErrors.tc_no = 'TC Kimlik No 11 karakter olmalıdır'
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

    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const payload = {
        ...formData,
        iban: formData.iban ? formData.iban.replace(/\s/g, '') : null,
        phone: formData.phone || null,
        tc_no: formData.tc_no || null,
        notes: formData.notes || null,
        title: formData.title || null,
        gender: formData.gender || null,
        start_date: formData.start_date || null,
        faculty: formData.faculty || null,
        department: formData.department || null,
        university: formData.university || null,
      }

      const response = await fetch('/api/personnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || 'Personel başarıyla oluşturuldu')
        router.push('/dashboard/personnel')
      } else {
        alert(data.message || 'Personel oluşturulamadı')
      }
    } catch (error) {
      console.error('Error creating personnel:', error)
      alert('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
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
              href="/dashboard/personnel"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yeni Personel Ekle</h1>
              <p className="text-sm text-slate-600">Projelerde görev alacak yeni personel ekleyin</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          {/* Kişisel Bilgiler */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Kişisel Bilgiler</h2>

            {/* Ad Soyad */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                }`}
                placeholder="Ahmet Yılmaz"
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
            </div>

            {/* TC Kimlik No */}
            <div>
              <label htmlFor="tc_no" className="block text-sm font-medium text-gray-700 mb-1">
                TC Kimlik No
              </label>
              <input
                type="text"
                id="tc_no"
                value={formData.tc_no}
                onChange={(e) => setFormData({ ...formData, tc_no: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.tc_no ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                }`}
                placeholder="12345678901"
                maxLength={11}
              />
              {errors.tc_no && <p className="mt-1 text-sm text-red-600">{errors.tc_no}</p>}
              <p className="mt-1 text-xs text-gray-500">Ödeme işlemleri için gerekli olabilir</p>
            </div>

            {/* Unvan ve Cinsiyet - Yan Yana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Unvan */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Unvan
                </label>
                <select
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="Prof. Dr.">Prof. Dr.</option>
                  <option value="Doç. Dr.">Doç. Dr.</option>
                  <option value="Dr. Öğr. Üyesi">Dr. Öğr. Üyesi</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Araş. Gör. Dr.">Araş. Gör. Dr.</option>
                  <option value="Araş. Gör.">Araş. Gör.</option>
                  <option value="Öğr. Gör.">Öğr. Gör.</option>
                  <option value="Uzman">Uzman</option>
                </select>
              </div>

              {/* Cinsiyet */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Cinsiyet
                </label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="ERKEK">Erkek</option>
                  <option value="KADIN">Kadın</option>
                </select>
              </div>
            </div>

            {/* Başlama Tarihi */}
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Başlama Tarihi
              </label>
              <input
                type="date"
                id="start_date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">İletişim Bilgileri</h2>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                }`}
                placeholder="ahmet@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Telefon */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="0532 123 45 67"
              />
            </div>
          </div>

          {/* Ödeme Bilgileri */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Ödeme Bilgileri</h2>

            {/* IBAN */}
            <div>
              <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                IBAN
              </label>
              <input
                type="text"
                id="iban"
                value={formData.iban}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, '').toUpperCase()
                  setFormData({ ...formData, iban: value })
                }}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.iban ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-teal-500'
                }`}
                placeholder="TR00 0000 0000 0000 0000 0000 00"
                maxLength={26}
              />
              {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban}</p>}
              <p className="mt-1 text-xs text-gray-500">Gelir dağılımı ödemelerini almak için gerekli</p>
            </div>
          </div>

          {/* Kurum Bilgileri */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Kurum Bilgileri</h2>

            {/* Üniversite */}
            <div>
              <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">
                Üniversite
              </label>
              <input
                type="text"
                id="university"
                value={formData.university}
                onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Yıldız Teknik Üniversitesi"
              />
            </div>

            {/* Fakülte ve Bölüm - Yan Yana */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fakülte */}
              <div>
                <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-1">
                  Fakülte
                </label>
                <input
                  type="text"
                  id="faculty"
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Mühendislik Fakültesi"
                />
              </div>

              {/* Bölüm */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  Bölüm
                </label>
                <input
                  type="text"
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Bilgisayar Mühendisliği"
                />
              </div>
            </div>
          </div>

          {/* Notlar */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Ek Bilgiler</h2>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notlar
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Personel hakkında not..."
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Aktif personel
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/dashboard/personnel"
              className="px-3 py-2 border border-gray-300 text-sm font-semibold rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
