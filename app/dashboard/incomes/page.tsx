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
        {/* Header - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg p-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-xl flex items-center justify-center shadow-lg">
                <Wallet className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Gelirler</h1>
                <p className="text-slate-600 font-medium">Proje gelirlerini görüntüleyin ve yönetin</p>
              </div>
            </div>

            {(user.role === 'admin' || user.role === 'manager') && (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/balances/allocate"
                  className="inline-flex items-center px-5 py-3 border-2 border-slate-300 text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:border-accent-teal transition-all duration-200"
                >
                  <Coins className="h-5 w-5 mr-2" />
                  Gelir Dağılımı
                </Link>
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center px-5 py-3 border-2 border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-accent-teal to-accent-cyan hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Yeni Gelir
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Modern Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-200 hover:border-accent-teal group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Gelen Toplam</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₺{(totalStats.totalGross / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              ₺{totalStats.totalGross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-200 hover:border-red-500 group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">KDV Toplam</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₺{(totalStats.totalVat / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Percent className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-red-600 font-medium">
              ₺{totalStats.totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-200 hover:border-accent-teal group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tahsilat Toplam</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₺{(totalStats.totalCollected / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-accent-teal font-medium">
              ₺{totalStats.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-200 hover:border-orange-500 group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tahsil Edilecek</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₺{(totalOutstanding / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-xs text-orange-600 font-medium">
              ₺{totalOutstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filters - Modern Design */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent-teal h-5 w-5" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya açıklama ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-accent-teal transition-all duration-200 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent-teal h-5 w-5" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="pl-10 w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-teal focus:border-accent-teal transition-all duration-200 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Projeler</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-full flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center text-sm text-slate-700 font-medium">
                <Wallet className="h-5 w-5 mr-2 text-accent-teal" />
                {filteredIncomes.length} gelir görüntüleniyor
              </div>
            </div>
          </div>
        </div>

        {/* Incomes by Project (Accordion) - Modern Design */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-md border border-slate-200 p-16 text-center">
              <div className="h-20 w-20 bg-gradient-to-br from-accent-teal/20 to-accent-cyan/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Wallet className="h-10 w-10 text-accent-teal" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Henüz gelir kaydı yok</h3>
              <p className="text-slate-600 font-medium mb-6">İlk gelir kaydını oluşturmak için butona tıklayın</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center px-6 py-3 border-2 border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-accent-teal to-accent-cyan hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  İlk geliri ekleyin
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const isExpanded = expandedProjects[group.project.id]

              return (
                <div key={group.project.id} className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Project Header (Accordion Toggle) - Modern Design */}
                  <button
                    onClick={() => toggleProject(group.project.id)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-accent-teal/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-6 w-6 text-accent-teal" />
                        ) : (
                          <ChevronRight className="h-6 w-6 text-accent-teal" />
                        )}
                        <div className="h-10 w-10 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-lg flex items-center justify-center shadow-md">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <div className="text-left">
                        <h3 className="text-lg font-bold text-slate-900">{group.project.name}</h3>
                        <p className="text-sm font-medium text-accent-teal">{group.project.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right bg-white rounded-lg px-4 py-2 border border-slate-200 shadow-sm">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Gelir Sayısı</p>
                        <p className="text-lg font-bold text-slate-900">{group.incomes.length}</p>
                      </div>
                      <div className="text-right bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-100 shadow-sm">
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Brüt Toplam</p>
                        <p className="text-lg font-bold text-emerald-700">
                          ₺{group.totalGross.toLocaleString('tr-TR')}
                        </p>
                      </div>
                      <div className="text-right bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 shadow-sm">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Net Toplam</p>
                        <p className="text-lg font-bold text-blue-700">
                          ₺{group.totalNet.toLocaleString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Project Incomes (Collapsible) - Modern Table */}
                  {isExpanded && (
                    <div className="border-t-2 border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Açıklama
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Brüt Tutar
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Tahsilat
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                KDV
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Net Tutar
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Tarih
                              </th>
                              {(user.role === 'admin' || user.role === 'manager') && (
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  İşlemler
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                            {group.incomes.map((income) => {
                              const outstandingAmount = income.gross_amount - income.collected_amount
                              const isFullyCollected = income.collected_amount >= income.gross_amount

                              return (
                                <tr key={income.id} className="hover:bg-accent-teal/5 transition-colors duration-150">
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-900">
                                      {income.description || '-'}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-emerald-700">
                                      ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <div className="text-sm font-bold text-blue-700">
                                        ₺{income.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                      </div>
                                      {outstandingAmount > 0 && (
                                        <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                                          Açık: ₺{outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </div>
                                      )}
                                      {isFullyCollected && (
                                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center w-fit">
                                          ✓ Tam tahsil
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-700">
                                      %{income.vat_rate} (₺{income.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-blue-700">
                                      ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm font-medium text-slate-700">
                                      <Calendar className="h-4 w-4 mr-2 text-accent-teal" />
                                      {new Date(income.income_date).toLocaleDateString('tr-TR')}
                                    </div>
                                  </td>
                                  {(user.role === 'admin' || user.role === 'manager') && (
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <button
                                        onClick={() => openCollectionModal(income)}
                                        className="inline-flex items-center px-4 py-2 border-2 border-transparent text-xs font-bold rounded-lg text-white bg-gradient-to-r from-accent-teal to-accent-cyan hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-teal transition-all duration-200 hover:scale-105"
                                      >
                                        <Banknote className="h-4 w-4 mr-1" />
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