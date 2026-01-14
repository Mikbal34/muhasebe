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
  Banknote,
  Download
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useIncomes, useInvalidateIncomes, DateRange } from '@/hooks/use-incomes'
import { DateRangePicker } from '@/components/ui/date-range-picker'

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
  is_fsmh_income: boolean
  income_type: 'ozel' | 'kamu'
  is_tto_income: boolean
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
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null)
  const [exporting, setExporting] = useState(false)
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const router = useRouter()

  // React Query hooks - 5 dakika cache
  const { data: incomes = [], isLoading: incomesLoading } = useIncomes(dateRange)
  const invalidateIncomes = useInvalidateIncomes()

  // Sadece user kontrolü - data fetching React Query'de
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
    // React Query cache'i invalidate et
    invalidateIncomes()
  }

  const handleExportExcel = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExporting(true)
    try {
      const response = await fetch('/api/reports/export/income', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectFilter || undefined
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proje_bazli_gelir_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Excel dosyası oluşturulurken bir hata oluştu')
    } finally {
      setExporting(false)
    }
  }

  if (incomesLoading || !user) {
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
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gelirler</h1>
              <p className="text-sm text-slate-600">Proje gelirlerini görüntüleyin ve yönetin</p>
            </div>

            {(user.role === 'admin' || user.role === 'manager') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex items-center px-3 py-2 border border-slate-300 text-sm font-semibold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'İndiriliyor...' : 'Dışa Aktar'}
                </button>
                <div className="relative inline-block">
                  <button
                    onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni İşlem
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </button>

                  {actionDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setActionDropdownOpen(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-50">
                        <div className="py-1">
                          <Link
                            href="/dashboard/incomes/new"
                            className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                            onClick={() => setActionDropdownOpen(false)}
                          >
                            <Plus className="h-4 w-4 mr-3 text-teal-600" />
                            Yeni Gelir
                          </Link>
                          <Link
                            href="/dashboard/balances/allocate"
                            className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                            onClick={() => setActionDropdownOpen(false)}
                          >
                            <Coins className="h-4 w-4 mr-3 text-amber-600" />
                            Gelir Dağılımı
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Gelen Toplam</p>
            <p className="text-lg font-bold text-slate-900">
              ₺{totalStats.totalGross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">KDV Toplam</p>
            <p className="text-lg font-bold text-slate-900">
              ₺{totalStats.totalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Tahsilat Toplam</p>
            <p className="text-lg font-bold text-emerald-600">
              ₺{totalStats.totalCollected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Tahsil Edilecek</p>
            <p className="text-lg font-bold text-orange-600">
              ₺{totalOutstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Proje adı, kodu veya açıklama ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 text-slate-900 appearance-none cursor-pointer"
              >
                <option value="">Tüm Projeler</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />

            <div className="col-span-full flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center text-sm text-slate-700 font-medium">
                <Wallet className="h-5 w-5 mr-2 text-teal-600" />
                {filteredIncomes.length} gelir görüntüleniyor
              </div>
            </div>
          </div>
        </div>

        {/* Incomes by Project (Accordion) */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Henüz gelir kaydı yok</h3>
              <p className="text-sm text-slate-600 mb-4">İlk gelir kaydını oluşturmak için butona tıklayın</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center px-3 py-2 text-sm font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk geliri ekleyin
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const isExpanded = expandedProjects[group.project.id]

              return (
                <div key={group.project.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* Project Header (Accordion Toggle) */}
                  <button
                    onClick={() => toggleProject(group.project.id)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-600" />
                        )}
                        <div className="h-8 w-8 bg-slate-700 rounded-lg flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <div className="text-left">
                        <h3 className="text-base font-bold text-slate-900">{group.project.name}</h3>
                        <p className="text-sm text-slate-600">{group.project.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <p className="text-xs text-slate-600 uppercase">Gelir Sayısı</p>
                        <p className="text-base font-bold text-slate-900">{group.incomes.length}</p>
                      </div>
                      <div className="text-right bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <p className="text-xs text-slate-600 uppercase">Brüt Toplam</p>
                        <p className="text-base font-bold text-slate-900">
                          ₺{group.totalGross.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="text-right bg-white rounded-lg px-3 py-2 border border-slate-200">
                        <p className="text-xs text-slate-600 uppercase">Net Toplam</p>
                        <p className="text-base font-bold text-slate-900">
                          ₺{group.totalNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Project Incomes (Collapsible) */}
                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Açıklama
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Tip
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Brüt Tutar
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Tahsilat
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                KDV
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Net Tutar
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
                                Tarih
                              </th>
                              {(user.role === 'admin' || user.role === 'manager') && (
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-900 uppercase">
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
                                <tr key={income.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="text-sm font-medium text-slate-900">
                                      {income.description || '-'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-wrap gap-1">
                                      {income.is_fsmh_income && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                                          FSMH
                                        </span>
                                      )}
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                        income.income_type === 'kamu'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {income.income_type === 'kamu' ? 'Kamu' : 'Özel'}
                                      </span>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                        income.is_tto_income
                                          ? 'bg-teal-100 text-teal-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {income.is_tto_income ? 'TTO' : 'TTO Dışı'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900">
                                      ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                      <div className="text-sm font-semibold text-emerald-600">
                                        ₺{income.collected_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                      </div>
                                      {outstandingAmount > 0 && (
                                        <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded inline-flex items-center w-fit">
                                          Açık: ₺{outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </div>
                                      )}
                                      {isFullyCollected && (
                                        <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-flex items-center w-fit">
                                          ✓ Tam tahsil
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-slate-700">
                                      %{income.vat_rate} (₺{income.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-slate-900">
                                      ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-slate-700">
                                      {new Date(income.income_date).toLocaleDateString('tr-TR')}
                                    </div>
                                  </td>
                                  {(user.role === 'admin' || user.role === 'manager') && (
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <button
                                        onClick={() => openCollectionModal(income)}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded text-white bg-teal-600 hover:bg-teal-700 transition-colors"
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