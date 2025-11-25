'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Download
} from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/ui/confirmation-modal'
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation'
import { ProjectCardSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeleton'

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
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [representativeFilter, setRepresentativeFilter] = useState<string>('')
  const [academicians, setAcademicians] = useState<User[]>([])
  const router = useRouter()

  // Delete functionality
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
      const token = localStorage.getItem('token')
      if (token) fetchProjects(token)
    },
    onError: (error) => {
      console.error('Delete error:', error)
    }
  })

  // Export functionality
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
      fetchProjects(token)
      fetchAcademicians(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchAcademicians = async (token: string) => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setAcademicians(data.data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const fetchProjects = async (token: string) => {
    try {
      const queryParams = new URLSearchParams()
      if (statusFilter) queryParams.append('status', statusFilter)
      if (representativeFilter) queryParams.append('representative_id', representativeFilter)

      const response = await fetch(`/api/projects?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setProjects(data.data.projects || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchProjects(token)
    }
  }, [statusFilter, representativeFilter])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.representatives.some(rep => {
        const person = rep.user || rep.personnel
        return person?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
      })
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif'
      case 'completed': return 'Tamamlandı'
      case 'cancelled': return 'İptal Edildi'
      default: return status
    }
  }

  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Filters & View Toggle Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Projects Skeleton - Default to grid view */}
          <ProjectCardSkeleton count={6} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Projeler</h1>
              <p className="text-sm text-slate-600">Tüm projeleri görüntüleyin ve yönetin</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-100 border border-slate-300 rounded p-1 flex items-center gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                  title="Izgara Görünümü"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}
                  title="Liste Görünümü"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </button>
              </div>

              <button
                onClick={handleExportProjectCard}
                disabled={exportingKunye}
                className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-semibold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportingKunye ? 'İndiriliyor...' : 'Dışa Aktar'}
              </button>

              {['admin', 'manager'].includes(user.role) && (
                <Link
                  href="/dashboard/projects/new"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Yeni Proje
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya akademisyen ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div className="relative">
              <select
                value={representativeFilter}
                onChange={(e) => setRepresentativeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Temsilciler</option>
                {academicians.map(academician => (
                  <option key={academician.id} value={academician.id}>
                    {academician.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-full flex items-center text-sm text-slate-700">
              {filteredProjects.length} proje görüntüleniyor
            </div>
          </div>
        </div>

        {/* Projects View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-600">{project.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Bütçe:</span>
                      <span className="font-semibold text-slate-900">₺{project.budget.toLocaleString('tr-TR')}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded h-2">
                      <div
                        className="bg-teal-600 h-2 rounded transition-all"
                        style={{
                          width: `${project.budget > 0 ? Math.min((project.total_received / project.budget) * 100, 100) : 0}%`
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-emerald-50 rounded p-2 border border-emerald-100">
                        <div className="text-emerald-700 text-xs mb-0.5">Gelen</div>
                        <div className="text-emerald-800 font-semibold text-sm">₺{project.total_received.toLocaleString('tr-TR')}</div>
                      </div>
                      <div className="bg-orange-50 rounded p-2 border border-orange-100">
                        <div className="text-orange-700 text-xs mb-0.5">Kalan</div>
                        <div className="text-orange-800 font-semibold text-sm">₺{project.remaining_budget.toLocaleString('tr-TR')}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600">
                      {new Date(project.start_date).toLocaleDateString('tr-TR')}
                      {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString('tr-TR')}`}
                    </div>

                    <div className="text-xs text-slate-600">
                      {project.representatives.length} temsilci
                    </div>
                  </div>

                  {/* Representatives Preview */}
                  <div className="mb-4 bg-slate-50 rounded p-3 border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-900 mb-2">Temsilciler</h4>
                    <div className="space-y-1.5">
                      {project.representatives.slice(0, 2).map((rep) => {
                        const personName = rep.user?.full_name || rep.personnel?.full_name || 'Bilinmiyor'
                        const isLeader = rep.role === 'project_leader'
                        return (
                          <div key={rep.id} className="flex items-center text-xs">
                            <div className="h-5 w-5 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                              {personName.charAt(0)}
                            </div>
                            <span className="text-slate-700">
                              {personName}
                              {isLeader && <span className="text-teal-600 font-semibold"> (Yürütücü)</span>}
                            </span>
                          </div>
                        )
                      })}
                      {project.representatives.length > 2 && (
                        <p className="text-xs text-slate-500 ml-7">
                          +{project.representatives.length - 2} diğer
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                    <Link
                      href={`/dashboard/projects/${project.id}` as any}
                      className="p-2 text-slate-600 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
                      title="Görüntüle"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    {(['admin', 'manager'].includes(user.role)) && (
                      <>
                        {project.status === 'active' ? (
                          <Link
                            href={`/dashboard/projects/${project.id}/edit` as any}
                            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        ) : (
                          <div
                            className="p-2 text-slate-400 cursor-not-allowed rounded"
                            title="Tamamlanan projeler düzenlenemez"
                          >
                            <Edit className="h-4 w-4" />
                          </div>
                        )}

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
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                          title="Sil"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                      Proje
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                      Durum
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                      Bütçe / Kalan
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                      Tarih
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                      Temsilciler
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-900 uppercase">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{project.name}</span>
                          <span className="text-xs text-slate-600">{project.code}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col text-sm">
                          <span className="text-slate-900 font-semibold">₺{project.budget.toLocaleString('tr-TR')}</span>
                          <span className="text-orange-600 text-xs">Kalan: ₺{project.remaining_budget.toLocaleString('tr-TR')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">
                        {new Date(project.start_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex -space-x-2 overflow-hidden">
                          {project.representatives.slice(0, 3).map((rep) => {
                            const person = rep.user || rep.personnel
                            const fullName = person?.full_name || 'N/A'
                            return (
                              <div
                                key={rep.id}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-700 flex items-center justify-center text-xs font-semibold text-white"
                                title={`${fullName} (%${rep.share_percentage})`}
                              >
                                {fullName.charAt(0)}
                              </div>
                            )
                          })}
                          {project.representatives.length > 3 && (
                            <div className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                              +{project.representatives.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/projects/${project.id}` as any}
                            className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {(['admin', 'manager'].includes(user.role)) && (
                            <>
                              {project.status === 'active' ? (
                                <Link
                                  href={`/dashboard/projects/${project.id}/edit` as any}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                                  title="Düzenle"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                              ) : (
                                <span className="p-1.5 text-slate-400 cursor-not-allowed rounded">
                                  <Edit className="h-4 w-4" />
                                </span>
                              )}

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
                                className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                                title="Sil"
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 text-center py-12">
            <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {searchTerm || statusFilter ? 'Proje bulunamadı' : 'Henüz proje yok'}
            </h3>
            <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter
                ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                : 'İlk projeyi oluşturmak için butona tıklayın'
              }
            </p>
            {['admin', 'manager'].includes(user.role) && !searchTerm && !statusFilter && (
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
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