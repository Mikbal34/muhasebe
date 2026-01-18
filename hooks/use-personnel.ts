import { useQuery, useQueryClient } from '@tanstack/react-query'

interface PersonnelData {
  id: string
  full_name: string
  email: string
  phone: string | null
  iban: string | null
  tc_no: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  balance?: {
    available_amount: number
    debt_amount: number
  }
  project_count?: number
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

  // 401 hatası - session expired
  if (response.status === 401) {
    if (isBrowser) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    throw new Error('Unauthorized')
  }

  if (!response.ok) throw new Error('API error')
  return response.json()
}

// Personnel Hook
export function usePersonnel() {
  return useQuery({
    queryKey: ['personnel'],
    queryFn: async (): Promise<PersonnelData[]> => {
      const data = await fetchWithAuth('/api/personnel?include_inactive=true')
      if (!data.success) throw new Error('Failed to fetch personnel')
      return data.data?.personnel || []
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Invalidate personnel cache
export function useInvalidatePersonnel() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['personnel'] })
  }
}
