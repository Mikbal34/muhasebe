'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { ArrowLeft, Save, User, Mail, Phone, CreditCard, IdCard, FileText } from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Personnel {
  id: string
  full_name: string
  email: string
  phone: string | null
  iban: string | null
  tc_no: string | null
  notes: string | null
  is_active: boolean
  title: string | null
  gender: string | null
  start_date: string | null
  faculty: string | null
  department: string | null
  university: string | null
}

export default function EditPersonnelPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [personnel, setPersonnel] = useState<Personnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
        return
      }

      fetchPersonnel(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchPersonnel = async (token: string) => {
    try {
      const response = await fetch(`/api/personnel/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await response.json()

      if (data.success) {
        const p = data.data.personnel
        setPersonnel(p)
        setFormData({
          full_name: p.full_name,
          email: p.email,
          phone: p.phone || '',
          iban: p.iban || '',
          tc_no: p.tc_no || '',
          notes: p.notes || '',
          is_active: p.is_active,
          title: p.title || '',
          gender: p.gender || '',
          start_date: p.start_date || '',
          faculty: p.faculty || '',
          department: p.department || '',
          university: p.university || 'Yıldız Teknik Üniversitesi',
        })
      } else {
        alert('Personel bulunamadı')
        router.push('/dashboard/personnel')
      }
    } catch (err) {
      console.error('Error fetching personnel:', err)
      alert('Bir hata oluştu')
      router.push('/dashboard/personnel')
    } finally {
      setLoading(false)
    }
  }

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

    setSaving(true)

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

      const response = await fetch(`/api/personnel/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        alert(data.message || 'Personel güncellendi')
        router.push(`/dashboard/personnel/${params.id}` as any)
      } else {
        alert(data.message || 'Güncelleme başarısız')
      }
    } catch (error) {
      console.error('Error updating personnel:', error)
      alert('Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || !personnel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/dashboard/personnel/${params.id}` as any}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Personel Detayına Dön
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Personel Düzenle</h1>
          <p className="text-gray-600 mt-1">{personnel.full_name}</p>
        </div>

        {/* Form - Same as new page but with edit */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
          {/* Kişisel Bilgiler */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Kişisel Bilgiler</h2>

            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 inline mr-1" />
                Ad Soyad *
              </label>
              <input
                type="text"
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
            </div>

            <div>
              <label htmlFor="tc_no" className="block text-sm font-medium text-gray-700 mb-1">
                <IdCard className="h-4 w-4 inline mr-1" />
                TC Kimlik No
              </label>
              <input
                type="text"
                id="tc_no"
                value={formData.tc_no}
                onChange={(e) => setFormData({ ...formData, tc_no: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.tc_no ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={11}
              />
              {errors.tc_no && <p className="mt-1 text-sm text-red-600">{errors.tc_no}</p>}
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
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">İletişim Bilgileri</h2>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Telefon
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ödeme Bilgileri */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Ödeme Bilgileri</h2>

            <div>
              <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="h-4 w-4 inline mr-1" />
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
                  errors.iban ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={26}
              />
              {errors.iban && <p className="mt-1 text-sm text-red-600">{errors.iban}</p>}
            </div>
          </div>

          {/* Kurum Bilgileri */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Kurum Bilgileri</h2>

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
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Ek Bilgiler</h2>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="h-4 w-4 inline mr-1" />
                Notlar
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Aktif personel
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Link
              href={`/dashboard/personnel/${params.id}` as any}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Güncelle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
