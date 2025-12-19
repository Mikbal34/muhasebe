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
import { MoneyInput } from '@/components/ui/money-input'
import { useProjectNotifications } from '@/contexts/notification-context'
import { triggerNotificationRefresh } from '@/utils/notifications'
import { supabase } from '@/lib/supabase/client'
import PersonPicker, { Person, PersonType } from '@/components/ui/person-picker'
import PersonBadge from '@/components/ui/person-badge'
import { PaymentPlanSection, Installment } from '@/components/projects/payment-plan-section'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface ProjectRepresentative {
  id: string // person id (either user_id or personnel_id)
  type: PersonType // 'user' or 'personnel'
  user_id?: string | null
  personnel_id?: string | null
  role: 'project_leader' | 'researcher'
  person: Person // full person data
}

export default function NewProjectPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
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
    vat_rate: '18',
    has_withholding_tax: false,
    withholding_tax_rate: '0',
    referee_payment: '0',
    referee_payer: 'company',
    stamp_duty_payer: 'company',
    stamp_duty_amount: '0',
    contract_path: '',
    sent_to_referee: false,
    referee_approved: false,
    referee_approval_date: '',
    has_assignment_permission: false,
    assignment_document_path: ''
  })

  const [contractFile, setContractFile] = useState<File | null>(null)
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingAssignment, setUploadingAssignment] = useState(false)

  const [representatives, setRepresentatives] = useState<ProjectRepresentative[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Payment plan state
  const [paymentPlanEnabled, setPaymentPlanEnabled] = useState(false)
  const [installments, setInstallments] = useState<Installment[]>([])

  // State for PersonPicker
  const [selectedPersonId, setSelectedPersonId] = useState('')

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
        router.push('/dashboard/projects')
        return
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

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

    // Check for exactly one project leader
    const leaderCount = representatives.filter(rep => rep.role === 'project_leader').length
    if (leaderCount === 0) {
      newErrors.representatives = 'Bir proje yürütücüsü seçilmelidir'
    } else if (leaderCount > 1) {
      newErrors.representatives = 'Sadece bir proje yürütücüsü seçilmelidir'
    }

    // Validate payment plan
    if (paymentPlanEnabled) {
      if (installments.length === 0) {
        newErrors.payment_plan = 'Ödeme planı için en az bir taksit eklenmeli'
      } else {
        const total = installments.reduce((sum, inst) => sum + inst.gross_amount, 0)
        const budgetNum = parseFloat(formData.budget) || 0
        // Bütçeyi aşamaz, altında kalabilir (kısmi taksitlendirme)
        if (total > budgetNum + 0.01) {
          newErrors.payment_plan = `Taksit toplamı (${total.toLocaleString('tr-TR')} ₺) proje bütçesini (${budgetNum.toLocaleString('tr-TR')} ₺) aşamaz`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addRepresentative = (personId: string, personType: PersonType, person: Person) => {
    // Check if already added
    if (representatives.some(rep => rep.id === personId)) return

    // First representative is project_leader, rest are researchers
    const newRepresentative: ProjectRepresentative = {
      id: personId,
      type: personType,
      user_id: personType === 'user' ? personId : null,
      personnel_id: personType === 'personnel' ? personId : null,
      role: representatives.length === 0 ? 'project_leader' : 'researcher',
      person: person
    }

    setRepresentatives([...representatives, newRepresentative])
  }

  const removeRepresentative = (personId: string) => {
    setRepresentatives(representatives.filter(rep => rep.id !== personId))
  }

  const updateRepresentativeRole = (personId: string, role: 'project_leader' | 'researcher') => {
    // If setting as project_leader, remove project_leader from others
    if (role === 'project_leader') {
      setRepresentatives(representatives.map(rep =>
        rep.id === personId
          ? { ...rep, role: 'project_leader' }
          : { ...rep, role: 'researcher' }
      ))
    } else {
      setRepresentatives(representatives.map(rep =>
        rep.id === personId ? { ...rep, role } : rep
      ))
    }
  }

  const handleFileUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error } = await supabase.storage
        .from('contracts')
        .upload(filePath, file)

      if (error) {
        console.error('Upload error:', error)
        return null
      }

      return filePath
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      let uploadedContractPath = null
      let uploadedAssignmentPath = null

      // Upload contract file if selected
      if (contractFile) {
        setUploading(true)
        uploadedContractPath = await handleFileUpload(contractFile)
        setUploading(false)

        if (!uploadedContractPath) {
          setErrors({ submit: 'Sözleşme yüklenirken bir hata oluştu' })
          setLoading(false)
          return
        }
      }

      // Upload assignment document if selected and permission is granted
      if (formData.has_assignment_permission && assignmentFile) {
        setUploadingAssignment(true)
        uploadedAssignmentPath = await handleFileUpload(assignmentFile)
        setUploadingAssignment(false)

        if (!uploadedAssignmentPath) {
          setErrors({ submit: 'Görevlendirme belgesi yüklenirken bir hata oluştu' })
          setLoading(false)
          return
        }
      }

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
          has_withholding_tax: formData.has_withholding_tax,
          withholding_tax_rate: formData.has_withholding_tax ? parseFloat(formData.withholding_tax_rate) : 0,
          referee_payment: parseFloat(formData.referee_payment) || 0,
          referee_payer: formData.referee_payer,
          stamp_duty_payer: formData.stamp_duty_payer,
          stamp_duty_amount: parseFloat(formData.stamp_duty_amount) || 0,
          contract_path: uploadedContractPath,
          sent_to_referee: formData.sent_to_referee,
          referee_approved: formData.referee_approved,
          referee_approval_date: formData.referee_approval_date || null,
          has_assignment_permission: formData.has_assignment_permission,
          assignment_document_path: uploadedAssignmentPath,
          representatives: representatives.map(rep => ({
            user_id: rep.user_id,
            personnel_id: rep.personnel_id,
            role: rep.role
          })),
          payment_plan: paymentPlanEnabled ? {
            enabled: true,
            installments: installments.map(inst => ({
              installment_number: inst.installment_number,
              gross_amount: inst.gross_amount,
              income_date: inst.income_date,
              description: inst.description || null
            }))
          } : undefined
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

  // Computed values
  const excludedPersonIds = representatives.map(rep => rep.id)

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

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/projects"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yeni Proje</h1>
              <p className="text-sm text-slate-600">Yeni bir proje oluşturun</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
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
                <MoneyInput
                  value={formData.budget}
                  onChange={(value) => setFormData({ ...formData, budget: value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1.000.000"
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

              {/* KDV ve Tevkifat */}
              <div className="md:col-span-2 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">KDV Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <div className="flex items-center">
                      <input
                        id="has_withholding_tax"
                        type="checkbox"
                        checked={formData.has_withholding_tax}
                        onChange={(e) => setFormData({
                          ...formData,
                          has_withholding_tax: e.target.checked,
                          withholding_tax_rate: e.target.checked ? formData.withholding_tax_rate : '0'
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="has_withholding_tax" className="ml-2 block text-sm text-gray-900">
                        Tevkifat Uygulanıyor
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      KDV tevkifatı varsa işaretleyin
                    </p>
                  </div>

                  {formData.has_withholding_tax && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tevkifat Oranı (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.withholding_tax_rate}
                        onChange={(e) => setFormData({ ...formData, withholding_tax_rate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Örn: 50 (5/10 için)"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        KDV tutarının yüzde kaçı tevkif edilecek?
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hakem Heyeti Ödemesini Kim Yapacak?
                </label>
                <select
                  value={formData.referee_payer}
                  onChange={(e) => setFormData({ ...formData, referee_payer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">TTO (Şirket)</option>
                  <option value="academic">Akademisyen</option>
                  <option value="client">Karşı Taraf (Müşteri)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hakem Heyeti Ödemesi (₺)
                </label>
                <MoneyInput
                  value={formData.referee_payment}
                  onChange={(value) => setFormData({ ...formData, referee_payment: value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.referee_payer === 'company'
                    ? 'Bu tutar her tahsilatta oransal olarak TTO payından düşülecektir.'
                    : formData.referee_payer === 'academic'
                    ? 'Bu tutar her tahsilatta oransal olarak akademisyen bakiyelerinden düşülecektir.'
                    : 'Bu tutar sadece kayıt amaçlıdır, bakiyelerden düşülmez.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Damga Vergisini Kim Ödeyecek?
                </label>
                <select
                  value={formData.stamp_duty_payer}
                  onChange={(e) => setFormData({ ...formData, stamp_duty_payer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">TTO (Şirket)</option>
                  <option value="academic">Akademisyen</option>
                  <option value="client">Karşı Taraf (Müşteri)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Damga Vergisi Tutarı (₺)
                </label>
                <MoneyInput
                  value={formData.stamp_duty_amount}
                  onChange={(value) => setFormData({ ...formData, stamp_duty_amount: value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.stamp_duty_payer === 'company'
                    ? 'Bu tutar her tahsilatta oransal olarak TTO payından düşülecektir.'
                    : formData.stamp_duty_payer === 'academic'
                    ? 'Bu tutar her tahsilatta oransal olarak akademisyen bakiyelerinden düşülecektir.'
                    : 'Bu tutar sadece kayıt amaçlıdır, bakiyelerden düşülmez.'}
                </p>
              </div>

              {/* Hakem Heyeti Bilgileri */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Hakem Heyeti Durumu</h3>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="sent_to_referee"
                      type="checkbox"
                      checked={formData.sent_to_referee}
                      onChange={(e) => setFormData({
                        ...formData,
                        sent_to_referee: e.target.checked,
                        // Gönderilmedi ise onay da kaldırılsın
                        referee_approved: e.target.checked ? formData.referee_approved : false,
                        referee_approval_date: e.target.checked ? formData.referee_approval_date : ''
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="sent_to_referee" className="ml-2 block text-sm text-gray-900">
                      Hakem heyetine gönderildi
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="referee_approved"
                      type="checkbox"
                      checked={formData.referee_approved}
                      disabled={!formData.sent_to_referee}
                      onChange={(e) => setFormData({ ...formData, referee_approved: e.target.checked })}
                      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${!formData.sent_to_referee ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor="referee_approved" className={`ml-2 block text-sm ${!formData.sent_to_referee ? 'text-gray-400' : 'text-gray-900'}`}>
                      Hakem heyeti onayı alındı
                    </label>
                  </div>

                  {formData.referee_approved && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Onay Tarihi
                      </label>
                      <input
                        type="date"
                        value={formData.referee_approval_date}
                        onChange={(e) => setFormData({ ...formData, referee_approval_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <p className="text-sm text-gray-600">
                    ⚠️ Hakem heyeti onayı olmadan gelir kaydı yapılamaz.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sözleşme (PDF)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Dosya Seç</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                setErrors({ ...errors, file: 'Sadece PDF dosyaları yüklenebilir' })
                                return
                              }
                              setContractFile(file)
                              setErrors({ ...errors, file: '' })
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">veya sürükleyip bırakın</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF (max 10MB)
                    </p>
                    {contractFile && (
                      <p className="text-sm text-green-600 font-medium mt-2">
                        Seçilen dosya: {contractFile.name}
                      </p>
                    )}
                    {errors.file && (
                      <p className="text-sm text-red-600 mt-2">
                        {errors.file}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Akademisyen Görevlendirme İzni */}
              <div className="md:col-span-2">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      id="assignment-permission"
                      type="checkbox"
                      checked={formData.has_assignment_permission}
                      onChange={(e) => setFormData({ ...formData, has_assignment_permission: e.target.checked })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="assignment-permission" className="block text-sm font-medium text-gray-700">
                      Akademisyen görevlendirme izni var mı?
                      <p className="text-xs text-gray-500 font-normal mt-1">
                        Eğer işaretlenirse, görevlendirme belgesi yükleme alanı görünecektir.
                      </p>
                    </label>
                  </div>
                </div>
              </div>

              {/* Görevlendirme Belgesi Upload - Sadece izin varsa görünür */}
              {formData.has_assignment_permission && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Görevlendirme Yazısı (PDF)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label
                          htmlFor="assignment-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>Dosya Seç</span>
                          <input
                            id="assignment-upload"
                            name="assignment-upload"
                            type="file"
                            className="sr-only"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                if (file.type !== 'application/pdf') {
                                  setErrors({ ...errors, assignmentFile: 'Sadece PDF dosyaları yüklenebilir' })
                                  return
                                }
                                if (file.size > 10 * 1024 * 1024) {
                                  setErrors({ ...errors, assignmentFile: 'Dosya boyutu 10MB\'dan küçük olmalı' })
                                  return
                                }
                                setAssignmentFile(file)
                                setErrors({ ...errors, assignmentFile: '' })
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">veya sürükleyip bırakın</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PDF (max 10MB)
                      </p>
                      {assignmentFile && (
                        <p className="text-sm text-green-600 font-medium mt-2">
                          Seçilen dosya: {assignmentFile.name}
                        </p>
                      )}
                      {errors.assignmentFile && (
                        <p className="text-sm text-red-600 mt-2">
                          {errors.assignmentFile}
                        </p>
                      )}
                      {uploadingAssignment && (
                        <p className="text-sm text-blue-600 mt-2">
                          Yükleniyor...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Proje Temsilcileri
            </h2>

            {/* Add Representative */}
            <div className="mb-6">
              <PersonPicker
                value={selectedPersonId}
                onChange={(personId, personType, person) => {
                  addRepresentative(personId, personType, person)
                  setSelectedPersonId('') // Reset after adding
                }}
                excludeIds={excludedPersonIds}
                label="Temsilci Ekle"
                placeholder="Bir kullanıcı veya personel seçin..."
                required={false}
              />
            </div>

            {/* Representatives List */}
            <div className="space-y-4">
              {representatives.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {rep.role === 'project_leader' && (
                        <Crown className="h-5 w-5 text-yellow-500 mr-2" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{rep.person.full_name}</p>
                          <PersonBadge type={rep.type} size="sm" />
                        </div>
                        <p className="text-sm text-gray-600">{rep.person.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={rep.role}
                      onChange={(e) => updateRepresentativeRole(rep.id, e.target.value as 'project_leader' | 'researcher')}
                      className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="project_leader">🏆 Proje Yürütücüsü</option>
                      <option value="researcher">🔬 Araştırmacı</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeRepresentative(rep.id)}
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
                  Şirket Komisyonu: {formData.company_rate}%
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  * Bakiye dağıtımı manuel olarak yapılacaktır
                </p>
              </div>
            )}

            {errors.representatives && (
              <p className="mt-2 text-sm text-red-600">{errors.representatives}</p>
            )}
          </div>

          {/* Payment Plan */}
          <PaymentPlanSection
            budget={parseFloat(formData.budget) || 0}
            startDate={formData.start_date}
            enabled={paymentPlanEnabled}
            installments={installments}
            onEnabledChange={setPaymentPlanEnabled}
            onInstallmentsChange={setInstallments}
          />
          {errors.payment_plan && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md -mt-2">
              <p className="text-sm text-red-600">{errors.payment_plan}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end space-x-2">
            <Link
              href="/dashboard/projects"
              className="px-3 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-2 bg-teal-600 text-white rounded text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
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