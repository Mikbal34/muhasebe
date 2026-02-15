'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  ArrowLeft,
  PiggyBank,
  Building2,
  Search,
  Calendar,
  Receipt,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface PlannedInvoice {
  id: string
  description: string
  amount: number
  plannedDate: string
}

interface Project {
  id: string
  code: string
  name: string
  company: string
  budget: number
  invoiced: number
  remaining: number
  progress: number
  plannedInvoices: PlannedInvoice[]
}

interface RemainingData {
  total: number
  projectCount: number
  totalPlannedCount: number
  projects: Project[]
}

export default function RemainingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [data, setData] = useState<RemainingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

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
      return
    }

    // Fetch remaining data
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard/remaining', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }

        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.message || 'Failed to fetch data')
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const filteredProjects = data?.projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.company.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border overflow-hidden">
                <Skeleton className="h-1 w-full" />
                <div className="p-5">
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-8 w-40" />
                </div>
              </div>
            ))}
          </div>

          {/* Search Skeleton */}
          <div className="bg-white rounded-xl border p-4">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Projects Skeleton */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout user={user}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-navy">Kesilecek Faturalar</h1>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-700 mb-2">Veri Yüklenemedi</h3>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy">Kesilecek Faturalar</h1>
            <p className="text-sm text-slate-500">Henüz faturalandırılmamıs proje bütceleri</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toplam Kesilecek */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Toplam Kesilecek Fatura</p>
                <PiggyBank className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-700">
                ₺{(data?.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Proje Sayısı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-navy to-navy/50"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Proje Sayısı</p>
                <Building2 className="w-5 h-5 text-navy" />
              </div>
              <p className="text-2xl font-black text-navy">{data?.projectCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Fatura bekleyen proje</p>
            </div>
          </div>

          {/* Planlanan Fatura Sayısı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Planlanan Fatura</p>
                <Receipt className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{data?.totalPlannedCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Kesilecek fatura adedi</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Proje adı, kodu veya firma ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-slate-50 border-none rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-navy/20 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                expandedProjects.has(project.id)
                  ? 'border-navy/30 shadow-navy/10'
                  : 'border-slate-100 hover:border-navy/20'
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full p-5 text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-navy">{project.name}</h3>
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">{project.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* Progress */}
                    <div className="hidden md:block">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-navy rounded-full"
                            style={{ width: `${Math.min(project.progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{project.progress}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 uppercase font-bold">Kesilecek</p>
                      <p className="text-lg font-black text-slate-600">
                        ₺{project.remaining.toLocaleString('tr-TR')}
                      </p>
                    </div>
                    {expandedProjects.has(project.id) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {expandedProjects.has(project.id) && (
                <div className="border-t border-slate-100 bg-slate-50/30">
                  {/* Summary */}
                  <div className="p-4 grid grid-cols-3 gap-4 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Toplam Bütce</p>
                      <p className="text-sm font-bold text-slate-700">₺{project.budget.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Kesilen Fatura</p>
                      <p className="text-sm font-bold text-navy">₺{project.invoiced.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Kalan</p>
                      <p className="text-sm font-bold text-slate-600">₺{project.remaining.toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  {/* Planned Invoices */}
                  {project.plannedInvoices.length > 0 ? (
                    <div className="p-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-3">Planlanan Faturalar</p>
                      <div className="space-y-2">
                        {project.plannedInvoices.map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Receipt className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">{invoice.description || 'Planlanan Fatura'}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>Planlanan: {invoice.plannedDate ? new Date(invoice.plannedDate).toLocaleDateString('tr-TR') : '-'}</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-navy">
                              ₺{invoice.amount.toLocaleString('tr-TR')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      <p className="text-sm">Henüz planlanan fatura bulunmuyor</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">
              {searchTerm ? 'Sonuc Bulunamadı' : 'Kesilecek Fatura Yok'}
            </h3>
            <p className="text-slate-500">
              {searchTerm
                ? 'Arama kriterlerinize uygun proje bulunamadı.'
                : 'Tüm projeler için faturalar kesilmis durumda.'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
