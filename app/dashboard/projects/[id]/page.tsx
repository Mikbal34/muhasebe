'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Building2,
  Calendar,
  DollarSign,
  Edit,
  ArrowLeft,
  Wallet,
  FileText,
  User,
  Crown,
  Download,
  CheckCircle,
  Clock,
  FilePlus,
  XCircle,
  AlertTriangle,
  Star,
  ChevronRight,
  Users,
  File,
  MoreVertical,
  CreditCard
} from 'lucide-react'
import PersonBadge from '@/components/ui/person-badge'
import { SupplementaryContractModal } from '@/components/projects/supplementary-contract-modal'
import { SupplementaryContractHistory } from '@/components/projects/supplementary-contract-history'

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
  budget: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  company_rate: number
  created_by_user: {
    full_name: string
  }
  vat_rate: number
  has_withholding_tax: boolean
  withholding_tax_rate: number
  referee_payment: number
  referee_payer: 'company' | 'client' | null
  stamp_duty_payer: 'company' | 'client' | null
  stamp_duty_amount: number
  contract_path: string | null
  has_assignment_permission: boolean
  assignment_document_path: string | null
  sent_to_referee: boolean
  referee_approved: boolean
  referee_approval_date: string | null
  has_supplementary_contract: boolean
  supplementary_contract_count: number
  original_budget: number | null
  original_end_date: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  cancelled_by_user?: {
    full_name: string
  } | null
  representatives: Array<{
    id: string
    role: 'project_leader' | 'researcher'
    share_percentage: number
    user_id?: string | null
    personnel_id?: string | null
    user?: {
      id: string
      full_name: string
      email: string
    } | null
    personnel?: {
      id: string
      full_name: string
      email: string
    } | null
  }>
  incomes?: Array<{
    id: string
    gross_amount: number
    net_amount: number
    vat_amount: number
    income_date: string
    description: string
    created_at: string
  }>
  expenses?: Array<{
    id: string
    description: string
    amount: number
    expense_date: string
    created_at: string
  }>
  payment_instructions?: Array<{
    id: string
    instruction_number: string
    total_amount: number
    status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
    created_at: string
    personnel?: { id: string; full_name: string } | null
    user?: { id: string; full_name: string } | null
  }>
}

