'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import { CollectionModal } from '@/components/income/collection-modal'
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  TrendingUp,
  Coins,
  ChevronDown,
  ChevronRight,
  Banknote
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Income {
  id: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  net_amount: number
  collected_amount: number
  description: string | null
  income_date: string
  created_at: string
  project: {
    id: string
    code: string
    name: string
  }
  created_by_user: {
    full_name: string
  }
  distributions: Array<{
    id: string
    amount: number
    share_percentage: number
    user: {
      id: string
      full_name: string
      email: string
    }
  }>
}

export default function IncomesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      setUser(JSON.parse(userData))
      fetchIncomes(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchIncomes = async (token: string) => {
    try {
      const response = await fetch('/api/incomes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setIncomes(data.data.incomes || [])
      }
    } catch (err) {
      console.error('Failed to fetch incomes:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredIncomes = incomes.filter(income => {
    const matchesSearch = income.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         income.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !projectFilter || income.project.id === projectFilter
    return matchesSearch && matchesProject
  })

  // Get unique projects for filter
  const projects = Array.from(
    new Set(incomes.map(income => JSON.stringify({ id: income.project.id, name: income.project.name, code: income.project.code })))
  ).map(str => JSON.parse(str))

  const totalStats = filteredIncomes.reduce((acc, income) => ({
    totalGross: acc.totalGross + income.gross_amount,
    totalVat: acc.totalVat + income.vat_amount,
    totalCollected: acc.totalCollected + income.collected_amount,
    count: acc.count + 1
  }), { totalGross: 0, totalVat: 0, totalCollected: 0, count: 0 })

  const totalOutstanding = totalStats.totalGross - totalStats.totalCollected

  // Group incomes by project
  const incomesByProject = filteredIncomes.reduce((acc, income) => {
    const projectKey = income.project.id
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: income.project,
        incomes: [],
        totalGross: 0,
        totalVat: 0,
        totalNet: 0
      }
    }
    acc[projectKey].incomes.push(income)
    acc[projectKey].totalGross += income.gross_amount
    acc[projectKey].totalVat += income.vat_amount
    acc[projectKey].totalNet += income.net_amount
    return acc
  }, {} as Record<string, { project: any; incomes: Income[]; totalGross: number; totalVat: number; totalNet: number }>)

  const projectGroups = Object.values(incomesByProject)

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const openCollectionModal = (income: Income) => {
    setSelectedIncome(income)
    setCollectionModalOpen(true)
  }

  const handleCollectionSuccess = () => {
    // Refresh incomes list
    const token = localStorage.getItem('token')
    if (token) {
      fetchIncomes(token)
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

          {/* Stat Cards Skeleton - 4 cards */}
          <StatCardSkeleton count={4} />

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-64" />
            </div>
          </div>

          {/* Income Groups Skeleton */}
          <AccordionGroupSkeleton count={3} />
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
            <h1 className="text-2xl font-bold text-gray-900">Gelirler</h1>
            <p className="text-gray-600">Proje gelirlerini görüntüleyin ve yönetin</p>
          </div>

          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/balances/allocate"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Coins className="h-4 w-4 mr-2" />
                Gelir Dağılımı
              </Link>
              <Link
                href="/dashboard/incomes/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Gelir
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gelen Toplam</p>
                <p className="text-xl font-bold text-blue-600">
                  ₺{totalStats.totalGross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-red-600 bg-red-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">KDV Toplam</p>
                <p className="text-xl font-bold text-red-600">
                  ₺{totalStats.totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tahsilat Toplam</p>
                <p className="text-xl font-bold text-green-600">
                  ₺{totalStats.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600 bg-orange-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tahsil Edilecek</p>
                <p className="text-xl font-bold text-orange-600">
                  ₺{totalOutstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya açıklama ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Tüm Projeler</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-sm text-gray-500 flex items-center">
              <Wallet className="h-4 w-4 mr-1" />
              {filteredIncomes.length} gelir görüntüleniyor
            </div>
          </div>
        </div>

        {/* Incomes by Project (Accordion) */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz gelir kaydı bulunmamaktadır</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center mt-4 text-green-600 hover:text-green-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  İlk geliri ekleyin
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const isExpanded = expandedProjects[group.project.id]

              return (
                <div key={group.project.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Project Header (Accordion Toggle) */}
                  <button
                    onClick={() => toggleProject(group.project.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>

                      <div className="text-left">
                        <h3 className="text-base font-semibold text-gray-900">{group.project.name}</h3>
                        <p className="text-sm text-gray-500">{group.project.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Gelir Sayısı</p>
                        <p className="text-sm font-semibold text-gray-900">{group.incomes.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Brüt Toplam</p>
                        <p className="text-sm font-semibold text-green-600">
                          ₺{group.totalGross.toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Net Toplam</p>
                        <p className="text-sm font-semibold text-blue-600">
                          ₺{group.totalNet.toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Project Incomes (Collapsible) */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Açıklama
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Brüt Tutar
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tahsilat
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                KDV
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Net Tutar
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarih
                              </th>
                              {(user.role === 'admin' || user.role === 'manager') && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  İşlemler
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.incomes.map((income) => {
                              const outstandingAmount = income.gross_amount - income.collected_amount
                              const isFullyCollected = income.collected_amount >= income.gross_amount

                              return (
                                <tr key={income.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                      {income.description || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-green-600">
                                      ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <div className="text-sm font-semibold text-blue-600">
                                        ₺{income.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                      </div>
                                      {outstandingAmount > 0 && (
                                        <div className="text-xs text-orange-600">
                                          Açık: ₺{outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </div>
                                      )}
                                      {isFullyCollected && (
                                        <div className="text-xs text-green-600 font-medium">
                                          ✓ Tam tahsil
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">
                                      %{income.vat_rate} (₺{income.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-blue-600">
                                      ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-gray-500">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {new Date(income.income_date).toLocaleDateString('tr-TR')}
                                    </div>
                                  </td>
                                  {(user.role === 'admin' || user.role === 'manager') && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        onClick={() => openCollectionModal(income)}
                                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                      >
                                        <Banknote className="h-3 w-3 mr-1" />
                                        Tahsilat
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Collection Modal */}
        {selectedIncome && (
          <CollectionModal
            isOpen={collectionModalOpen}
            onClose={() => setCollectionModalOpen(false)}
            onSuccess={handleCollectionSuccess}
            income={selectedIncome}
          />
        )}
      </div>
    </DashboardLayout>
  )
}