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
  DollarSign
} from 'lucide-react'
import { DeleteConfirmationModal } from '@/components/ui/confirmation-modal'
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation'
import { ExportButton } from '@/components/ui/export-button'
import { useProjectsExport } from '@/hooks/useExport'
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
    share_percentage: number
    is_lead: boolean
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
  const { exportData, isExporting, exportError } = useProjectsExport()

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projeler</h1>
            <p className="text-gray-600">Tüm projeleri görüntüleyin ve yönetin</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-white border rounded-lg p-1 flex items-center space-x-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                title="Izgara Görünümü"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                title="Liste Görünümü"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </button>
            </div>

            <ExportButton
              onExport={(format) => exportData(filteredProjects, format)}
              isExporting={isExporting}
              data={filteredProjects}
              size="sm"
            />

            {['admin', 'manager'].includes(user.role) && (
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Proje
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya akademisyen ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>

            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={representativeFilter}
                onChange={(e) => setRepresentativeFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tüm Temsilciler</option>
                {academicians.map(academician => (
                  <option key={academician.id} value={academician.id}>
                    {academician.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-gray-500 flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              {filteredProjects.length} proje görüntüleniyor
            </div>
          </div>
        </div>

        {/* Projects View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-gray-500">{project.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Bütçe: ₺{project.budget.toLocaleString('tr-TR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {project.budget > 0 ? Math.round((project.total_received / project.budget) * 100) : 0}% tamamlandı
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${project.budget > 0 ? Math.min((project.total_received / project.budget) * 100, 100) : 0}%`
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-green-600">
                        <div className="font-medium">Gelen</div>
                        <div>₺{project.total_received.toLocaleString('tr-TR')}</div>
                      </div>
                      <div className="text-orange-600">
                        <div className="font-medium">Kalan</div>
                        <div>₺{project.remaining_budget.toLocaleString('tr-TR')}</div>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(project.start_date).toLocaleDateString('tr-TR')}
                      {project.end_date && ` - ${new Date(project.end_date).toLocaleDateString('tr-TR')}`}
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      {project.representatives.length} temsilci
                    </div>
                  </div>

                  {/* Representatives Preview */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Temsilciler</h4>
                    <div className="space-y-1">
                      {project.representatives.slice(0, 2).map((rep) => {
                        const personName = rep.user?.full_name || rep.personnel?.full_name || 'Bilinmiyor'
                        const isLeader = rep.role === 'project_leader'
                        return (
                          <div key={rep.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {personName}
                              {isLeader && <span className="text-blue-600"> (Yürütücü)</span>}
                            </span>
                          </div>
                        )
                      })}
                      {project.representatives.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{project.representatives.length - 2} diğer temsilci
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2">
                    <Link
                      href={`/dashboard/projects/${project.id}` as any}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Görüntüle"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>

                    {(['admin', 'manager'].includes(user.role)) && (
                      <>
                        {project.status === 'active' ? (
                          <Link
                            href={`/dashboard/projects/${project.id}/edit` as any}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        ) : (
                          <div
                            className="p-2 text-gray-400 cursor-not-allowed rounded-md"
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
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proje
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bütçe / Kalan
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temsilciler
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">{project.name}</span>
                          <span className="text-sm text-gray-500">{project.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-sm">
                          <span className="text-gray-900">₺{project.budget.toLocaleString('tr-TR')}</span>
                          <span className="text-orange-600 text-xs">Kalan: ₺{project.remaining_budget.toLocaleString('tr-TR')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(project.start_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2 overflow-hidden">
                          {project.representatives.slice(0, 3).map((rep) => {
                            const person = rep.user || rep.personnel
                            const fullName = person?.full_name || 'N/A'
                            return (
                              <div
                                key={rep.id}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600"
                                title={`${fullName} (%${rep.share_percentage})`}
                              >
                                {fullName.charAt(0)}
                              </div>
                            )
                          })}
                          {project.representatives.length > 3 && (
                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-500">
                              +{project.representatives.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link
                            href={`/dashboard/projects/${project.id}` as any}
                            className="text-blue-600 hover:text-blue-900"
                            title="Görüntüle"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {(['admin', 'manager'].includes(user.role)) && (
                            <>
                              {project.status === 'active' ? (
                                <Link
                                  href={`/dashboard/projects/${project.id}/edit` as any}
                                  className="text-green-600 hover:text-green-900"
                                  title="Düzenle"
                                >
                                  <Edit className="h-4 w-4" />
                                </Link>
                              ) : (
                                <span className="text-gray-400 cursor-not-allowed">
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
                                className="text-red-600 hover:text-red-900"
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
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter ? 'Proje bulunamadı' : 'Henüz proje yok'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter
                ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                : 'İlk projeyi oluşturmak için butona tıklayın'
              }
            </p>
            {['admin', 'manager'].includes(user.role) && !searchTerm && !statusFilter && (
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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