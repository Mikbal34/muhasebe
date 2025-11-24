'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Building2,
  Users,
  DollarSign,
  PieChart,
  TrendingUp,
  Filter,
  RefreshCw
} from 'lucide-react'
import { StatCardSkeleton, ChartSkeleton, Skeleton } from '@/components/ui/skeleton'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface ReportData {
  projects?: any[]
  academicians?: any[]
  payments?: any[]
  summary?: {
    totalGrossIncome?: number
    totalCommissions?: number
    totalDistributed?: number
    totalPayments?: number
    netCompanyIncome?: number
    pendingPayments?: number
    completedPayments?: number
    totalProjects?: number
    totalBudget?: number
    totalIncome?: number
    totalAcademicians?: number
    totalBalance?: number
    totalEarnings?: number
    totalAmount?: number
    statusBreakdown?: Record<string, number>
    avgPaymentAmount?: number
  }
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportType, setReportType] = useState<'project' | 'manager' | 'company' | 'payments'>('company')
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  })
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Only admin and finance officers can access reports
      if (!['admin', 'manager'].includes(parsedUser.role)) {
        router.push('/dashboard')
        return
      }

      // Generate initial company report
      generateReport(token, 'company', {})
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const generateReport = async (token: string, type: string, parameters: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          parameters
        })
      })

      const data = await response.json()

      if (data.success) {
        setReportData(data.data.report.data)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = () => {
    const token = localStorage.getItem('token')
    if (token) {
      const parameters: any = {}
      if (dateRange.start_date) parameters.start_date = dateRange.start_date
      if (dateRange.end_date) parameters.end_date = dateRange.end_date

      generateReport(token, reportType, parameters)
    }
  }

  if (!user) {
    return (
      <DashboardLayout user={{ id: '', full_name: 'Yükleniyor...', email: '', role: 'admin' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>

          {/* Report Controls Skeleton */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Report Data Skeleton */}
          <div className="space-y-6">
            <StatCardSkeleton count={4} />
            <ChartSkeleton height="h-96" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!['admin', 'manager'].includes(user.role)) {
    return (
      <DashboardLayout user={user}>
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erişim Yetkisi Yok</h3>
          <p className="text-gray-600">Bu sayfaya sadece yöneticiler erişebilir.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
            <p className="text-gray-600">Detaylı finansal raporları görüntüleyin ve indirin</p>
          </div>
        </div>

        {/* Report Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rapor Oluştur</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rapor Türü
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="company">Şirket Raporu</option>
                <option value="project">Proje Raporu</option>
                <option value="academician">Akademisyen Raporu</option>
                <option value="payments">Ödeme Raporu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Rapor Oluştur
              </button>
            </div>
          </div>
        </div>

        {/* Report Results */}
        {reportData && (
          <>
            {/* Summary Cards */}
            {reportData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportType === 'company' && (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Brüt Gelir</p>
                          <p className="text-xl font-bold text-green-600">
                            ₺{(reportData.summary.totalGrossIncome || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <PieChart className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Komisyon</p>
                          <p className="text-xl font-bold text-blue-600">
                            ₺{(reportData.summary.totalCommissions || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Dağıtılan</p>
                          <p className="text-xl font-bold text-purple-600">
                            ₺{(reportData.summary.totalDistributed || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-indigo-600 bg-indigo-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Net Şirket</p>
                          <p className="text-xl font-bold text-indigo-600">
                            ₺{(reportData.summary.netCompanyIncome || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'project' && (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <Building2 className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Proje Sayısı</p>
                          <p className="text-xl font-bold text-blue-600">
                            {reportData.summary.totalProjects || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Bütçe</p>
                          <p className="text-xl font-bold text-green-600">
                            ₺{(reportData.summary.totalBudget || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
                          <p className="text-xl font-bold text-purple-600">
                            ₺{(reportData.summary.totalIncome || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'payments' && (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <FileText className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Ödeme</p>
                          <p className="text-xl font-bold text-blue-600">
                            {reportData.summary.totalPayments || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Tutar</p>
                          <p className="text-xl font-bold text-green-600">
                            ₺{(reportData.summary.totalAmount || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Ortalama</p>
                          <p className="text-xl font-bold text-purple-600">
                            ₺{Math.round(reportData.summary.avgPaymentAmount || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'manager' && (
                  <>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-indigo-600 bg-indigo-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Akademisyen</p>
                          <p className="text-xl font-bold text-indigo-600">
                            {reportData.summary.totalAcademicians || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Bakiye</p>
                          <p className="text-xl font-bold text-green-600">
                            ₺{(reportData.summary.totalBalance || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Toplam Kazanç</p>
                          <p className="text-xl font-bold text-purple-600">
                            ₺{(reportData.summary.totalEarnings || 0).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Detailed Data */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {reportType === 'company' && 'Şirket Detay Raporu'}
                    {reportType === 'project' && 'Proje Detay Raporu'}
                    {reportType === 'manager' && 'Akademisyen Detay Raporu'}
                    {reportType === 'payments' && 'Ödeme Detay Raporu'}
                  </h2>
                  <button
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    onClick={async () => {
                      try {
                        console.log('Excel export started...')
                        const token = localStorage.getItem('token')
                        if (!token) {
                          alert('Oturum süresi dolmuş, lütfen tekrar giriş yapın.')
                          return
                        }

                        const response = await fetch('/api/reports/export', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            data: reportData,
                            reportType,
                            dateRange
                          })
                        })

                        if (!response.ok) {
                          throw new Error('Excel export failed')
                        }

                        // Get the filename from the response headers
                        const contentDisposition = response.headers.get('content-disposition')
                        let filename = 'rapor.xlsx'
                        if (contentDisposition) {
                          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
                          if (filenameMatch) {
                            filename = filenameMatch[1]
                          }
                        }

                        // Create blob and download
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const anchor = document.createElement('a')
                        anchor.href = url
                        anchor.download = filename
                        document.body.appendChild(anchor)
                        anchor.click()
                        document.body.removeChild(anchor)
                        window.URL.revokeObjectURL(url)

                        console.log('Excel export completed!')
                      } catch (error) {
                        console.error('Excel export failed:', error)
                        alert('Excel indirme başarısız: ' + (error as any).message)
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel İndir
                  </button>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-gray-600">Rapor oluşturuluyor...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportType === 'company' && (reportData as any).incomes && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 mb-3">Son Gelirler</h3>
                        <div className="space-y-2">
                          {(reportData as any).incomes.slice(0, 10).map((income: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{income.project?.name || 'Proje'}</p>
                                <p className="text-sm text-gray-600">{income.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  ₺{income.gross_amount?.toLocaleString('tr-TR')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Net: ₺{income.net_amount?.toLocaleString('tr-TR')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportType === 'project' && reportData.projects && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 mb-3">Proje Detayları</h3>
                        <div className="space-y-2">
                          {reportData.projects.slice(0, 10).map((project: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{project.name}</p>
                                <p className="text-sm text-gray-600">{project.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-600">
                                  ₺{(project.budget || 0).toLocaleString('tr-TR')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {project.status === 'active' ? 'Aktif' :
                                    project.status === 'completed' ? 'Tamamlandı' :
                                      project.status === 'cancelled' ? 'İptal' : project.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportType === 'manager' && reportData.academicians && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 mb-3">Akademisyen Detayları</h3>
                        <div className="space-y-2">
                          {reportData.academicians.slice(0, 10).map((academician: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{academician.full_name}</p>
                                <p className="text-sm text-gray-600">{academician.email}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">
                                  ₺{(academician.balances?.[0]?.available_amount || 0).toLocaleString('tr-TR')}
                                </p>
                                <p className="text-sm text-gray-600">Mevcut Bakiye</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportType === 'payments' && (reportData as any).paymentInstructions && (
                      <div>
                        <h3 className="text-md font-medium text-gray-900 mb-3">Ödeme Talimatları</h3>
                        <div className="space-y-2">
                          {(reportData as any).paymentInstructions.slice(0, 10).map((payment: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium text-gray-900">{payment.user?.full_name}</p>
                                <p className="text-sm text-gray-600">{payment.instruction_number}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-blue-600">
                                  ₺{payment.total_amount?.toLocaleString('tr-TR')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {payment.status === 'pending' ? 'Bekliyor' :
                                    payment.status === 'completed' ? 'Tamamlandı' :
                                      payment.status === 'cancelled' ? 'İptal' : payment.status}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
                        <p className="text-sm text-blue-800">
                          Rapor {new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.
                          Detaylı analiz için Excel formatında indirebilirsiniz.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!reportData && !loading && (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rapor Seçin</h3>
            <p className="text-gray-600">Yukarıdaki kontrolleri kullanarak rapor oluşturun</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}