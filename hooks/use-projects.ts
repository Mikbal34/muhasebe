import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'

// Types
interface User {
  id: string
  full_name: string
  email: string
  role?: string
}

interface Project {
  id: string
  code: string
  name: string
  budget: number
  total_received: number
  remaining_budget: number
  company_rate: number
  vat_rate: number
  start_date: string
  end_date?: string
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  has_supplementary_contract: boolean
  supplementary_contract_count: number
  created_by_user: {
    full_name: string
  }
  representatives: Array<{
    id: string
    role: 'project_leader' | 'researcher'
    share_percentage: number
    is_lead: boolean
    user_id?: string | null
    personnel_id?: string | null
    user: {
      id: string
      full_name: string
      email: string
    } | null
    personnel: {
      id: string
      full_name: string
      email: string
    } | null
  }>
}

interface ProjectsResponse {
  projects: Project[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface ProjectFilters {
  status?: string
  representative_id?: string
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

// Projects Hook with filters
export function useProjects(filters: ProjectFilters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.status) queryParams.append('status', filters.status)
  if (filters.representative_id) queryParams.append('representative_id', filters.representative_id)

  const queryString = queryParams.toString()
  const url = queryString ? `/api/projects?${queryString}` : '/api/projects'

  return useQuery({
    queryKey: ['projects', filters.status || '', filters.representative_id || ''],
    queryFn: async (): Promise<Project[]> => {
      const data = await fetchWithAuth(url)
      if (!data.success) throw new Error('Failed to fetch projects')
      return data.data?.projects || []
    },
    staleTime: 0,           // Her zaman stale olarak işaretle
    gcTime: 5 * 60 * 1000,  // 5 dakika cache'te tut
    refetchOnMount: true,   // Mount'ta her zaman refetch
    refetchOnWindowFocus: true, // Focus'ta refetch
    enabled: !!getToken()
  })
}

// Users/Academicians Hook
export function useAcademicians() {
  return useQuery({
    queryKey: ['users', 'academicians'],
    queryFn: async (): Promise<User[]> => {
      const data = await fetchWithAuth('/api/users')
      if (!data.success) throw new Error('Failed to fetch users')
      return data.data?.users || []
    },
    staleTime: 10 * 60 * 1000, // 10 dakika - kullanıcılar nadiren değişir
    gcTime: 60 * 60 * 1000,    // 1 saat cache'te tut
    enabled: !!getToken()
  })
}

// Invalidate projects cache (after create/update/delete)
export function useInvalidateProjects() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }
}

// Create Project Mutation
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const token = getToken()
      if (!token) throw new Error('No token')

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to create project')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}

// Update Project Mutation
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const token = getToken()
      if (!token) throw new Error('No token')

      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to update project')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    }
  })
}
