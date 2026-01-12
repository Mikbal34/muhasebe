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

// Expenses Hook
export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async (): Promise<Expense[]> => {
      const data = await fetchWithAuth('/api/expenses')
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
