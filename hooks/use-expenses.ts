import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

type ExpenseType = 'genel' | 'proje'
type ExpenseSource = 'manual' | 'referee_payment' | 'stamp_duty'

interface Expense {
  id: string
  expense_type: ExpenseType
  expense_source?: ExpenseSource
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

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

// Expenses Hook
export function useExpenses(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['expenses', dateRange?.startDate || 'all', dateRange?.endDate || 'all'],
    queryFn: async (): Promise<Expense[]> => {
      const params = new URLSearchParams()
      if (dateRange?.startDate) params.set('start_date', dateRange.startDate)
      if (dateRange?.endDate) params.set('end_date', dateRange.endDate)
      const queryString = params.toString()
      const url = `/api/expenses${queryString ? `?${queryString}` : ''}`

      const data = await fetchWithAuth(url)
      if (!data.success) throw new Error('Failed to fetch expenses')
      return data.data?.expenses || []
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Invalidate expenses cache
export function useInvalidateExpenses() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }
}
