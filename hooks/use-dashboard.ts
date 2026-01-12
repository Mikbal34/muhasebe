import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CashFlowData } from '@/components/charts/cash-flow-types'

// Types
interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalIncome: number
  totalPayments: number
  pendingPayments: number
  totalUsers: number
  totalBalance: number
}

interface TTOFinancials {
  total_commission: number
  total_expenses: number
  net_balance: number
  debt_amount: number
}

interface YearBreakdown {
  year: string
  invoiced: number
  commission: number
  remaining: number
}

interface MonthlyData {
  month: number
  income: number
  expense: number
  difference: number
}

interface DashboardMetrics {
  total_budget: number
  total_invoiced: number
  total_collected: number
  total_outstanding: number
  remaining_to_invoice: number
  total_commission: number
  active_project_count: number
  progress_percentage: number
  collection_percentage: number
  year_breakdown: YearBreakdown[]
  monthly_breakdown: Record<string, MonthlyData[]>
}

// CashFlowData is imported from cash-flow-types

// Fetch helpers - SSR safe
const isBrowser = typeof window !== 'undefined'
const getToken = () => isBrowser ? localStorage.getItem('token') : null

const fetchWithAuth = async (url: string) => {
  const token = getToken()
  if (!token) throw new Error('No token')

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!response.ok) throw new Error('API error')
  return response.json()
}

// Dashboard Stats Hook
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [projectsData, incomesData, paymentsData, balancesData] = await Promise.all([
        fetchWithAuth('/api/projects'),
        fetchWithAuth('/api/incomes'),
        fetchWithAuth('/api/payments'),
        fetchWithAuth('/api/balances')
      ])

      const projects = projectsData.data?.projects || []
      const incomes = incomesData.data?.incomes || []
      const payments = paymentsData.data?.payments || []
      const balances = balancesData.data?.balances || []

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter((p: any) => p.status === 'active').length,
        totalIncome: incomes.reduce((sum: number, i: any) => sum + (i.gross_amount || 0), 0),
        totalPayments: payments.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0),
        pendingPayments: payments.filter((p: any) => p.status === 'pending').length,
        totalUsers: balances.length,
        totalBalance: balances.reduce((sum: number, b: any) => sum + (b.available_amount || 0), 0)
      }
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    enabled: !!getToken()
  })
}

// TTO Financials Hook
export function useTTOFinancials() {
  return useQuery({
    queryKey: ['dashboard', 'tto-financials'],
    queryFn: async (): Promise<TTOFinancials> => {
      const data = await fetchWithAuth('/api/balances/admin-summary')
      if (!data.success) throw new Error('Failed to fetch TTO financials')
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Dashboard Metrics Hook (ağır sorgu - daha uzun cache)
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: async (): Promise<DashboardMetrics> => {
      const data = await fetchWithAuth('/api/dashboard/metrics')
      if (!data.success) throw new Error('Failed to fetch metrics')
      return data.data
    },
    staleTime: 5 * 60 * 1000, // 5 dakika - ağır sorgu için cache
    gcTime: 30 * 60 * 1000,   // 30 dakika cache'te tut
    enabled: !!getToken()
  })
}

// Cash Flow Hook
export function useCashFlow(period: string) {
  return useQuery({
    queryKey: ['dashboard', 'cash-flow', period],
    queryFn: async (): Promise<CashFlowData> => {
      const data = await fetchWithAuth(`/api/dashboard/cash-flow?period=${period}`)
      if (!data.success) throw new Error('Failed to fetch cash flow')
      return data.data.data
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!getToken() && !!period
  })
}

// Combined hook for the dashboard page
export function useDashboard(userRole: string | undefined) {
  const isAdminOrManager = userRole === 'admin' || userRole === 'manager'

  const statsQuery = useDashboardStats()
  const ttoQuery = useTTOFinancials()
  const metricsQuery = useDashboardMetrics()

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    statsError: statsQuery.error,

    ttoFinancials: isAdminOrManager ? ttoQuery.data : null,
    ttoLoading: ttoQuery.isLoading,

    metrics: isAdminOrManager ? metricsQuery.data : null,
    metricsLoading: metricsQuery.isLoading,

    isLoading: statsQuery.isLoading || (isAdminOrManager && metricsQuery.isLoading),

    refetchAll: () => {
      statsQuery.refetch()
      if (isAdminOrManager) {
        ttoQuery.refetch()
        metricsQuery.refetch()
      }
    }
  }
}

// Invalidate dashboard cache (after create/update/delete operations)
export function useInvalidateDashboard() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }
}
