'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Building2,
  Calendar,
  DollarSign,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Download
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

type ExpenseType = 'genel' | 'proje'

interface Expense {
  id: string
  expense_type: ExpenseType
  amount: number
  description: string
  expense_date: string
  is_tto_expense: boolean
  created_at: string
  project: {
    id: string
    code: string
    name: string
  } | null
  created_by_user: {
    full_name: string
  }
}

export default function ExpensesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [exporting, setExporting] = useState(false)
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
      fetchExpenses(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchExpenses = async (token: string) => {
    try {
      const response = await fetch('/api/expenses', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setExpenses(data.data.expenses || [])
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu gideri silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        setExpenses(expenses.filter(e => e.id !== id))
        alert('Gider başarıyla silindi')
      } else {
        alert(data.error || 'Gider silinemedi')
      }
    } catch (err) {
      console.error('Failed to delete expense:', err)
      alert('Gider silinemedi')
    }
  }

  const filteredExpenses = expenses.filter(expense => {
    const projectName = expense.project?.name || 'Genel Gider'
    const projectCode = expense.project?.code || ''
    const matchesSearch = projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !projectFilter ||
                          (projectFilter === 'genel' && !expense.project) ||
                          (expense.project?.id === projectFilter)
    return matchesSearch && matchesProject
  })

  // Get unique projects for filter (excluding genel gider)
  const projects = Array.from(
    new Set(expenses
      .filter(expense => expense.project)
      .map(expense => JSON.stringify({ id: expense.project!.id, name: expense.project!.name, code: expense.project!.code })))
  ).map(str => JSON.parse(str))

  // Check if we have any genel gider
  const hasGenelGider = expenses.some(e => e.expense_type === 'genel')

  const totalStats = filteredExpenses.reduce((acc, expense) => ({
    totalAmount: acc.totalAmount + expense.amount,
    count: acc.count + 1
  }), { totalAmount: 0, count: 0 })

  // Group expenses by project (genel gider grouped separately)
  const expensesByProject = filteredExpenses.reduce((acc, expense) => {
    const projectKey = expense.project?.id || 'genel'
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: expense.project,
        expenses: [],
        totalAmount: 0,
        isGenel: expense.expense_type === 'genel'
      }
    }
    acc[projectKey].expenses.push(expense)
    acc[projectKey].totalAmount += expense.amount
    return acc
  }, {} as Record<string, { project: any; expenses: Expense[]; totalAmount: number; isGenel: boolean }>)

  // Sort groups: Genel Giderler first, then by project name
  const projectGroups = Object.values(expensesByProject).sort((a, b) => {
    if (a.isGenel) return -1
    if (b.isGenel) return 1
    return (a.project?.name || '').localeCompare(b.project?.name || '')
  })

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleExportExcel = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setExporting(true)
    try {
      const response = await fetch('/api/reports/export/expense', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectFilter && projectFilter !== 'genel' ? projectFilter : undefined
        })
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proje_bazli_gider_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`
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
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stat Cards Skeleton - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-64" />
            </div>
          </div>

          {/* Expense Groups Skeleton */}
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
              <h1 className="text-xl font-bold text-slate-900">Giderler</h1>
              <p className="text-sm text-slate-600">Genel ve proje giderlerini görüntüleyin ve yönetin</p>
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
                <Link
                  href="/dashboard/expenses/new"
                  className="inline-flex items-center px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Gider
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Toplam Gider</p>
            <p className="text-lg font-bold text-slate-900">
              ₺{totalStats.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Toplam Kayıt</p>
            <p className="text-lg font-bold text-slate-900">{totalStats.count}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
            <p className="text-xs text-slate-600 uppercase mb-1">Ortalama Gider</p>
            <p className="text-lg font-bold text-slate-900">
              ₺{totalStats.count > 0 ? (totalStats.totalAmount / totalStats.count).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '0.00'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Proje veya açıklama ara..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="">Tüm Giderler</option>
                {hasGenelGider && (
                  <option value="genel">Genel Giderler</option>
                )}
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Expenses by Project (Accordion) */}
        <div className="space-y-4">
          {projectGroups.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">Henüz gider kaydı bulunmamaktadır</p>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link
                  href="/dashboard/expenses/new"
                  className="inline-flex items-center mt-4 text-teal-600 hover:text-teal-700 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  İlk gideri ekleyin
                </Link>
              )}
            </div>
          ) : (
            projectGroups.map((group) => {
              const groupKey = group.isGenel ? 'genel' : group.project?.id
              const isExpanded = expandedProjects[groupKey]

              return (
                <div key={groupKey} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  {/* Project Header (Accordion Toggle) */}
                  <button
                    onClick={() => toggleProject(groupKey)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-600" />
                        )}
                        {group.isGenel ? (
                          <Receipt className="h-5 w-5 text-purple-600" />
                        ) : (
                          <Building2 className="h-5 w-5 text-blue-600" />
                        )}
                      </div>

                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {group.isGenel ? 'Genel Giderler' : group.project?.name}
                          </h3>
                          {group.isGenel && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                              TTO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {group.isGenel ? 'Proje dışı genel giderler' : group.project?.code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Gider Sayısı</p>
                        <p className="text-sm font-semibold text-gray-900">{group.expenses.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Toplam Tutar</p>
                        <p className="text-sm font-semibold text-red-600">
                          ₺{group.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Project Expenses (Collapsible) */}
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
                                Tip
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tutar
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tarih
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Oluşturan
                              </th>
                              {user.role === 'admin' && (
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  İşlemler
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {group.expenses.map((expense) => (
                              <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900">
                                    {expense.description}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex flex-wrap gap-1">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                      expense.expense_type === 'genel'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {expense.expense_type === 'genel' ? 'Genel' : 'Proje'}
                                    </span>
                                    {expense.expense_type === 'proje' && (
                                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                        expense.is_tto_expense
                                          ? 'bg-teal-100 text-teal-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}>
                                        {expense.is_tto_expense ? 'Ortak' : 'Karşı'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-semibold text-red-600">
                                    ₺{expense.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {new Date(expense.expense_date).toLocaleDateString('tr-TR')}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{expense.created_by_user.full_name}</div>
                                </td>
                                {user.role === 'admin' && (
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                      onClick={() => handleDelete(expense.id)}
                                      className="text-red-600 hover:text-red-900"
                                      title="Sil"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
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
      </div>
    </DashboardLayout>
  )
}
