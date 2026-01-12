import { useQuery, useQueryClient } from '@tanstack/react-query'

interface UserData {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager'
  phone: string | null
  iban: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  balance?: {
    id: string
    available_amount: number
    debt_amount: number
    reserved_amount: number
  }
  project_count?: number
  payment_count?: number
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

// Users Hook (with balances merged)
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserData[]> => {
      // Fetch users and balances in parallel
      const [usersData, balancesData] = await Promise.all([
        fetchWithAuth('/api/users'),
        fetchWithAuth('/api/balances')
      ])

      if (!usersData.success) throw new Error('Failed to fetch users')

      // Build balances map
      const balancesMap = new Map()
      if (balancesData.success) {
        balancesData.data.balances.forEach((balance: any) => {
          if (balance.user) {
            balancesMap.set(balance.user.id, {
              id: balance.id,
              available_amount: balance.available_amount,
              debt_amount: balance.debt_amount,
              reserved_amount: balance.reserved_amount,
              iban: balance.user.iban
            })
          }
        })
      }

      // Merge users with balances
      return usersData.data.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: null,
        iban: balancesMap.get(user.id)?.iban || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        balance: balancesMap.get(user.id) || null
      }))
    },
    staleTime: 5 * 60 * 1000, // 5 dakika
    gcTime: 30 * 60 * 1000,
    enabled: !!getToken()
  })
}

// Invalidate users cache
export function useInvalidateUsers() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }
}
