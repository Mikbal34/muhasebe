import { useQuery, useQueryClient } from '@tanstack/react-query'

interface Person {
  id: string
  full_name: string
  email: string
  iban: string | null
}

interface Project {
  id: string
  code: string
  name: string
}

interface Balance {
  id: string
  user_id: string | null
  personnel_id: string | null
  project_id: string | null
  available_amount: number
  debt_amount: number
  reserved_amount: number
  last_updated: string
  user: Person | null
  personnel: Person | null
  project: Project | null
}

interface Transaction {
  id: string
  type: 'income' | 'payment' | 'debt' | 'adjustment'
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  created_at: string
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

// Balances Hook
export function useBalances() {
  return useQuery({
    queryKey: ['balances'],
    queryFn: async (): Promise<Balance[]> => {
      const data = await fetchWithAuth('/api/balances')
      if (!data.success) throw new Error('Failed to fetch balances')
      return data.data?.balances || []
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Transactions Hook (for a specific balance)
export function useBalanceTransactions(balanceId: string | null) {
  return useQuery({
    queryKey: ['balances', balanceId, 'transactions'],
    queryFn: async (): Promise<Transaction[]> => {
      if (!balanceId) return []
      const data = await fetchWithAuth(`/api/balances/${balanceId}/transactions`)
      if (!data.success) throw new Error('Failed to fetch transactions')
      return data.data?.transactions || []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken() && !!balanceId
  })
}

// Invalidate balances cache
export function useInvalidateBalances() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['balances'] })
  }
}
