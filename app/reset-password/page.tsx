'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calculator, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// Prevent double execution
let codeExchanged = false

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [debugInfo, setDebugInfo] = useState('')
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        // Get current URL info for debugging
        const fullUrl = window.location.href
        const hash = window.location.hash
        const search = window.location.search

        setDebugInfo(`URL: ${fullUrl.substring(0, 100)}...`)

        // First, check if there's a code in the URL (PKCE flow)
        const urlParams = new URLSearchParams(search)
        const code = urlParams.get('code')

        if (code && !codeExchanged) {
          codeExchanged = true // Prevent double execution
          console.log('Found code, exchanging for session...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (data?.session) {
            console.log('Session established from code')
            setIsReady(true)
            setChecking(false)
            // Remove code from URL to prevent re-use on refresh
            window.history.replaceState({}, '', '/reset-password')
            return
          }
          if (error) {
            console.error('Code exchange error:', error)
          }
        } else if (code && codeExchanged) {
          // Code already used, check for existing session
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setIsReady(true)
            setChecking(false)
            return
          }
        }

        // Check hash for tokens (implicit flow)
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          const type = hashParams.get('type')

          if (accessToken && refreshToken) {
            console.log('Found tokens in hash, setting session...')
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (data?.session) {
              console.log('Session established from hash tokens')
              setIsReady(true)
              setChecking(false)
              return
            }
            if (error) {
              console.error('Set session error:', error)
            }
          }
        }

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('Found existing session')
          setIsReady(true)
          setChecking(false)
          return
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event)
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            if (session) {
              setIsReady(true)
              setChecking(false)
            }
          }
        })

        // Wait a bit for any auth events
        setTimeout(() => {
          setChecking(false)
        }, 2000)

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error('Init error:', err)
        setChecking(false)
      }
    }

    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message || 'Şifre güncellenirken hata oluştu')
        return
      }

      setSuccess(true)
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-teal-600" />
          </div>
          <div className="mt-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Doğrulanıyor...</p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid/expired link
  if (!isReady && !checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-teal-600" />
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-slate-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Geçersiz veya Süresi Dolmuş Bağlantı
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
              </p>
              {debugInfo && (
                <p className="text-xs text-slate-400 mb-4 break-all">
                  Debug: {debugInfo}
                </p>
              )}
              <Link
                href="/forgot-password"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
              >
                Yeni Bağlantı İste
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Calculator className="h-12 w-12 text-teal-600" />
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-slate-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Şifre Başarıyla Güncellendi
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Giriş sayfasına yönlendiriliyorsunuz...
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-teal-600 hover:text-teal-500"
              >
                Hemen giriş yap
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Password reset form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Calculator className="h-12 w-12 text-teal-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-slate-900">
          Yeni Şifre Belirle
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Yeni Şifre
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900"
                  placeholder="En az 6 karakter"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Şifre Tekrar
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md placeholder-slate-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm text-slate-900"
                  placeholder="Şifreyi tekrar girin"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
