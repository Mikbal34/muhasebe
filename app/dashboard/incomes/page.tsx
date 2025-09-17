'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
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
  TrendingUp
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface Income {
  id: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  net_amount: number
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
    totalNet: acc.totalNet + income.net_amount,
    count: acc.count + 1
  }), { totalGross: 0, totalVat: 0, totalNet: 0, count: 0 })

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
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

          {(user.role === 'admin' || user.role === 'finance_officer') && (
            <Link
              href="/dashboard/incomes/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Yeni Gelir
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Brüt Toplam</p>
                <p className="text-xl font-bold text-green-600">
                  ₺{totalStats.totalGross.toLocaleString('tr-TR')}
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
                  ₺{totalStats.totalVat.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Net Toplam</p>
                <p className="text-xl font-bold text-blue-600">
                  ₺{totalStats.totalNet.toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gelir Sayısı</p>
                <p className="text-xl font-bold text-purple-600">
                  {totalStats.count}
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

        {/* Incomes Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proje
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brüt Tutar
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temsilci
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIncomes.map((income) => (
                  <tr key={income.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {income.project.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {income.project.code}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {income.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₺{income.gross_amount.toLocaleString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ₺{income.vat_amount.toLocaleString('tr-TR')}
                      </div>
                      <div className="text-xs text-gray-500">
                        %{income.vat_rate}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ₺{income.net_amount.toLocaleString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(income.income_date).toLocaleDateString('tr-TR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {income.distributions.length} kişi
                      </div>
                      <div className="text-xs text-gray-500">
                        {income.distributions.slice(0, 2).map(d => d.user.full_name).join(', ')}
                        {income.distributions.length > 2 && ` +${income.distributions.length - 2} diğer`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/dashboard/incomes/${income.id}`}
                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Görüntüle"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {(user.role === 'admin' || user.role === 'finance_officer') && (
                          <>
                            <Link
                              href={`/dashboard/incomes/${income.id}/edit`}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Düzenle"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>

                            <button
                              className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Sil"
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

          {filteredIncomes.length === 0 && (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || projectFilter ? 'Gelir bulunamadı' : 'Henüz gelir kaydı yok'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || projectFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'İlk geliri kaydetmek için butona tıklayın'
                }
              </p>
              {(user.role === 'admin' || user.role === 'finance_officer') && !searchTerm && !projectFilter && (
                <Link
                  href="/dashboard/incomes/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Gelir Ekle
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}