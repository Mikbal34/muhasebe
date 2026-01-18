'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  Building2,
  Wallet,
  FileText,
  PiggyBank,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Receipt,
  Coins,
  Landmark,
  AlertCircle,
  FolderOpen,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { StatCardSkeleton, ProgressBarSkeleton, MonthlyTableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { MiniChart } from '@/components/ui/mini-chart'
import { CashFlowDiagram } from '@/components/charts/cash-flow-diagram'
import { CashFlowData, CashFlowPeriod, PERIOD_OPTIONS } from '@/components/charts/cash-flow-types'
import { useDashboard, useCashFlow, DateRange } from '@/hooks/use-dashboard'
import { DateRangePicker } from '@/components/ui/date-range-picker'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>('2025')
  const [cashFlowPeriod, setCashFlowPeriod] = useState<CashFlowPeriod>('month')
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: null, endDate: null })
  const router = useRouter()

  const { stats, metrics: dashboardMetrics, ttoFinancials, isLoading } = useDashboard(user?.role, dateRange)
  const { data: cashFlowData, isLoading: cashFlowLoading } = useCashFlow(cashFlowPeriod)

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
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const handleCashFlowPeriodChange = (newPeriod: CashFlowPeriod) => {
    setCashFlowPeriod(newPeriod)
  }

  const loading = isLoading || !user

  if (loading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-4">
          {/* Welcome Section Skeleton */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-3 border relative overflow-hidden">
                <Skeleton className="h-1 w-full absolute top-0 left-0" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>

          {/* Progress Bar Skeleton */}
          <div className="bg-white rounded-lg shadow-sm p-4 border">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-4">
        {/* Compact Welcome Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-navy flex items-center justify-center border-2 border-gold shadow-sm">
              <span className="text-lg font-bold text-white">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">
                Hoş geldiniz, {user.full_name.split(' ')[0]}
              </h1>
              <p className="text-sm text-slate-500">
                {user.role === 'admin' ? 'Sistem Yöneticisi Paneli' : 'Mali İşler Paneli'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              align="right"
            />
          </div>
        </div>

        {/* TTO Dashboard */}
        {['admin', 'manager'].includes(user.role) && dashboardMetrics && (
          <>
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-navy">Finansal Gösterge Tablosu</h2>
            </div>

            {/* 6 Metric Cards - Compact Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Toplam Bütçe */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Toplam Bütçe</p>
                <p className="text-lg font-extrabold text-navy">
                  ₺{dashboardMetrics.total_budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Kesilen Fatura */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kesilen Fatura</p>
                <p className="text-lg font-extrabold text-navy">
                  ₺{dashboardMetrics.total_invoiced.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Tahsil Edilen */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tahsil Edilen</p>
                <p className="text-lg font-extrabold text-navy">
                  ₺{dashboardMetrics.total_collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Açık Bakiye */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Açık Bakiye</p>
                <p className="text-lg font-extrabold text-gold">
                  ₺{dashboardMetrics.total_outstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Kesilecek Fatura */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Kesilecek Fatura</p>
                <p className="text-lg font-extrabold text-slate-500">
                  ₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* TTO Payı */}
              <div className="relative bg-white p-4 rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="metric-card-accent"></div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">TTO Payı</p>
                <p className="text-lg font-extrabold text-gold">
                  ₺{dashboardMetrics.total_commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Budget Progress Bar - Compact */}
            <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-navy">Bütçe Durumu</p>
                  <p className="text-xs text-slate-400">Toplam: ₺{dashboardMetrics.total_budget.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-navy"></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Tahsil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gold"></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Bekleyen</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Kalan</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-8 rounded-lg overflow-hidden flex p-1">
                <div
                  className="h-full bg-navy rounded-md progress-segment relative group"
                  style={{
                    width: `${dashboardMetrics.total_budget > 0 ? (dashboardMetrics.total_collected / dashboardMetrics.total_budget) * 100 : 0}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {Math.round((dashboardMetrics.total_collected / dashboardMetrics.total_budget) * 100)}%
                  </div>
                </div>
                <div
                  className="h-full bg-gold rounded-md mx-0.5 progress-segment relative group"
                  style={{
                    width: `${dashboardMetrics.total_budget > 0 ? (dashboardMetrics.total_outstanding / dashboardMetrics.total_budget) * 100 : 0}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {Math.round((dashboardMetrics.total_outstanding / dashboardMetrics.total_budget) * 100)}%
                  </div>
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-navy" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tahsilat</p>
                    <p className="text-sm font-extrabold text-slate-900">₺{dashboardMetrics.total_collected.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Bekleyen</p>
                    <p className="text-sm font-extrabold text-slate-900">₺{dashboardMetrics.total_outstanding.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <PiggyBank className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Kalan</p>
                    <p className="text-sm font-extrabold text-slate-900">₺{dashboardMetrics.remaining_to_invoice.toLocaleString('tr-TR')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Year Breakdown Cards - Corporate Colors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dashboardMetrics.year_breakdown.map((yearData, index) => {
                const colors = [
                  { bg: 'bg-navy/5', border: 'border-navy/20', text: 'text-navy/70', accent: 'text-navy' },
                  { bg: 'bg-gold/10', border: 'border-gold/30', text: 'text-gold', accent: 'text-gold' },
                  { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', accent: 'text-slate-700' }
                ]
                const color = colors[index % 3]

                return (
                  <div key={yearData.year} className={`${color.bg} ${color.border} border p-4 rounded-lg`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-lg font-black ${color.accent}`}>{yearData.year}</span>
                      <TrendingUp className={`w-5 h-5 ${color.text}`} />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className={`text-[10px] font-bold ${color.text} uppercase tracking-widest opacity-70`}>Kesilecek</p>
                        <p className={`text-lg font-extrabold ${color.accent}`}>
                          ₺{yearData.remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold ${color.text} uppercase tracking-widest opacity-70`}>TTO Payı</p>
                        <p className={`text-lg font-extrabold ${color.accent}`}>
                          ₺{yearData.commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Monthly Income-Expense Table - Compact */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy">Aylık Gelir-Gider Tablosu</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">12 aylık finansal özet</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded text-xs font-bold text-navy bg-white focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 sticky left-0 bg-slate-50 z-10">Kategori</th>
                      {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map(month => (
                        <th key={month} className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Gelirler Row */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700 border-r border-slate-100 sticky left-0 bg-white z-10">Gelirler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="px-3 py-2.5 text-xs font-medium text-navy text-center">
                          {monthData.income > 0 ? `₺${monthData.income.toLocaleString('tr-TR')}` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Giderler Row */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700 border-r border-slate-100 sticky left-0 bg-white z-10">Giderler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td key={index} className="px-3 py-2.5 text-xs font-medium text-gold text-center">
                          {monthData.expense > 0 ? `-₺${monthData.expense.toLocaleString('tr-TR')}` : '-'}
                        </td>
                      ))}
                    </tr>

                    {/* Net Kar Row */}
                    <tr className="bg-navy/5">
                      <td className="px-4 py-2.5 text-xs font-black text-navy border-r border-slate-100 sticky left-0 bg-navy/5 z-10">Net Kar</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData, index) => (
                        <td
                          key={index}
                          className={`px-3 py-2.5 text-xs font-bold text-center ${
                            monthData.difference > 0 ? 'text-navy' : monthData.difference < 0 ? 'text-gold' : 'text-slate-400'
                          }`}
                        >
                          {monthData.difference !== 0 ? `₺${monthData.difference.toLocaleString('tr-TR')}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="p-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center bg-slate-50/30">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Toplam Gelir</p>
                  <p className="text-sm font-extrabold text-navy">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.income, 0) || 0).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Toplam Gider</p>
                  <p className="text-sm font-extrabold text-gold">
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.expense, 0) || 0).toLocaleString('tr-TR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Net Fark</p>
                  <p className={`text-sm font-extrabold ${
                    (dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.difference, 0) || 0) > 0
                      ? 'text-navy' : 'text-gold'
                  }`}>
                    ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum, m) => sum + m.difference, 0) || 0).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Payment Table - Compact */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy">Aylık Ödeme Talimatları</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tamamlanan ödemelerin aylık dağılımı</p>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 sticky left-0 bg-slate-50 z-10">Kategori</th>
                      {['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'].map(month => (
                        <th key={month} className="px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">{month}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700 border-r border-slate-100 sticky left-0 bg-white z-10">Dağıtılan Ödemeler</td>
                      {dashboardMetrics.monthly_breakdown[selectedYear]?.map((monthData: any, index) => (
                        <td key={index} className="px-3 py-2.5 text-xs font-medium text-gold text-center">
                          {monthData.payment > 0 ? `₺${monthData.payment.toLocaleString('tr-TR')}` : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Summary */}
              <div className="p-4 border-t border-slate-100 text-center bg-slate-50/30">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Toplam Dağıtılan Ödeme</p>
                <p className="text-sm font-extrabold text-gold">
                  ₺{(dashboardMetrics.monthly_breakdown[selectedYear]?.reduce((sum: number, m: any) => sum + (m.payment || 0), 0) || 0).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