export default function ProjectDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [approvingReferee, setApprovingReferee] = useState(false)
  const [showSupplementaryModal, setShowSupplementaryModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [activating, setActivating] = useState(false)
  const [documents, setDocuments] = useState<Record<string, Array<{
    name: string
    path: string
    size: number
    created_at: string
    download_url: string
    category: string
    category_label: string
  }>>>({})
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
      fetchProject(token, params.id as string)
      fetchDocuments(token, params.id as string)
    } catch (err) {
      router.push('/login')
    }
  }, [router, params.id])

  const fetchProject = async (token: string, projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setProject(data.data.project)
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

  const fetchDocuments = async (token: string, projectId: string) => {
    setDocumentsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setDocuments(data.data.categories || {})
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    } finally {
      setDocumentsLoading(false)
    }
  }

  const handleApproveReferee = async () => {
    if (!project || !user) return

    setApprovingReferee(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${project.id}/approve-referee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        await fetchProject(token!, project.id)
      } else {
        alert('Hata: ' + (data.error || 'Hakem onayı işlenirken bir hata oluştu'))
      }
    } catch (err) {
      console.error('Failed to approve referee:', err)
      alert('Bir hata oluştu')
    } finally {
      setApprovingReferee(false)
    }
  }

  const handleCancelProject = async () => {
    if (!project || !user) return

    setCancelling(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${project.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason || null })
      })

      const data = await response.json()
      if (data.success) {
        setShowCancelModal(false)
        setCancelReason('')
        await fetchProject(token!, project.id)
      } else {
        alert('Hata: ' + (data.error || 'Proje iptal edilirken bir hata oluştu'))
      }
    } catch (err) {
      console.error('Failed to cancel project:', err)
      alert('Bir hata oluştu')
    } finally {
      setCancelling(false)
    }
  }

  const handleActivateProject = async () => {
    if (!project || !user) return

    if (!confirm(`${project.code} projesini aktife almak istediğinize emin misiniz?`)) return

    setActivating(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${project.id}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      if (data.success) {
        await fetchProject(token!, project.id)
      } else {
        alert('Hata: ' + (data.error || 'Proje aktifleştirilirken bir hata oluştu'))
      }
    } catch (err) {
      console.error('Failed to activate project:', err)
      alert('Bir hata oluştu')
    } finally {
      setActivating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-wider border border-gold/20">
            Aktif
          </span>
        )
      case 'completed':
        return (
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200">
            Tamamlandı
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider border border-red-200">
            İptal Edildi
          </span>
        )
      default:
        return null
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-600 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-amber-500"></span>
            Beklemede
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-600 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-blue-500"></span>
            Onaylandı
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-600 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-purple-500"></span>
            İşleniyor
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-600 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-emerald-500"></span>
            Ödendi
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-600 text-xs font-bold">
            <span className="size-1.5 rounded-full bg-red-500"></span>
            Reddedildi
          </span>
        )
      default:
        return null
    }
  }

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-navy border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm">Proje yükleniyor...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!project) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-16">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Proje bulunamadı</h3>
          <Link
            href="/dashboard/projects"
            className="text-navy hover:text-gold transition-colors font-medium"
          >
            Projeler listesine dön
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  const totalIncome = project.incomes?.reduce((sum, income) => sum + (income.gross_amount || 0), 0) || 0
  const totalNetIncome = project.incomes?.reduce((sum, income) => sum + (income.net_amount || 0), 0) || 0
  const totalExpense = project.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0
  const totalPayment = project.payment_instructions?.reduce((sum, payment) => sum + (payment.total_amount || 0), 0) || 0

  // Calculate distribution percentages - TTO and Akademisyen shares only
  const ttoShare = project.company_rate || 0
  const akademisyenShare = 100 - ttoShare

  const collectionRate = project.budget > 0 ? Math.round((totalIncome / project.budget) * 100) : 0

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Back Button & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard/projects"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 hover:border-navy/30 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Projelere Dön
            </Link>
            <nav className="flex items-center gap-2 text-slate-500 text-sm font-medium">
              <Link href="/dashboard/projects" className="hover:text-navy transition-colors">Projeler</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-900">{project.code}</span>
            </nav>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-gold fill-gold" />
                <h1 className="text-3xl md:text-4xl font-black text-navy tracking-tight">{project.name}</h1>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {getStatusBadge(project.status)}
                <span className="text-slate-500 text-sm font-medium border-l border-slate-300 pl-3">
                  ID: {project.code}
                </span>
                {project.has_supplementary_contract && (
                  <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                    Ek Sözleşme ({project.supplementary_contract_count})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Hakem Heyeti Onayı Butonu */}
              {(user.role === 'admin' || user.role === 'manager') &&
               project.sent_to_referee &&
               !project.referee_approved && (
                <button
                  onClick={handleApproveReferee}
                  disabled={approvingReferee}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {approvingReferee ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Hakem Onayı
                </button>
              )}

              {/* Ek Sözleşme Ekle */}
              {(user.role === 'admin' || user.role === 'manager') && project.status !== 'cancelled' && (
                <button
                  onClick={() => setShowSupplementaryModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gold/50 text-gold font-bold rounded-lg hover:bg-gold/5 hover:border-gold transition-all"
                >
                  <FilePlus className="w-4 h-4" />
                  Ek Sözleşme
                </button>
              )}

              {/* Düzenle */}
              {(user.role === 'admin' || user.role === 'manager') && project.status === 'active' && (
                <Link
                  href={`/dashboard/projects/${project.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border border-navy/30 text-navy font-bold rounded-lg hover:bg-navy/5 hover:border-navy transition-all"
                >
                  <Edit className="w-4 h-4" />
                  Düzenle
                </Link>
              )}

              {/* Rapor Al */}
              <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-all">
                <Download className="w-4 h-4" />
                Rapor Al
              </button>

              {/* İptal Et / Aktife Al */}
              {(user.role === 'admin' || user.role === 'manager') && (
                project.status === 'active' ? (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    İptal Et
                  </button>
                ) : (
                  <button
                    onClick={handleActivateProject}
                    disabled={activating}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gold/50 text-gold font-bold rounded-lg hover:bg-gold/5 hover:border-gold transition-all disabled:opacity-50"
                  >
                    {activating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold border-t-transparent" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Aktife Al
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Genel Bilgiler Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-navy" />
                  Genel Bilgiler
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-slate-600 leading-relaxed">
                      {project.name} projesi, {new Date(project.start_date).toLocaleDateString('tr-TR')} tarihinde başlamış olup
                      {project.end_date ? ` ${new Date(project.end_date).toLocaleDateString('tr-TR')} tarihine kadar devam edecektir.` : ' devam etmektedir.'}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Başlangıç Tarihi</p>
                        <p className="text-slate-900 font-semibold">
                          {new Date(project.start_date).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 font-bold uppercase mb-1">Bitiş Tarihi</p>
                        <p className="text-slate-900 font-semibold">
                          {project.end_date ? new Date(project.end_date).toLocaleDateString('tr-TR') : 'Belirsiz'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Stats */}
                  <div className="space-y-4">
                    <div className="p-4 bg-navy/5 rounded-lg border border-navy/10">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Tahsilat Oranı</span>
                        <span className="text-lg font-black text-navy">{collectionRate}%</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${collectionRate === 100 ? 'bg-emerald-500' : ''}`}
                          style={{
                            width: `${Math.min(collectionRate, 100)}%`,
                            background: collectionRate < 100 ? 'linear-gradient(90deg, #00205c 0%, #AD976E 100%)' : undefined
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Toplam Gelir</p>
                        <p className="text-lg font-black text-emerald-700">₺{totalIncome.toLocaleString('tr-TR')}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Bütçe</p>
                        <p className="text-lg font-black text-slate-700">₺{project.budget.toLocaleString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Finansal Dağılım Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-6 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-navy" />
                  Finansal Dağılım
                </h3>

                {/* Visual Distribution Bar - TTO ve Akademisyen Payı */}
                <div className="mb-8">
                  <div className="flex h-14 w-full rounded-xl overflow-hidden shadow-inner bg-slate-100 mb-4">
                    <div
                      className="h-full flex items-center justify-center text-white text-sm font-bold transition-all bg-gold"
                      style={{ width: `${ttoShare}%` }}
                      title={`TTO Payı: %${ttoShare}`}
                    >
                      {ttoShare > 5 && `%${ttoShare}`}
                    </div>
                    <div
                      className="h-full flex items-center justify-center text-white text-sm font-bold transition-all bg-navy"
                      style={{ width: `${akademisyenShare}%` }}
                      title={`Akademisyen Payı: %${akademisyenShare}`}
                    >
                      {akademisyenShare > 5 && `%${akademisyenShare}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-8 justify-center">
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full bg-gold"></div>
                      <span className="text-sm font-semibold text-slate-700">TTO Payı</span>
                      <span className="text-sm font-bold text-gold">%{ttoShare}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="size-4 rounded-full bg-navy"></div>
                      <span className="text-sm font-semibold text-slate-700">Akademisyen Payı</span>
                      <span className="text-sm font-bold text-navy">%{akademisyenShare}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions Table */}
                {project.payment_instructions && project.payment_instructions.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-3 pt-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Kişi</th>
                          <th className="pb-3 pt-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Tutar</th>
                          <th className="pb-3 pt-1 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {project.payment_instructions
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 5)
                          .map((payment) => (
                            <tr key={payment.id} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-4 text-sm font-medium">
                                {payment.personnel?.full_name || payment.user?.full_name || 'Bilinmiyor'}
                              </td>
                              <td className="py-4 text-sm font-bold text-navy">
                                ₺{payment.total_amount.toLocaleString('tr-TR')}
                              </td>
                              <td className="py-4 text-sm text-right">
                                {getPaymentStatusBadge(payment.status)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Son Gelirler ve Ödemeler - İki Sütun */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Son Gelirler */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-gold" />
                      Son Gelirler
                    </h3>
                    <Link
                      href={`/dashboard/incomes?project_id=${project.id}`}
                      className="text-sm font-semibold text-navy hover:text-gold transition-colors"
                    >
                      Tümünü gör
                    </Link>
                  </div>

                  {project.incomes && project.incomes.length > 0 ? (
                    <div className="space-y-3">
                      {project.incomes
                        .sort((a, b) => new Date(b.created_at || b.income_date).getTime() - new Date(a.created_at || a.income_date).getTime())
                        .slice(0, 5)
                        .map((income) => (
                          <div key={income.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-navy/5 transition-colors border border-transparent hover:border-navy/10">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-navy truncate text-sm">{income.description || 'Gelir'}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(income.income_date).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-gold text-sm">₺{income.gross_amount.toLocaleString('tr-TR')}</p>
                              <p className="text-[10px] text-slate-500">Net: ₺{income.net_amount.toLocaleString('tr-TR')}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-12 w-12 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DollarSign className="h-6 w-6 text-navy/40" />
                      </div>
                      <p className="text-slate-500 text-sm">Henüz gelir kaydı yok</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Son Ödemeler */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-navy flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-gold" />
                      Son Ödemeler
                    </h3>
                    <Link
                      href={`/dashboard/payments?project_id=${project.id}`}
                      className="text-sm font-semibold text-navy hover:text-gold transition-colors"
                    >
                      Tümünü gör
                    </Link>
                  </div>

                  {project.payment_instructions && project.payment_instructions.length > 0 ? (
                    <div className="space-y-3">
                      {project.payment_instructions
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                        .map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-navy/5 transition-colors border border-transparent hover:border-navy/10">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-navy truncate text-sm">
                                {payment.personnel?.full_name || payment.user?.full_name || 'Bilinmiyor'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(payment.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                            <div className="text-right ml-3">
                              <p className="font-bold text-gold text-sm">₺{payment.total_amount.toLocaleString('tr-TR')}</p>
                              <div className="mt-0.5">{getPaymentStatusBadge(payment.status)}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="h-12 w-12 bg-navy/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CreditCard className="h-6 w-6 text-navy/40" />
                      </div>
                      <p className="text-slate-500 text-sm">Henüz ödeme kaydı yok</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Finansal Özet Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-navy to-gold"></div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-gold" />
                  Finansal Özet
                </h3>

                <div className="space-y-3">
                  <div className="p-3 bg-navy/5 rounded-lg border border-navy/10">
                    <p className="text-[10px] font-bold text-navy/70 uppercase mb-0.5">Toplam Brüt Gelir</p>
                    <p className="text-lg font-black text-navy">₺{totalIncome.toLocaleString('tr-TR')}</p>
                  </div>

                  <div className="p-3 bg-gold/10 rounded-lg border border-gold/20">
                    <p className="text-[10px] font-bold text-gold uppercase mb-0.5">KDV Sonrası Net Gelir</p>
                    <p className="text-lg font-black text-gold">₺{totalNetIncome.toLocaleString('tr-TR')}</p>
                  </div>

                  {project.referee_payment > 0 && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Hakem Heyeti Parası
                        <span className="font-normal ml-1 normal-case">
                          ({project.referee_payer === 'company' ? 'Şirket öder' : 'Müşteri öder'})
                        </span>
                      </p>
                      <p className="text-lg font-black text-slate-700">₺{project.referee_payment.toLocaleString('tr-TR')}</p>
                    </div>
                  )}

                  <div className="p-3 bg-navy/5 rounded-lg border border-navy/10">
                    <p className="text-[10px] font-bold text-navy/70 uppercase mb-0.5">Toplam Ödeme</p>
                    <p className="text-lg font-black text-navy">₺{totalPayment.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Proje Ekibi Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-navy" />
                  Proje Ekibi
                </h3>

                <div className="space-y-4">
                  {project.representatives.map((rep) => {
                    const person = rep.user || rep.personnel
                    const personType = rep.user_id ? 'user' : 'personnel'
                    const personName = person?.full_name || 'Bilinmiyor'

                    return (
                      <div key={rep.id} className="flex items-center gap-4 group">
                        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-transparent group-hover:border-gold transition-all">
                          <span className="text-lg font-bold text-navy">
                            {personName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            {personName}
                            {rep.role === 'project_leader' && <Crown className="w-4 h-4 text-gold" />}
                          </p>
                          <p className="text-xs font-medium text-slate-500">
                            {rep.role === 'project_leader' ? 'Proje Yürütücüsü' : 'Araştırmacı'}
                            {rep.share_percentage > 0 && ` • %${rep.share_percentage}`}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>

            {/* İlgili Belgeler Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-6 flex items-center gap-2">
                  <File className="w-5 h-5 text-navy" />
                  İlgili Belgeler
                </h3>

                {documentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-5 h-5 bg-slate-200 rounded" />
                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 rounded w-3/4" />
                        </div>
                        <div className="w-4 h-4 bg-slate-200 rounded" />
                      </div>
                    ))}
                  </div>
                ) : Object.keys(documents).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(documents).map(([category, files]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {files[0]?.category_label || category}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">
                            {files.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-navy/5 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                                  {file.size > 0 && (
                                    <p className="text-[10px] text-slate-400">
                                      {file.size < 1024 * 1024
                                        ? `${Math.round(file.size / 1024)} KB`
                                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Download className="w-4 h-4 text-slate-400 group-hover:text-navy transition-colors flex-shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <File className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Henüz belge yok</p>
                  </div>
                )}
              </div>
            </section>

            {/* Proje Detayları Card */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-navy mb-4">Proje Detayları</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">KDV Oranı</span>
                    <span className="font-semibold text-slate-900">%{project.vat_rate}</span>
                  </div>

                  {project.has_withholding_tax && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">Tevkifat</span>
                      <span className="font-semibold text-orange-600">%{project.withholding_tax_rate}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Hakem Heyeti</span>
                    <span className="font-semibold text-slate-900">
                      {project.referee_payer === 'company' ? 'Şirket' : 'Müşteri'}
                    </span>
                  </div>

                  {project.sent_to_referee && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">Hakem Durumu</span>
                      <span className={`font-semibold ${project.referee_approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {project.referee_approved ? 'Onaylandı' : 'Bekliyor'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Görevlendirme İzni</span>
                    <span className={`font-semibold ${project.has_assignment_permission ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {project.has_assignment_permission ? 'Var' : 'Yok'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500">Oluşturan</span>
                    <span className="font-semibold text-slate-900">{project.created_by_user.full_name}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Ek Sözleşme Geçmişi */}
        {project.has_supplementary_contract && (
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
            <SupplementaryContractHistory
              projectId={project.id}
              onContractDeleted={() => {
                const token = localStorage.getItem('token')
                if (token) fetchProject(token, project.id)
              }}
            />
          </section>
        )}
      </div>

      {/* Ek Sözleşme Modal */}
      <SupplementaryContractModal
        isOpen={showSupplementaryModal}
        onClose={() => setShowSupplementaryModal(false)}
        onSuccess={() => {
          const token = localStorage.getItem('token')
          if (token) fetchProject(token, project.id)
        }}
        projectId={project.id}
        currentEndDate={project.end_date || null}
        currentBudget={project.budget}
        amendmentCount={project.supplementary_contract_count || 0}
      />

      {/* Proje İptal Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => !cancelling && setShowCancelModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Projeyi İptal Et</h2>
                    <p className="text-sm text-slate-500">{project.code}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-amber-800">
                    <strong>Dikkat:</strong> İptal edilen projelere yeni gelir/gider eklenemez ve tahsilat yapılamaz.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    İptal Sebebi <span className="text-slate-400 font-normal">(opsiyonel)</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    placeholder="İptal sebebini yazabilirsiniz..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false)
                      setCancelReason('')
                    }}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleCancelProject}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        İptal Ediliyor...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        İptal Et
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
