'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth pages that don't need session monitoring
const AUTH_PAGES = ['/', '/login', '/register', '/forgot-password', '/reset-password']

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSessionExpired, setShowSessionExpired] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAuthPage = AUTH_PAGES.includes(pathname)

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      setSession(null)
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }, [router])

  const handleSessionExpired = useCallback(() => {
    // Only show modal if not on auth pages
    if (!isAuthPage) {
      setShowSessionExpired(true)
    }
  }, [isAuthPage])

  const handleRedirectToLogin = useCallback(() => {
    setShowSessionExpired(false)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }, [router])

  useEffect(() => {
    // Don't monitor session on auth pages
    if (isAuthPage) {
      setIsLoading(false)
      return
    }

    // Track if user had an active session during this browser session
    let hadActiveSession = false

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state change:', event, newSession ? 'has session' : 'no session')

      switch (event) {
        case 'INITIAL_SESSION':
          // Session loaded from storage
          if (newSession) {
            setSession(newSession)
            setUser(newSession.user)
            hadActiveSession = true
          }
          // Don't show modal on initial load - let API calls handle 401
          setIsLoading(false)
          break

        case 'SIGNED_IN':
          setSession(newSession)
          setUser(newSession?.user || null)
          setShowSessionExpired(false)
          hadActiveSession = true
          break

        case 'SIGNED_OUT':
          setSession(null)
          setUser(null)
          // Only show modal if user had an active session in this browser session
          if (hadActiveSession) {
            handleSessionExpired()
          }
          break

        case 'TOKEN_REFRESHED':
          setSession(newSession)
          setUser(newSession?.user || null)
          hadActiveSession = true
          // localStorage token'ı güncelle - API çağrılarının yeni token'ı kullanması için
          if (newSession?.access_token) {
            localStorage.setItem('token', newSession.access_token)
            console.log('Token refreshed and localStorage updated')
          }
          break

        case 'USER_UPDATED':
          setSession(newSession)
          setUser(newSession?.user || null)
          break
      }
    })

    // Listen for 401 errors from API calls via custom event
    const handleUnauthorized = () => {
      console.log('Unauthorized event received - session expired')
      handleSessionExpired()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [isAuthPage, handleSessionExpired])

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}

      {/* Session Expired Modal */}
      {showSessionExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              {/* Icon */}
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-100 mb-4">
                <svg
                  className="h-7 w-7 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Oturum Süresi Doldu
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Güvenliğiniz için oturumunuz sonlandırıldı. Devam etmek için lütfen tekrar giriş yapın.
              </p>

              {/* Button */}
              <button
                onClick={handleRedirectToLogin}
                className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-navy hover:bg-navy/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy/30 transition-colors"
              >
                Giriş Sayfasına Git
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
