'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  Wallet,
  FolderOpen,
  Activity,
  CheckCircle,
  MoreVertical,
  Calendar,
  User
} from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/ui/confirmation-modal'
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjects, useAcademicians, useInvalidateProjects } from '@/hooks/use-projects'
import { turkishIncludes } from '@/lib/utils/string'

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
  total_received: number
  remaining_budget: number
  company_rate: number
  vat_rate: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  has_supplementary_contract: boolean
  supplementary_contract_count: number
  created_by_user: {
    full_name: string
  }
  representatives: Array<{
    id: string
    role: 'project_leader' | 'researcher'
    share_percentage: number
    is_lead: boolean
    user_id?: string | null
    personnel_id?: string | null
    user: {
      id: string
      full_name: string
      email: string
    } | null
    personnel: {
      id: string
      full_name: string
      email: string
    } | null
  }>
}

export default function ProjectsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [representativeFilter, setRepresentativeFilter] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const router = useRouter()

  const { data: projects = [], isLoading: projectsLoading } = useProjects({
    status: statusFilter === 'all' ? undefined : statusFilter || undefined,
    representative_id: representativeFilter || undefined
  })
  const { data: academicians = [] } = useAcademicians()
  const invalidateProjects = useInvalidateProjects()

  const {
    isModalOpen: isDeleteModalOpen,
    itemToDelete,
    isDeleting,
    showDeleteModal,
    hideDeleteModal,
    confirmDelete
  } = useDeleteConfirmation({
    entityName: 'Proje',
    apiEndpoint: '/api/projects',
    onSuccess: () => {
      invalidateProjects()
    },
    onError: (error) => {
      console.error('Delete error:', error)
    }
  })

  const [exportingKunye, setExportingKunye] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const filteredProjects = useMemo(() => {
    let result = projects.filter(project => {
      const matchesSearch = turkishIncludes(project.name, searchTerm) ||
        turkishIncludes(project.code, searchTerm) ||
        project.representatives.some(rep => {
          const person = rep.user || rep.personnel
          return turkishIncludes(person?.full_name || '', searchTerm)
        })
      return matchesSearch
    })

    if (sortOrder === 'budget_desc') {
      result = [...result].sort((a, b) => b.budget - a.budget)
    } else if (sortOrder === 'budget_asc') {
      result = [...result].sort((a, b) => a.budget - b.budget)
    } else if (sortOrder === 'date_desc') {
      result = [...result].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    } else if (sortOrder === 'date_asc') {
      result = [...result].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    }

    return result
  }, [projects, searchTerm, sortOrder])

  // Stats calculations
  const stats = useMemo(() => {
    const total = projects.length
    const active = projects.filter(p => p.status === 'active').length
    const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0)
    const totalCollected = projects.reduce((sum, p) => sum + p.total_received, 0)
    return { total, active, totalBudget, totalCollected }
  }, [projects])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 w-fit">
            <div className="size-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold">Aktif</span>
          </div>
        )
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 w-fit">
            <div className="size-1.5 rounded-full bg-blue-500"></div>
            <span className="text-xs font-bold">Tamamlandı</span>
          </div>
        )
      case 'cancelled':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 w-fit">
            <div className="size-1.5 rounded-full bg-red-500"></div>
            <span className="text-xs font-bold">İptal</span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 w-fit">
            <div className="size-1.5 rounded-full bg-amber-500"></div>
            <span className="text-xs font-bold">Beklemede</span>
          </div>
        )
    }
  }

  const handleExportProjectCard = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExportingKunye(true)
    try {
      const response = await fetch('/api/reports/export/project-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proje_kunyesi_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Excel dosyası oluşturulurken bir hata oluştu')
    } finally {
      setExportingKunye(false)
    }
  }

  const getProjectLeader = (project: Project) => {
    const leader = project.representatives.find(r => r.role === 'project_leader')
    if (leader) {
      return leader.user?.full_name || leader.personnel?.full_name || 'Belirsiz'
    }
    return 'Belirsiz'
  }

  const getCollectionPercentage = (project: Project) => {
    if (project.budget === 0) return 0
    return Math.round((project.total_received / project.budget) * 100)
  }

  const getTTOShare = (project: Project) => {
    // TTO payı genelde %10 olarak hesaplanıyor (company_rate üzerinden)
    return project.total_received * (project.company_rate / 100)
  }

  if (projectsLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-10 w-40 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border overflow-hidden">
                <Skeleton className="h-1 w-full" />
                <div className="p-5">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="p-4">
              <Skeleton className="h-10 w-full" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-t p-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-navy tracking-tight">Projeler</h1>
              <span className="bg-navy/10 text-navy text-xs font-bold px-2.5 py-1 rounded-full">
                {stats.total} proje
              </span>
            </div>
            <p className="text-slate-500 text-sm">Üniversite bünyesindeki aktif ve tamamlanmış projelerin listesi.</p>
          </div>

          {/* Filter Chips & Actions */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Filter Chips */}
            <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-100">
              {['all', 'active', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    statusFilter === status
                      ? 'bg-navy text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status === 'all' ? 'Tümü' : status === 'active' ? 'Aktif' : status === 'completed' ? 'Tamamlandı' : 'İptal'}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex bg-white p-1 rounded-lg shadow-sm border border-slate-100">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'list' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <LayoutList className="w-4 h-4" />
                Liste
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  viewMode === 'grid' ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
            </div>

            {['admin', 'manager'].includes(user.role) && (
              <Link
                href="/dashboard/projects/new"
                className="bg-navy hover:bg-navy/90 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-navy/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Yeni Proje
              </Link>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Toplam Proje */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-navy to-gold"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Toplam Proje</p>
                <FolderOpen className="w-5 h-5 text-navy/40 group-hover:text-navy transition-colors" />
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.total}</p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Toplam kayıtlı proje
              </div>
            </div>
          </div>

          {/* Aktif Proje */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-navy to-gold"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Aktif Proje</p>
                <Activity className="w-5 h-5 text-navy/40 group-hover:text-navy transition-colors" />
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.active}</p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Devam eden projeler
              </div>
            </div>
          </div>

          {/* Toplam Bütçe */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-navy to-gold"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Toplam Bütçe</p>
                <Wallet className="w-5 h-5 text-navy/40 group-hover:text-navy transition-colors" />
              </div>
              <p className="text-xl font-black text-slate-900">
                ₺{stats.totalBudget.toLocaleString('tr-TR')}
              </p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Toplam proje bütçesi
              </div>
            </div>
          </div>

          {/* Tahsil Edilen */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-md transition-shadow">
            <div className="h-1 bg-gradient-to-r from-navy to-gold"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Tahsil Edilen</p>
                <CheckCircle className="w-5 h-5 text-navy/40 group-hover:text-navy transition-colors" />
              </div>
              <p className="text-xl font-black text-slate-900">
                ₺{stats.totalCollected.toLocaleString('tr-TR')}
              </p>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold mt-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Toplam tahsilat
              </div>
            </div>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya akademisyen ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 bg-slate-50 border-none rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-navy/20 placeholder:text-slate-400"
              />
            </div>

            {/* Representative Filter */}
            <select
              value={representativeFilter}
              onChange={(e) => setRepresentativeFilter(e.target.value)}
              className="h-10 px-3 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-navy/20 text-slate-700"
            >
              <option value="">Tüm Temsilciler</option>
              {academicians.map(academician => (
                <option key={academician.id} value={academician.id}>
                  {academician.full_name}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-10 px-3 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-navy/20 text-slate-700"
            >
              <option value="">Sıralama</option>
              <option value="budget_desc">Bütçe (Yüksek → Düşük)</option>
              <option value="budget_asc">Bütçe (Düşük → Yüksek)</option>
              <option value="date_desc">Tarih (Yeni → Eski)</option>
              <option value="date_asc">Tarih (Eski → Yeni)</option>
            </select>

            {/* Export Button */}
            <button
              onClick={handleExportProjectCard}
              disabled={exportingKunye}
              className="h-10 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {exportingKunye ? 'İndiriliyor...' : 'Dışa Aktar'}
            </button>
          </div>
        </div>

        {/* Projects View */}
        {viewMode === 'list' ? (
          /* Table View */
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Proje Adı</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Yürütücü</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Bütçe</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Faturalanan</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tahsilat</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">TTO Payı</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-navy">{project.name}</div>
                        <div className="text-xs text-slate-400">{project.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{getProjectLeader(project)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(project.status)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        ₺{project.budget.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-600">
                        ₺{project.total_received.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                getCollectionPercentage(project) === 100 ? 'bg-emerald-500' : 'bg-navy'
                              }`}
                              style={{ width: `${Math.min(getCollectionPercentage(project), 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-xs font-bold ${
                            getCollectionPercentage(project) === 100 ? 'text-emerald-600' : 'text-slate-600'
                          }`}>
                            {getCollectionPercentage(project)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-gold tracking-tight">
                          ₺{getTTOShare(project).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {['admin', 'manager'].includes(user.role) && project.status === 'active' && (
                            <Link
                              href={`/dashboard/projects/${project.id}/edit`}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}
                          {['admin', 'manager'].includes(user.role) && (
                            <button
                              onClick={() => showDeleteModal({
                                id: project.id,
                                name: `${project.code} - ${project.name}`,
                                description: `Bu proje silindiğinde tüm gelir kayıtları ve ödeme talimatları da silinecektir.`,
                                warningItems: [
                                  'Proje gelir kayıtları',
                                  'Gelir dağıtımları',
                                  'Ödeme talimatları',
                                  'Bakiye geçmişi'
                                ]
                              })}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                              title="Sil"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">{filteredProjects.length} kayıt gösteriliyor</p>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group bg-white rounded-xl overflow-hidden shadow-sm border border-transparent transition-all duration-300 hover:shadow-xl hover:border-gold/30 flex flex-col"
                style={{ borderTop: '3px solid', borderImage: 'linear-gradient(90deg, #00205c 0%, #AD976E 100%) 1' }}
              >
                <div className="p-5 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    {getStatusBadge(project.status)}
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="p-1.5 text-slate-400 hover:text-navy transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button className="text-slate-400 hover:text-navy transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Project Info */}
                  <h3 className="text-navy text-lg font-black leading-tight mb-2 group-hover:text-gold transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-5">
                    <Building2 className="w-4 h-4" />
                    {getProjectLeader(project)}
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    <div className="bg-slate-50 p-3 rounded-lg flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">BÜTÇE</span>
                      <span className="text-navy text-[10px] font-black">
                        ₺{project.budget.toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TAHSİLAT</span>
                      <span className="text-navy text-[10px] font-black">
                        ₺{project.total_received.toLocaleString('tr-TR')}
                      </span>
                    </div>
                    <div className="bg-gold/10 p-3 rounded-lg flex flex-col">
                      <span className="text-[9px] font-bold text-gold uppercase tracking-tighter">TTO PAYI</span>
                      <span className="text-gold text-[10px] font-black">
                        ₺{getTTOShare(project).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tahsilat Oranı</span>
                      <span className="text-sm font-black text-navy">{getCollectionPercentage(project)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          getCollectionPercentage(project) === 100 ? 'bg-emerald-500' : ''
                        }`}
                        style={{
                          width: `${Math.min(getCollectionPercentage(project), 100)}%`,
                          background: getCollectionPercentage(project) < 100 ? 'linear-gradient(90deg, #00205c 0%, #AD976E 100%)' : undefined
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto border-t border-slate-50 p-5 bg-slate-50/50 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Başlangıç
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(project.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Yürütücü
                    </span>
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {getProjectLeader(project)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 text-center py-16">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'Proje bulunamadı' : 'Henüz proje yok'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                : 'İlk projeyi oluşturmak için butona tıklayın'
              }
            </p>
            {['admin', 'manager'].includes(user.role) && !searchTerm && statusFilter === 'all' && (
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center px-5 py-2.5 bg-navy text-white text-sm font-bold rounded-lg hover:bg-navy/90 transition-colors shadow-lg shadow-navy/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Proje Oluştur
              </Link>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={hideDeleteModal}
          onConfirm={confirmDelete}
          title="Projeyi Sil"
          itemName={itemToDelete?.name || ''}
          description={itemToDelete?.description}
          loading={isDeleting}
          warningItems={itemToDelete?.warningItems}
        />
      </div>
    </DashboardLayout>
  )
}
