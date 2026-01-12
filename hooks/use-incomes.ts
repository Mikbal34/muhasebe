import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

interface Income {
  id: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  net_amount: number
  collected_amount: number
  description: string | null
  income_date: string
  created_at: string
  is_fsmh_income: boolean
  income_type: 'ozel' | 'kamu'
  is_tto_income: boolean
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

// Incomes Hook
export function useIncomes() {
  return useQuery({
    queryKey: ['incomes'],
    queryFn: async (): Promise<Income[]> => {
      const data = await fetchWithAuth('/api/incomes')
      if (!data.success) throw new Error('Failed to fetch incomes')
      return data.data?.incomes || []
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Invalidate incomes cache
export function useInvalidateIncomes() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['incomes'] })
  }
}
