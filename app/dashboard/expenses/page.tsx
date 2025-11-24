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
  ChevronRight
} from 'lucide-react'
import { StatCardSkeleton, AccordionGroupSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Expense {
  id: string
  amount: number
  description: string
  expense_date: string
  created_at: string
  project: {
    id: string
    code: string
    name: string
  }
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
    const matchesSearch = expense.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !projectFilter || expense.project.id === projectFilter
    return matchesSearch && matchesProject
  })

  // Get unique projects for filter
  const projects = Array.from(
    new Set(expenses.map(expense => JSON.stringify({ id: expense.project.id, name: expense.project.name, code: expense.project.code })))
  ).map(str => JSON.parse(str))

  const totalStats = filteredExpenses.reduce((acc, expense) => ({
    totalAmount: acc.totalAmount + expense.amount,
    count: acc.count + 1
  }), { totalAmount: 0, count: 0 })

  // Group expenses by project
  const expensesByProject = filteredExpenses.reduce((acc, expense) => {
    const projectKey = expense.project.id
    if (!acc[projectKey]) {
      acc[projectKey] = {
        project: expense.project,
        expenses: [],
        totalAmount: 0
      }
    }
    acc[projectKey].expenses.push(expense)
    acc[projectKey].totalAmount += expense.amount
    return acc
  }, {} as Record<string, { project: any; expenses: Expense[]; totalAmount: number }>)

  const projectGroups = Object.values(expensesByProject)

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
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
              <p className="text-sm text-slate-600">Proje giderlerini görüntüleyin ve yönetin</p>
            </div>

            {(user.role === 'admin' || user.role === 'manager') && (
              <Link
                href="/dashboard/expenses/new"
                className="inline-flex items-center px-3 py-2 bg-teal-600 text-white text-sm font-semibold rounded hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Gider
              </Link>
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
                <option value="">Tüm Projeler</option>
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
