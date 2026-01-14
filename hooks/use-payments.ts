import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

interface PaymentInstruction {
  id: string
  instruction_number: string
  user_id: string
  project_id: string | null
  total_amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  notes: string | null
  created_at: string
  approved_at: string | null
  project: {
    id: string
    code: string
    name: string
  } | null
  user: {
    id: string
    full_name: string
    email: string
    iban: string
  } | null
  personnel: {
    id: string
    full_name: string
    email: string
    iban: string
  } | null
  created_by_user: {
    full_name: string
  }
  items: Array<{
    id: string
    amount: number
    description: string | null
    income_distribution: {
      id: string
      amount: number
      income: {
        id: string
        description: string
        project: {
          id: string
          code: string
          name: string
        }
      }
    } | null
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

export interface DateRange {
  startDate: string | null
  endDate: string | null
}

// Payments Hook
export function usePayments(dateRange?: DateRange) {
  return useQuery({
    queryKey: ['payments', dateRange?.startDate || 'all', dateRange?.endDate || 'all'],
    queryFn: async (): Promise<PaymentInstruction[]> => {
      const params = new URLSearchParams()
      if (dateRange?.startDate) params.set('start_date', dateRange.startDate)
      if (dateRange?.endDate) params.set('end_date', dateRange.endDate)
      const queryString = params.toString()
      const url = `/api/payments${queryString ? `?${queryString}` : ''}`

      const data = await fetchWithAuth(url)
      if (!data.success) throw new Error('Failed to fetch payments')
      return data.data?.payments || []
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Invalidate payments cache
export function useInvalidatePayments() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['payments'] })
  }
}
