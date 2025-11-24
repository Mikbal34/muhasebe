'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Crown,
  Microscope
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import PersonBadge from '@/components/ui/person-badge'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Project {
  id: string
  code: string
  name: string
}

interface TeamMember {
  id: string
  user_id: string | null
  personnel_id: string | null
  person_type: 'user' | 'personnel'
  person_name: string
  person_email: string
  role: 'project_leader' | 'researcher'
  allocated_amount: number
  current_balance: number
}

interface FinancialSummary {
  total_gross: number
  total_vat: number
  net_amount: number
  total_commission: number
  distributable_amount: number
  total_allocated: number
  remaining_amount: number
}

function ManualBalanceAllocationPageContent() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [allocationData, setAllocationData] = useState({
    amount: '',
    operation: 'add' as 'add' | 'subtract',
    notes: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

      fetchProjects(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, searchParams])

  const fetchProjects = async (token: string) => {
    try {
      const response = await fetch('/api/projects?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        const fetchedProjects = data.data.projects || []
        setProjects(fetchedProjects)

        // Check if there's a project_id in URL and auto-select it
        const projectIdFromUrl = searchParams.get('project_id')
        if (projectIdFromUrl && fetchedProjects.some((p: Project) => p.id === projectIdFromUrl)) {
          setSelectedProjectId(projectIdFromUrl)
          await fetchProjectAllocationSummary(projectIdFromUrl)
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  const fetchProjectAllocationSummary = async (projectId: string) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/balances/manual-allocation?project_id=${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setSelectedProject(data.data.project)
        setFinancialSummary(data.data.financial_summary)
        setTeamMembers(data.data.team_members)
        setError('')
      } else {
        setError(data.error || 'Proje bilgileri alınamadı')
      }
    } catch (err) {
      setError('Bir hata oluştu')
      console.error('Failed to fetch project summary:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    if (projectId) {
      fetchProjectAllocationSummary(projectId)
    } else {
      setSelectedProject(null)
      setFinancialSummary(null)
      setTeamMembers([])
    }
  }

  const openAllocationModal = (member: TeamMember, operation: 'add' | 'subtract') => {
    setSelectedMember(member)
    setAllocationData({
      amount: '',
      operation,
      notes: ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedMember(null)
    setAllocationData({ amount: '', operation: 'add', notes: '' })
  }

  const handleAllocationSubmit = async () => {
    if (!selectedMember || !selectedProjectId) return

    const amount = parseFloat(allocationData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Geçerli bir tutar giriniz')
      return
    }

    const finalAmount = allocationData.operation === 'subtract' ? -amount : amount

    setSubmitting(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/balances/manual-allocation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          project_id: selectedProjectId,
          user_id: selectedMember.user_id || undefined,
          personnel_id: selectedMember.personnel_id || undefined,
          amount: finalAmount,
          notes: allocationData.notes || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message || 'Bakiye başarıyla güncellendi')
        closeModal()
        // Refresh data
        fetchProjectAllocationSummary(selectedProjectId)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || data.error || 'Bakiye güncellenemedi')
      }
    } catch (err) {
      setError('Bir hata oluştu')
      console.error('Failed to allocate balance:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Manuel Bakiye Dağıtımı</h1>
              <p className="text-sm text-slate-600">Proje gelirlerini ekip üyelerine dağıtın</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Project Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Proje Seçin
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
          >
            <option value="">Bir proje seçin...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Proje bilgileri yükleniyor...</p>
          </div>
        )}

        {!loading && selectedProject && financialSummary && (
          <>
            {/* Financial Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Proje Finansal Özet
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-600 uppercase">Brüt Gelir</p>
                  <p className="text-base font-semibold text-slate-900">
                    ₺{financialSummary.total_gross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 uppercase">KDV</p>
                  <p className="text-base font-semibold text-red-700">
                    -₺{financialSummary.total_vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase">Şirket Komisyonu</p>
                  <p className="text-base font-semibold text-orange-700">
                    -₺{financialSummary.total_commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase">Dağıtılabilir Tutar</p>
                  <p className="text-base font-semibold text-teal-700">
                    ₺{financialSummary.distributable_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-600 uppercase">Toplam Dağıtılan</p>
                  <p className="text-base font-semibold text-slate-900">
                    ₺{financialSummary.total_allocated.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 uppercase">Kalan Tutar</p>
                  <p className={`text-base font-semibold ${financialSummary.remaining_amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₺{financialSummary.remaining_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-600 uppercase">Dağıtım Oranı</p>
                  <p className="text-base font-semibold text-slate-900">
                    {financialSummary.distributable_amount > 0
                      ? ((financialSummary.total_allocated / financialSummary.distributable_amount) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Proje Ekibi
              </h2>

              <div className="space-y-3">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-slate-50 p-4 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex items-center space-x-3">
                      {member.role === 'project_leader' ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Microscope className="h-5 w-5 text-teal-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{member.person_name}</p>
                          <PersonBadge type={member.person_type} />
                        </div>
                        <p className="text-sm text-slate-600">{member.person_email}</p>
                        <p className="text-xs text-slate-500">
                          {member.role === 'project_leader' ? 'Proje Yürütücüsü' : 'Araştırmacı'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xs text-slate-600 uppercase">Dağıtılan</p>
                        <p className="text-base font-semibold text-slate-900">
                          ₺{member.allocated_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-600 uppercase">Mevcut Bakiye</p>
                        <p className="text-base font-semibold text-emerald-600">
                          ₺{member.current_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAllocationModal(member, 'add')}
                          className="p-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                          title="Bakiye Ekle"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openAllocationModal(member, 'subtract')}
                          className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                          title="Bakiye Düş"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Allocation Modal */}
        {showModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4 border border-slate-200 shadow-lg">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
                {allocationData.operation === 'add' ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-emerald-600 mr-2" />
                    Bakiye Ekle
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                    Bakiye Düş
                  </>
                )}
              </h3>

              <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-600 uppercase mb-1">Kişi</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900">{selectedMember.person_name}</p>
                  <PersonBadge type={selectedMember.person_type} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tutar (₺)
                  </label>
                  <MoneyInput
                    value={allocationData.amount}
                    onChange={(value) => setAllocationData({ ...allocationData, amount: value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Not (Opsiyonel)
                  </label>
                  <textarea
                    value={allocationData.notes}
                    onChange={(e) => setAllocationData({ ...allocationData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"
                    placeholder="Bakiye değişikliği hakkında not..."
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-3 py-2 border border-slate-300 text-sm font-semibold rounded text-slate-700 hover:bg-slate-50 transition-colors"
                  disabled={submitting}
                >
                  İptal
                </button>
                <button
                  onClick={handleAllocationSubmit}
                  disabled={submitting}
                  className={`px-3 py-2 text-sm font-semibold rounded text-white ${allocationData.operation === 'add'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                    } disabled:opacity-50 transition-colors`}
                >
                  {submitting ? 'İşleniyor...' : allocationData.operation === 'add' ? 'Ekle' : 'Düş'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ManualBalanceAllocationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    }>
      <ManualBalanceAllocationPageContent />
    </Suspense>
  )
}
