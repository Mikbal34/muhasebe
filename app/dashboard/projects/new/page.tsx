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
  Crown,
  Star,
  Percent,
  Receipt,
  Users,
  Upload,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import { useProjectNotifications } from '@/contexts/notification-context'
import { triggerNotificationRefresh } from '@/utils/notifications'
import { useInvalidateProjects } from '@/hooks/use-projects'
import { useInvalidateDashboard } from '@/hooks/use-dashboard'
import { supabase } from '@/lib/supabase/client'
import PersonPicker, { Person, PersonType } from '@/components/ui/person-picker'
import PersonBadge from '@/components/ui/person-badge'
import { PaymentPlanSection, PlannedInstallment } from '@/components/projects/payment-plan-section'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface ProjectRepresentative {
  id: string
  type: PersonType
  user_id?: string | null
  personnel_id?: string | null
  role: 'project_leader' | 'researcher'
  person: Person
}

export default function NewProjectPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { notifyProjectCreated } = useProjectNotifications()
  const invalidateProjects = useInvalidateProjects()
  const invalidateDashboard = useInvalidateDashboard()

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    budget: '',
    start_date: '',
    end_date: '',
    company_rate: '10',
    vat_rate: '20',
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
    assignment_document_path: '',
    referee_approval_document_path: ''
  })

  const [contractFile, setContractFile] = useState<File | null>(null)
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null)
  const [refereeApprovalFile, setRefereeApprovalFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingAssignment, setUploadingAssignment] = useState(false)
  const [uploadingRefereeApproval, setUploadingRefereeApproval] = useState(false)

  const [representatives, setRepresentatives] = useState<ProjectRepresentative[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Payment plan state
  const [paymentPlanEnabled, setPaymentPlanEnabled] = useState(false)
  const [installments, setInstallments] = useState<PlannedInstallment[]>([])

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

    const leaderCount = representatives.filter(rep => rep.role === 'project_leader').length
    if (leaderCount === 0) {
      newErrors.representatives = 'Bir proje yürütücüsü seçilmelidir'
    } else if (leaderCount > 1) {
      newErrors.representatives = 'Sadece bir proje yürütücüsü seçilmelidir'
    }

    if (paymentPlanEnabled) {
      if (installments.length === 0) {
        newErrors.payment_plan = 'Ödeme planı için en az bir taksit eklenmeli'
      } else {
        const total = installments.reduce((sum, inst) => sum + inst.planned_amount, 0)
        const budgetNum = parseFloat(formData.budget) || 0
        if (total > budgetNum + 0.01) {
          newErrors.payment_plan = `Taksit toplamı (${total.toLocaleString('tr-TR')} ₺) proje bütçesini (${budgetNum.toLocaleString('tr-TR')} ₺) aşamaz`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const addRepresentative = (personId: string, personType: PersonType, person: Person) => {
    if (representatives.some(rep => rep.id === personId)) return

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

  const handleFileUpload = async (file: File, bucket: string = 'contracts'): Promise<string | null> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return null

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucket)

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      const data = await response.json()
      if (!data.success) return null
      return data.data.path
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      let uploadedContractPath = null
      let uploadedAssignmentPath = null
      let uploadedRefereeApprovalPath = null

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

      if (formData.referee_approved && refereeApprovalFile) {
        setUploadingRefereeApproval(true)
        uploadedRefereeApprovalPath = await handleFileUpload(refereeApprovalFile)
        setUploadingRefereeApproval(false)

        if (!uploadedRefereeApprovalPath) {
          setErrors({ submit: 'Hakem onay belgesi yüklenirken bir hata oluştu' })
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
          referee_approval_document_path: uploadedRefereeApprovalPath,
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
              planned_amount: inst.planned_amount,
              planned_date: inst.planned_date,
              description: inst.description || null
            }))
          } : undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        invalidateProjects()
        invalidateDashboard()
        notifyProjectCreated(formData.name, formData.code)
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

  const excludedPersonIds = representatives.map(rep => rep.id)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
          <p className="mt-2 text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <Star className="w-6 h-6 text-gold" />
              Yeni Proje Oluştur
            </h1>
            <p className="text-sm text-slate-500">Proje bilgilerini girerek yeni bir proje oluşturun</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Grid - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 1: Proje Kimliği */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Proje Kimliği
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Proje Kodu *
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        placeholder="PRJ-2024-001"
                      />
                      {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Proje Adı *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        placeholder="AI Tabanlı Sistem Geliştirme"
                      />
                      {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Açıklama
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm resize-none"
                        placeholder="Proje hakkında kısa açıklama..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Finansal Bilgiler */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Finansal Bilgiler
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Bütçe (₺) *
                      </label>
                      <MoneyInput
                        value={formData.budget}
                        onChange={(value) => setFormData({ ...formData, budget: value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        placeholder="1.000.000"
                      />
                      {errors.budget && <p className="mt-1 text-xs text-red-600">{errors.budget}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        TTO Komisyon (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.company_rate}
                        onChange={(e) => setFormData({ ...formData, company_rate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Akademisyen Payı
                      </label>
                      <div className="px-3 py-2.5 bg-navy/5 border border-navy/10 rounded-lg text-sm font-semibold text-navy">
                        %{100 - (parseFloat(formData.company_rate) || 0)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Başlangıç Tarihi *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      />
                      {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Bitiş Tarihi *
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      />
                      {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date}</p>}
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 3: Vergi Ayarları */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5" />
                    Vergi Ayarları
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        KDV Oranı (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.vat_rate}
                        onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Tevkifat
                      </label>
                      <div className="flex items-center gap-3 h-[42px]">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.has_withholding_tax}
                            onChange={(e) => setFormData({
                              ...formData,
                              has_withholding_tax: e.target.checked,
                              withholding_tax_rate: e.target.checked ? formData.withholding_tax_rate : '0'
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-gold/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gold"></div>
                        </label>
                        {formData.has_withholding_tax && (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.withholding_tax_rate}
                            onChange={(e) => setFormData({ ...formData, withholding_tax_rate: e.target.value })}
                            className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                            placeholder="%"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Damga Vergisi (₺)
                      </label>
                      <MoneyInput
                        value={formData.stamp_duty_amount}
                        onChange={(value) => setFormData({ ...formData, stamp_duty_amount: value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Damga V. Ödeyen
                      </label>
                      <select
                        value={formData.stamp_duty_payer}
                        onChange={(e) => setFormData({ ...formData, stamp_duty_payer: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      >
                        <option value="company">TTO</option>
                        <option value="academic">Akademisyen</option>
                        <option value="client">Müşteri</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Proje Ekibi */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold rounded-t-xl" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Proje Ekibi
                  </h2>

                  <div className="mb-4 relative z-30">
                    <PersonPicker
                      value={selectedPersonId}
                      onChange={(personId, personType, person) => {
                        addRepresentative(personId, personType, person)
                        setSelectedPersonId('')
                      }}
                      excludeIds={excludedPersonIds}
                      label="Temsilci Ekle"
                      placeholder="Kullanıcı veya personel ara..."
                      required={false}
                    />
                  </div>

                  {representatives.length > 0 && (
                    <div className="space-y-2">
                      {representatives.map((rep) => (
                        <div key={rep.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center">
                              {rep.role === 'project_leader' ? (
                                <Crown className="w-4 h-4 text-gold" />
                              ) : (
                                <User className="w-4 h-4 text-navy" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{rep.person.full_name}</p>
                                <PersonBadge type={rep.type} size="sm" />
                              </div>
                              <p className="text-xs text-slate-500">{rep.person.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={rep.role}
                              onChange={(e) => updateRepresentativeRole(rep.id, e.target.value as 'project_leader' | 'researcher')}
                              className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-gold/30"
                            >
                              <option value="project_leader">Yürütücü</option>
                              <option value="researcher">Araştırmacı</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => removeRepresentative(rep.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errors.representatives && (
                    <p className="mt-2 text-xs text-red-600">{errors.representatives}</p>
                  )}
                </div>
              </section>

              {/* Section 5: Hakem Heyeti */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Hakem Heyeti
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Hakem Ödemesi (₺)
                      </label>
                      <MoneyInput
                        value={formData.referee_payment}
                        onChange={(value) => setFormData({ ...formData, referee_payment: value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Ödemeyi Yapacak
                      </label>
                      <select
                        value={formData.referee_payer}
                        onChange={(e) => setFormData({ ...formData, referee_payer: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                      >
                        <option value="company">TTO</option>
                        <option value="academic">Akademisyen</option>
                        <option value="client">Müşteri</option>
                      </select>
                    </div>

                    {formData.referee_approved && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                          Onay Tarihi
                        </label>
                        <input
                          type="date"
                          value={formData.referee_approval_date}
                          onChange={(e) => setFormData({ ...formData, referee_approval_date: e.target.value })}
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sent_to_referee}
                        onChange={(e) => setFormData({
                          ...formData,
                          sent_to_referee: e.target.checked,
                          referee_approved: e.target.checked ? formData.referee_approved : false,
                          referee_approval_date: e.target.checked ? formData.referee_approval_date : ''
                        })}
                        className="w-4 h-4 text-gold bg-slate-100 border-slate-300 rounded focus:ring-gold"
                      />
                      <span className="text-sm text-slate-700">Hakem heyetine gönderildi</span>
                    </label>

                    <label className={`flex items-center gap-2 ${!formData.sent_to_referee ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={formData.referee_approved}
                        disabled={!formData.sent_to_referee}
                        onChange={(e) => setFormData({ ...formData, referee_approved: e.target.checked })}
                        className="w-4 h-4 text-gold bg-slate-100 border-slate-300 rounded focus:ring-gold disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-700">Hakem onayı alındı</span>
                    </label>
                  </div>

                  {/* Hakem Onay Belgesi Upload */}
                  {formData.referee_approved && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Hakem Onay Belgesi (PDF)
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                          refereeApprovalFile ? 'border-gold bg-gold/5' : 'border-slate-200 hover:border-gold hover:bg-gold/5'
                        }`}
                        onClick={() => document.getElementById('referee-approval-upload')?.click()}
                      >
                        <input
                          id="referee-approval-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                setErrors({ ...errors, refereeApprovalFile: 'Sadece PDF' })
                                return
                              }
                              setRefereeApprovalFile(file)
                              setErrors({ ...errors, refereeApprovalFile: '' })
                            }
                          }}
                        />
                        {refereeApprovalFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-500" />
                            <span className="text-sm font-medium text-navy truncate max-w-[200px]">{refereeApprovalFile.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setRefereeApprovalFile(null)
                              }}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">Hakem onay belgesi yükle</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Hakem heyeti onayı olmadan gelir kaydı yapılamaz.</p>
                  </div>
                </div>
              </section>

              {/* Section 6: Ödeme Planı */}
              <PaymentPlanSection
                budget={parseFloat(formData.budget) || 0}
                startDate={formData.start_date}
                enabled={paymentPlanEnabled}
                installments={installments}
                onEnabledChange={setPaymentPlanEnabled}
                onInstallmentsChange={setInstallments}
              />
              {errors.payment_plan && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg -mt-4">
                  <p className="text-xs text-red-600">{errors.payment_plan}</p>
                </div>
              )}
            </div>

            {/* Right Column - Belgeler & Özet */}
            <div className="space-y-6">
              {/* Belgeler */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
                <div className="p-5">
                  <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Belgeler
                  </h2>

                  {/* Sözleşme */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                      Sözleşme (PDF)
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                        contractFile ? 'border-gold bg-gold/5' : 'border-slate-200 hover:border-gold hover:bg-gold/5'
                      }`}
                      onClick={() => document.getElementById('contract-upload')?.click()}
                    >
                      <input
                        id="contract-upload"
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.type !== 'application/pdf') {
                              setErrors({ ...errors, file: 'Sadece PDF' })
                              return
                            }
                            setContractFile(file)
                            setErrors({ ...errors, file: '' })
                          }
                        }}
                      />
                      {contractFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="w-5 h-5 text-red-500" />
                          <span className="text-sm font-medium text-navy truncate max-w-[150px]">{contractFile.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setContractFile(null)
                            }}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          <Upload className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-xs">PDF yükle</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Görevlendirme İzni */}
                  <div className="p-3 bg-slate-50 rounded-lg mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.has_assignment_permission}
                        onChange={(e) => setFormData({ ...formData, has_assignment_permission: e.target.checked })}
                        className="w-4 h-4 text-gold bg-slate-100 border-slate-300 rounded focus:ring-gold"
                      />
                      <span className="text-sm text-slate-700">Görevlendirme izni var</span>
                    </label>
                  </div>

                  {/* Görevlendirme Belgesi */}
                  {formData.has_assignment_permission && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                        Görevlendirme Yazısı
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
                          assignmentFile ? 'border-gold bg-gold/5' : 'border-slate-200 hover:border-gold hover:bg-gold/5'
                        }`}
                        onClick={() => document.getElementById('assignment-upload')?.click()}
                      >
                        <input
                          id="assignment-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                setErrors({ ...errors, assignmentFile: 'Sadece PDF' })
                                return
                              }
                              setAssignmentFile(file)
                              setErrors({ ...errors, assignmentFile: '' })
                            }
                          }}
                        />
                        {assignmentFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-medium text-navy truncate max-w-[150px]">{assignmentFile.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setAssignmentFile(null)
                              }}
                              className="text-slate-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">PDF yükle</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Özet Kartı */}
              <section className="bg-gradient-to-br from-navy to-navy/90 rounded-xl shadow-sm overflow-hidden text-white p-5">
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Proje Özeti
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Bütçe</span>
                    <span className="font-bold">₺{parseFloat(formData.budget || '0').toLocaleString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">TTO Payı</span>
                    <span className="font-bold text-gold">%{formData.company_rate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Akademisyen Payı</span>
                    <span className="font-bold">%{100 - (parseFloat(formData.company_rate) || 0)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 flex justify-between">
                    <span className="text-white/70">Ekip</span>
                    <span className="font-bold">{representatives.length} kişi</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Hakem Onayı</span>
                    <span className={`font-bold ${formData.referee_approved ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {formData.referee_approved ? 'Onaylı' : 'Bekliyor'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Submit Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Proje Oluştur
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/projects"
                  className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  İptal
                </Link>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-600">{errors.submit}</p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
