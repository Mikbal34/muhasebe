import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

interface PaymentInstruction {
  id: string
  instruction_number: string
  user_id: string
  total_amount: number
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected'
  notes: string | null
  created_at: string
  approved_at: string | null
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

// Payments Hook
export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async (): Promise<PaymentInstruction[]> => {
      const data = await fetchWithAuth('/api/payments')
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
