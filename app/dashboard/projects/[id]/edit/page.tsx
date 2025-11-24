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
  Save
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import { supabase } from '@/lib/supabase/client'
import PersonPicker, { Person, PersonType } from '@/components/ui/person-picker'
import PersonBadge from '@/components/ui/person-badge'

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

interface Project {
  id: string
  code: string
  name: string
  description: string | null
  budget: number
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'cancelled'
  company_rate: number
  vat_rate: number
  referee_payment: number
  referee_payer: 'company' | 'client' | null
  stamp_duty_payer: 'company' | 'client' | null
  stamp_duty_amount: number
  contract_path: string | null
  sent_to_referee: boolean
  referee_approved: boolean
  referee_approval_date: string | null
  created_at: string
  representatives: Array<{
    user_id: string
    role: 'project_leader' | 'researcher'
    user: {
      id: string
      full_name: string
      email: string
    }
  }>
}

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

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
    referee_payment: '0',
    referee_payer: 'company',
    stamp_duty_payer: 'company',
    stamp_duty_amount: '0',
    has_assignment_permission: false
  })

  const [representatives, setRepresentatives] = useState<ProjectRepresentative[]>([])
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null)
  const [uploadingContract, setUploadingContract] = useState(false)
  const [uploadingAssignment, setUploadingAssignment] = useState(false)
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

      if (parsedUser.role !== 'admin' && parsedUser.role !== 'manager') {
        router.push('/dashboard')
        return
      }

      fetchProject(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchProject = async (token: string) => {
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success && data.data.project) {
        const projectData = data.data.project
        setProject(projectData)

        // Check if project is completed
        if (projectData.status !== 'active') {
          router.push(`/dashboard/projects/${params.id}` as any)
          return
        }

        // Populate form data
        setFormData({
          code: projectData.code,
          name: projectData.name,
          description: projectData.description || '',
          budget: projectData.budget.toString(),
          start_date: projectData.start_date.split('T')[0],
          end_date: projectData.end_date.split('T')[0],
          company_rate: projectData.company_rate.toString(),
          vat_rate: projectData.vat_rate.toString(),
          referee_payment: (projectData.referee_payment || 0).toString(),
          referee_payer: projectData.referee_payer || 'company',
          stamp_duty_payer: projectData.stamp_duty_payer || 'company',
          stamp_duty_amount: (projectData.stamp_duty_amount || 0).toString(),
          has_assignment_permission: projectData.has_assignment_permission || false
        })

        // Populate representatives - handle both users and personnel
        setRepresentatives(projectData.representatives.map((rep: any) => {
          const isUser = !!rep.user_id
          const person = isUser ? rep.user : rep.personnel

          return {
            id: isUser ? rep.user_id : rep.personnel_id,
            type: (isUser ? 'user' : 'personnel') as PersonType,
            user_id: rep.user_id,
            personnel_id: rep.personnel_id,
            role: rep.role,
            person: {
              id: person.id,
              type: isUser ? 'user' as const : 'personnel' as const,
              full_name: person.full_name,
              email: person.email,
              phone: person.phone,
              iban: person.iban,
              user_role: person.role || null,
              tc_no: person.tc_no || null,
            }
          }
        }))
      } else {
        router.push('/dashboard/projects')
      }
    } catch (err) {
      console.error('Failed to fetch project:', err)
      router.push('/dashboard/projects')
    } finally {
      setLoading(false)
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
      newErrors.representatives = 'En az bir temsilci bulunmalı'
    }

    const leaderCount = representatives.filter(rep => rep.role === 'project_leader').length
    if (leaderCount === 0) {
      newErrors.representatives = 'En az bir proje yürütücüsü seçilmeli'
    } else if (leaderCount > 1) {
      newErrors.representatives = 'Sadece bir proje yürütücüsü olabilir'
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

    setSaving(true)

    try {
      let uploadedContractPath = project?.contract_path || null
      let uploadedAssignmentPath = project?.assignment_document_path || null

      // Upload new contract file if selected
      if (contractFile) {
        setUploadingContract(true)
        uploadedContractPath = await handleFileUpload(contractFile)
        setUploadingContract(false)

        if (!uploadedContractPath) {
          setErrors({ submit: 'Sözleşme yüklenirken bir hata oluştu' })
          setSaving(false)
          return
        }
      }

      // Upload new assignment document if selected and permission is granted
      if (formData.has_assignment_permission && assignmentFile) {
        setUploadingAssignment(true)
        uploadedAssignmentPath = await handleFileUpload(assignmentFile)
        setUploadingAssignment(false)

        if (!uploadedAssignmentPath) {
          setErrors({ submit: 'Görevlendirme belgesi yüklenirken bir hata oluştu' })
          setSaving(false)
          return
        }
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          company_rate: parseFloat(formData.company_rate),
          vat_rate: parseFloat(formData.vat_rate),
          referee_payment: formData.referee_payer === 'company' ? parseFloat(formData.referee_payment) : 0,
          referee_payer: formData.referee_payer,
          stamp_duty_payer: formData.stamp_duty_payer,
          stamp_duty_amount: formData.stamp_duty_payer === 'company' ? parseFloat(formData.stamp_duty_amount) : 0,
          contract_path: uploadedContractPath,
          has_assignment_permission: formData.has_assignment_permission,
          assignment_document_path: uploadedAssignmentPath,
          representatives: representatives.map(rep => ({
            user_id: rep.user_id,
            personnel_id: rep.personnel_id,
            role: rep.role
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        router.push('/dashboard/projects')
      } else {
        setErrors({ submit: data.error || 'Proje güncellenemedi' })
      }
    } catch (err) {
      setErrors({ submit: 'Bir hata oluştu' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // State for PersonPicker
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const excludedPersonIds = representatives.map(rep => rep.id)

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
              <h1 className="text-2xl font-bold text-gray-900">Proje Düzenle</h1>
              <p className="text-gray-600">{project.code} - {project.name}</p>
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
                  Hakem Heyeti Ödemesini Kim Yapacak?
                </label>
                <select
                  value={formData.referee_payer}
                  onChange={(e) => setFormData({ ...formData, referee_payer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">Şirket (Biz)</option>
                  <option value="client">Karşı Taraf (Müşteri)</option>
                </select>
              </div>

              <div className={formData.referee_payer === 'company' ? '' : 'hidden'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hakem Heyeti Ödemesi (₺)
                </label>
                <MoneyInput
                  value={formData.referee_payment}
                  onChange={(value) => setFormData({ ...formData, referee_payment: value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Damga Vergisini Kim Ödeyecek?
                </label>
                <select
                  value={formData.stamp_duty_payer}
                  onChange={(e) => setFormData({ ...formData, stamp_duty_payer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="company">Şirket (Biz)</option>
                  <option value="client">Karşı Taraf (Müşteri)</option>
                </select>
              </div>

              <div className={formData.stamp_duty_payer === 'company' ? '' : 'hidden'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Damga Vergisi Tutarı (₺)
                </label>
                <MoneyInput
                  value={formData.stamp_duty_amount}
                  onChange={(value) => setFormData({ ...formData, stamp_duty_amount: value })}
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

              {/* Mevcut Sözleşme Belgesi Gösterimi */}
              {project?.contract_path && (
                <div className="md:col-span-2">
                  <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-700">Mevcut sözleşme belgesi yüklü</span>
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${project.contract_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      İndir
                    </a>
                  </div>
                </div>
              )}

              {/* Sözleşme Belgesi Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sözleşme (PDF) {project?.contract_path && '- Yeni dosya yüklerseniz eskisi değiştirilecek'}
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="contract-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Dosya Seç</span>
                        <input
                          id="contract-upload"
                          name="contract-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                setErrors({ ...errors, contract: 'Sadece PDF dosyaları yüklenebilir' })
                                return
                              }
                              if (file.size > 10 * 1024 * 1024) {
                                setErrors({ ...errors, contract: 'Dosya boyutu 10MB\'dan küçük olmalı' })
                                return
                              }
                              setContractFile(file)
                              setErrors({ ...errors, contract: '' })
                            }
                          }}
                        />
                      </label>
                      <p className="pl-1">veya sürükleyip bırakın</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, maksimum 10MB</p>
                    {contractFile && (
                      <p className="text-sm text-green-600 font-medium">
                        ✓ {contractFile.name}
                      </p>
                    )}
                    {errors.contract && (
                      <p className="text-sm text-red-600">
                        {errors.contract}
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

              {/* Mevcut Görevlendirme Belgesi Gösterimi */}
              {project?.assignment_document_path && (
                <div className="md:col-span-2">
                  <div className="bg-green-50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="text-sm text-gray-700">Mevcut görevlendirme belgesi yüklü</span>
                    </div>
                    <a
                      href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/contracts/${project.assignment_document_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      İndir
                    </a>
                  </div>
                </div>
              )}

              {/* Görevlendirme Belgesi Upload - Sadece izin varsa görünür */}
              {formData.has_assignment_permission && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Görevlendirme Yazısı (PDF) {project?.assignment_document_path && '- Yeni dosya yüklerseniz eskisi değiştirilecek'}
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
            </div>
          </div>

          {/* Representatives */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
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
                        <Crown className="h-4 w-4 text-yellow-500 mr-1" />
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
                      className={`px-3 py-1 rounded text-sm font-medium border ${
                        rep.role === 'project_leader'
                          ? 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <option value="project_leader">Proje Yürütücüsü</option>
                      <option value="researcher">Araştırmacı</option>
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
                  Toplam {representatives.length} temsilci
                  {' • '}
                  {representatives.filter(r => r.role === 'project_leader').length} Yürütücü
                  {' • '}
                  {representatives.filter(r => r.role === 'researcher').length} Araştırmacı
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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />}
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
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