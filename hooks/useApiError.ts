import { useState, useCallback } from 'react'
import { ErrorMessages } from '@/utils/validation'

export interface ApiError {
  message: string
  status?: number
  code?: string
}

export interface UseApiErrorReturn {
  error: ApiError | null
  loading: boolean
  setError: (error: ApiError | string | null) => void
  setLoading: (loading: boolean) => void
  clearError: () => void
  handleApiCall: <T>(apiCall: () => Promise<T>) => Promise<T | null>
  handleApiResponse: (response: Response) => Promise<any>
}

export function useApiError(): UseApiErrorReturn {
  const [error, setErrorState] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const setError = useCallback((error: ApiError | string | null) => {
    if (!error) {
      setErrorState(null)
      return
    }

    if (typeof error === 'string') {
      setErrorState({ message: error })
    } else {
      setErrorState(error)
    }
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
  }, [])

  const handleApiResponse = useCallback(async (response: Response) => {
    if (!response.ok) {
      const errorMessage = ErrorMessages.getHttpErrorMessage(response.status)

      try {
        const errorData = await response.json()
        throw {
          message: errorData.error || errorData.message || errorMessage,
          status: response.status,
          code: errorData.code
        }
      } catch (parseError) {
        throw {
          message: errorMessage,
          status: response.status
        }
      }
    }

    try {
      return await response.json()
    } catch (parseError) {
      throw {
        message: 'Sunucu yanıtı işlenirken hata oluştu',
        status: response.status
      }
    }
  }, [])

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(true)
      clearError()

      const result = await apiCall()
      return result
    } catch (err: any) {
      console.error('API call failed:', err)

      // Handle network errors
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError({
          message: ErrorMessages.network,
          code: 'NETWORK_ERROR'
        })
        return null
      }

      // Handle API errors
      if (err.message || err.error) {
        setError({
          message: err.message || err.error || ErrorMessages.serverError,
          status: err.status,
          code: err.code
        })
      } else {
        setError({
          message: ErrorMessages.serverError,
          code: 'UNKNOWN_ERROR'
        })
      }

      return null
    } finally {
      setLoading(false)
    }
  }, [clearError])

  return {
    error,
    loading,
    setError,
    setLoading,
    clearError,
    handleApiCall,
    handleApiResponse
  }
}

// Specialized hook for authenticated API calls
export function useAuthenticatedApiCall() {
  const { error, loading, setError, setLoading, clearError, handleApiResponse } = useApiError()

  const call = useCallback(async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T | null> => {
    const token = localStorage.getItem('token')

    if (!token) {
      setError({
        message: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.',
        status: 401,
        code: 'NO_TOKEN'
      })
      return null
    }

    try {
      setLoading(true)
      clearError()

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      })

      const data = await handleApiResponse(response)
      return data
    } catch (err: any) {
      console.error('Authenticated API call failed:', err)

      // Handle authentication errors
      if (err.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setError({
          message: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
          status: 401,
          code: 'TOKEN_EXPIRED'
        })

        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)

        return null
      }

      setError(err)
      return null
    } finally {
      setLoading(false)
    }
  }, [handleApiResponse, setError, setLoading, clearError])

  const get = useCallback(<T>(url: string): Promise<T | null> => {
    return call<T>(url, { method: 'GET' })
  }, [call])

  const post = useCallback(<T>(url: string, data: any): Promise<T | null> => {
    return call<T>(url, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }, [call])

  const put = useCallback(<T>(url: string, data: any): Promise<T | null> => {
    return call<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }, [call])

  const patch = useCallback(<T>(url: string, data: any): Promise<T | null> => {
    return call<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }, [call])

  const del = useCallback(<T>(url: string): Promise<T | null> => {
    return call<T>(url, { method: 'DELETE' })
  }, [call])

  return {
    error,
    loading,
    setError,
    clearError,
    call,
    get,
    post,
    put,
    patch,
    delete: del
  }
}

// Hook for handling loading states with multiple API calls
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }))
  }, [])

  const isLoading = useCallback((key: string): boolean => {
    return loadingStates[key] || false
  }, [loadingStates])

  const isAnyLoading = useCallback((): boolean => {
    return Object.values(loadingStates).some(Boolean)
  }, [loadingStates])

  const clearLoading = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({
        ...prev,
        [key]: false
      }))
    } else {
      setLoadingStates({})
    }
  }, [])

  return {
    loadingStates,
    setLoading,
    isLoading,
    isAnyLoading,
    clearLoading
  }
}