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
  Microscope,
  Coins,
  Building2,
  Wallet,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import PersonBadge from '@/components/ui/person-badge'
import { SearchableSelect } from '@/components/ui/searchable-select'

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
  total_collected: number
  collected_vat: number
  collected_net: number
  collected_commission: number
  client_expenses: number
  shared_expenses: number
  shared_expenses_rep_portion: number
  total_expense_deduction: number
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
            href="/dashboard/incomes"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <Coins className="w-6 h-6 text-gold" />
              Manuel Bakiye Dağıtımı
            </h1>
            <p className="text-sm text-slate-500">Proje gelirlerini ekip üyelerine dağıtın</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">{success}</p>
          </div>
        )}

        {error && !showModal && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Project Selection */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm relative">
          <div className="h-1 w-full bg-gradient-to-r from-navy to-gold rounded-t-xl" />
          <div className="p-5">
            <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Proje Seçin
            </h2>
            <div className="relative z-50">
            <SearchableSelect
              options={projects}
              value={selectedProjectId}
              onChange={(value) => handleProjectChange(value)}
              placeholder="Proje seçiniz veya kod yazarak arayın..."
            />
            </div>
          </div>
        </section>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
            <p className="mt-2 text-slate-600">Proje bilgileri yükleniyor...</p>
          </div>
        )}

        {!loading && selectedProject && financialSummary && (
          <>
            {/* Financial Summary */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
              <div className="p-5">
                <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Proje Finansal Özet
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="bg-navy/5 p-4 rounded-lg border border-navy/10">
                    <p className="text-[10px] text-navy font-bold uppercase tracking-wider mb-1">Tahsil Edilen</p>
                    <p className="text-lg font-black text-navy">
                      ₺{(financialSummary.total_collected || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      / ₺{financialSummary.total_gross.toLocaleString('tr-TR')}
                    </p>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">KDV</p>
                    <p className="text-lg font-black text-red-600">
                      -₺{(financialSummary.collected_vat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-gold/10 p-4 rounded-lg border border-gold/20">
                    <p className="text-[10px] text-gold font-bold uppercase tracking-wider mb-1">TTO Komisyonu</p>
                    <p className="text-lg font-black text-gold">
                      -₺{(financialSummary.collected_commission || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {(financialSummary.total_expense_deduction || 0) > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                      <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">Proje Giderleri</p>
                      <p className="text-lg font-black text-purple-600">
                        -₺{(financialSummary.total_expense_deduction || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Dağıtılan</p>
                    <p className="text-lg font-black text-slate-700">
                      ₺{financialSummary.total_allocated.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      %{financialSummary.distributable_amount > 0
                        ? ((financialSummary.total_allocated / financialSummary.distributable_amount) * 100).toFixed(1)
                        : 0}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg border ${financialSummary.remaining_amount >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${financialSummary.remaining_amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Kalan Dağıtılacak
                    </p>
                    <p className={`text-lg font-black ${financialSummary.remaining_amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₺{financialSummary.remaining_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      %{financialSummary.distributable_amount > 0
                        ? ((financialSummary.remaining_amount / financialSummary.distributable_amount) * 100).toFixed(1)
                        : 0}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Team Members */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-navy to-gold" />
              <div className="p-5">
                <h2 className="text-base font-bold text-navy mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Proje Ekibi
                </h2>

                <div className="space-y-3">
                  {teamMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between bg-slate-50 p-4 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          member.role === 'project_leader' ? 'bg-gold/20' : 'bg-navy/10'
                        }`}>
                          {member.role === 'project_leader' ? (
                            <Crown className="h-5 w-5 text-gold" />
                          ) : (
                            <Microscope className="h-5 w-5 text-navy" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-navy">{member.person_name}</p>
                            <PersonBadge type={member.person_type} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500">{member.person_email}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                            {member.role === 'project_leader' ? 'Proje Yürütücüsü' : 'Araştırmacı'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Dağıtılan</p>
                          <p className="text-sm font-black text-navy">
                            ₺{member.allocated_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Mevcut Bakiye</p>
                          <p className="text-sm font-black text-emerald-600">
                            ₺{member.current_balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openAllocationModal(member, 'add')}
                            className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                            title="Bakiye Ekle"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openAllocationModal(member, 'subtract')}
                            className="p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm"
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
            </section>
          </>
        )}

        {/* Allocation Modal */}
        {showModal && selectedMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl overflow-hidden">
              <div className={`h-1 w-full ${allocationData.operation === 'add' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="p-5">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                  {allocationData.operation === 'add' ? (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      Bakiye Ekle
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                      Bakiye Düş
                    </>
                  )}
                </h3>

                <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Kişi</p>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-navy">{selectedMember.person_name}</p>
                    <PersonBadge type={selectedMember.person_type} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Mevcut Bakiye: <span className="font-bold text-emerald-600">₺{selectedMember.current_balance.toLocaleString('tr-TR')}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Tutar (₺)
                    </label>
                    <MoneyInput
                      value={allocationData.amount}
                      onChange={(value) => setAllocationData({ ...allocationData, amount: value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Not (Opsiyonel)
                    </label>
                    <textarea
                      value={allocationData.notes}
                      onChange={(e) => setAllocationData({ ...allocationData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-gold/30 focus:border-gold focus:bg-white transition-all outline-none text-sm resize-none"
                      placeholder="Bakiye değişikliği hakkında not..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all"
                    disabled={submitting}
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleAllocationSubmit}
                    disabled={submitting}
                    className={`px-5 py-2.5 font-bold rounded-lg text-white transition-all shadow-lg flex items-center gap-2 ${
                      allocationData.operation === 'add'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    } disabled:opacity-50`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        İşleniyor...
                      </>
                    ) : allocationData.operation === 'add' ? (
                      <>
                        <Plus className="w-4 h-4" />
                        Ekle
                      </>
                    ) : (
                      <>
                        <Minus className="w-4 h-4" />
                        Düş
                      </>
                    )}
                  </button>
                </div>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy mx-auto"></div>
          <p className="mt-2 text-slate-600">Yükleniyor...</p>
        </div>
      </div>
    }>
      <ManualBalanceAllocationPageContent />
    </Suspense>
  )
}
