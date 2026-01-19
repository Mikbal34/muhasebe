'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// YTÜ Yıldız Logosu - Orijinal 12 Köşeli Yıldız
function StarLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 54.51 56.43"
      fill="currentColor"
      className={className}
    >
      <path d="M24.27 40.72 27.35 38.41 30.33 40.7 27.27 51 24.26 40.73 24.26 40.73ZM17.21 36.72 21.41 36.65 22.43 40.16 13.62 46.78 17.21 36.72 17.21 36.72ZM32.31 40.18 33.46 36.54 37.07 36.63 40.28 46.2 32.32 40.17 32.32 40.17ZM13.74 29.13 17.22 31.54 15.97 35.16 4.92 35.43 13.73 29.13 13.73 29.13ZM38.07 34.83 36.73 31.11 40.35 28.76 49.46 35.45 38.07 34.83 38.07 34.83ZM5.42 21.34 15.79 21.34C15.79 21.34 17.02 24.96 17.02 24.96L13.87 27.2 5.42 21.34 5.42 21.34ZM37.52 24.81 38.68 21.35 49.37 21.21 40.45 26.95 37.52 24.82 37.52 24.82ZM30.77 16.99 32.11 21.34 32.14 21.43 37.17 21.37 35.79 25.43 39.07 27.84 35.07 30.41 34.99 30.46 36.43 34.74 32.27 34.51 32.17 34.51C32.17 34.51 30.82 39.05 30.82 39.05L27.45 36.5 27.38 36.44 23.81 39.12 22.6 34.99 17.79 35.11 19.28 30.94 15.18 28.1 18.78 25.53 17.38 21.34 22.31 21.34C22.31 21.34 23.62 17.04 23.62 17.04L27.19 19.64 30.77 16.98 30.77 16.98ZM16.87 19.84 13.48 9.67 22.29 16.09 21.13 19.9 16.87 19.85 16.87 19.85ZM32.11 15.98 41.3 9.16 37.7 19.77 33.29 19.81 32.11 15.98 32.11 15.98ZM24.09 15.49 27.18 5.34 30.28 15.41 27.12 17.71 24.09 15.49 24.09 15.49ZM27.19 0 22.77 14.52 10.38 5.45 15.27 19.82 0 19.63 12.43 28.23 0.09 37 15.43 36.75 10.5 51.06 22.91 41.75 27.2 56.43 31.81 41.82 43.96 51.14 38.75 36.68 54.4 37.07 41.76 27.88 54.51 19.62 39.24 19.77 44.05 5.45 31.66 14.44 27.19 0 27.19 0Z" />
    </svg>
  )
}

// Arka Plan Yıldız Dekorasyonu
function BackgroundStars() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute -bottom-32 -left-32 text-gray-400/[0.08]">
        <StarLogo className="w-[500px] h-[500px]" />
      </div>
      <div className="absolute -top-20 -right-20 text-gray-400/[0.06]">
        <StarLogo className="w-80 h-80" />
      </div>
      <div className="absolute top-1/3 right-8 text-gray-300/[0.07]">
        <StarLogo className="w-32 h-32" />
      </div>
      <div className="absolute top-20 left-12 text-gray-400/[0.05]">
        <StarLogo className="w-20 h-20" />
      </div>
    </div>
  )
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
      <BackgroundStars />
      <div className="flex flex-col items-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 text-navy/20">
            <StarLogo className="w-full h-full" />
          </div>
          <div className="absolute inset-0 text-gold animate-pulse">
            <StarLogo className="w-full h-full" />
          </div>
        </div>
        <p className="mt-4 text-gray-500 text-sm">Doğrulanıyor...</p>
      </div>
    </div>
  )
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (tokenHash && type === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          })

          if (data?.session) {
            setIsReady(true)
            setChecking(false)
            window.history.replaceState({}, '', '/reset-password')
            return
          }

          if (error) {
            console.error('Token verification error:', error)
          }
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setIsReady(true)
            setChecking(false)
          }
        })

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsReady(true)
        }

        setTimeout(() => {
          setChecking(false)
        }, 2000)

        return () => subscription.unsubscribe()
      } catch (err) {
        console.error('Verification error:', err)
        setChecking(false)
      }
    }

    verifyToken()
  }, [searchParams])

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
    return <LoadingSpinner />
  }

  // Invalid/expired link
  if (!isReady && !checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
        <BackgroundStars />

        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="mb-6">
            <Image
              src="/logo/logo-full.png"
              alt="YTÜ Yıldız Teknoloji Transfer Ofisi"
              width={240}
              height={72}
              priority
              className="drop-shadow-sm"
            />
          </div>

          <div className="w-full bg-white border border-gold/20 rounded-lg shadow-[0_20px_50px_rgba(0,32,92,0.1)] p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-gold to-navy" />

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-navy mb-2">
                Geçersiz veya Süresi Dolmuş Bağlantı
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş olabilir.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center px-6 py-3 bg-navy hover:bg-navy-600 text-white font-semibold rounded shadow-lg shadow-navy/20 transition-all"
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
        <BackgroundStars />

        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="mb-6">
            <Image
              src="/logo/logo-full.png"
              alt="YTÜ Yıldız Teknoloji Transfer Ofisi"
              width={240}
              height={72}
              priority
              className="drop-shadow-sm"
            />
          </div>

          <div className="w-full bg-white border border-gold/20 rounded-lg shadow-[0_20px_50px_rgba(0,32,92,0.1)] p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-gold to-navy" />

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-navy mb-2">
                Şifre Başarıyla Güncellendi
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Giriş sayfasına yönlendiriliyorsunuz...
              </p>
              <Link
                href="/login"
                className="text-sm font-medium text-gold hover:text-navy transition-colors"
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
      <BackgroundStars />

      <div className="w-full max-w-[440px] flex flex-col items-center">
        {/* Logo & Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="mb-6">
            <Image
              src="/logo/logo-full.png"
              alt="YTÜ Yıldız Teknoloji Transfer Ofisi"
              width={240}
              height={72}
              priority
              className="drop-shadow-sm"
            />
          </div>
          <h1 className="font-heading text-navy text-xl md:text-2xl tracking-tight">
            Yeni Şifre Belirle
          </h1>
        </div>

        {/* Form Card */}
        <div className="w-full bg-white border border-gold/20 rounded-lg shadow-[0_20px_50px_rgba(0,32,92,0.1)] p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-gold to-navy" />

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                Yeni Şifre
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-14 bg-gray-50 border border-gray-200 rounded px-4 pl-12 pr-12 focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  placeholder="En az 6 karakter"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gold transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                Şifre Tekrar
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-14 bg-gray-50 border border-gray-200 rounded px-4 pl-12 focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all text-gray-900 placeholder:text-gray-400"
                  placeholder="Şifreyi tekrar girin"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gold transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-14 bg-navy hover:bg-navy-600 text-white font-semibold rounded shadow-lg shadow-navy/20 transition-all overflow-hidden border border-transparent hover:border-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </span>
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-[95%] transition-transform opacity-10" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] leading-relaxed">
            © 2026 Yıldız Teknik Üniversitesi<br />
            Teknoloji Transfer Ofisi A.Ş.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
