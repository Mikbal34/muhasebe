'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, User, Lock, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { LoadingSplash } from '@/components/ui/loading-splash'

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

// Arka Plan Yıldız Dekorasyonu - Gri Tonları
function BackgroundStars() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Sol alt büyük yıldız */}
      <div className="absolute -bottom-32 -left-32 text-gray-400/[0.08]">
        <StarLogo className="w-[500px] h-[500px]" />
      </div>
      {/* Sağ üst yıldız */}
      <div className="absolute -top-20 -right-20 text-gray-400/[0.06]">
        <StarLogo className="w-80 h-80" />
      </div>
      {/* Orta sağ küçük yıldız */}
      <div className="absolute top-1/3 right-8 text-gray-300/[0.07]">
        <StarLogo className="w-32 h-32" />
      </div>
      {/* Sol üst küçük yıldız */}
      <div className="absolute top-20 left-12 text-gray-400/[0.05]">
        <StarLogo className="w-20 h-20" />
      </div>
      {/* Orta sol yıldız */}
      <div className="absolute top-1/2 -left-16 text-gray-300/[0.06]">
        <StarLogo className="w-48 h-48" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSplash, setShowSplash] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.data.session.access_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
        setShowSplash(true) // Show splash animation before navigating
      } else {
        setError(data.message || 'Giriş başarısız')
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <LoadingSplash
        show={showSplash}
        message="Giriş yapılıyor..."
        onComplete={() => router.push('/dashboard')}
        duration={2000}
      />
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
        <BackgroundStars />

      {/* Main Container */}
      <div className="w-full max-w-[440px] flex flex-col items-center">

        {/* Logo & Header */}
        <div className="mb-10 text-center flex flex-col items-center">
          {/* Tam Logo */}
          <div className="mb-6">
            <Image
              src="/logo/logo-full.png"
              alt="YTÜ Yıldız Teknoloji Transfer Ofisi"
              width={280}
              height={84}
              priority
              className="drop-shadow-sm"
            />
          </div>

          {/* Alt Başlık */}
          <h1 className="font-heading text-navy text-xl md:text-2xl tracking-tight">
            TTO Proje Takip Sistemi
          </h1>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white border border-gold/20 rounded-lg shadow-[0_20px_50px_rgba(0,32,92,0.1)] p-8 md:p-10 relative overflow-hidden">

          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-gold to-navy" />

          <div className="flex flex-col gap-6">
            {/* Subtitle */}
            <div className="text-center mb-2">
              <p className="text-gray-500 text-sm">
                Kurumsal bilgilerinizle oturum açın
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                  Kullanıcı Adı veya E-posta
                </label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full h-14 bg-gray-50 border border-gray-200 rounded px-4 pl-12 focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    placeholder="kullanici@yildiz.edu.tr"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gold transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                  Şifre
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full h-14 bg-gray-50 border border-gray-200 rounded px-4 pl-12 pr-12 focus:ring-1 focus:ring-gold focus:border-gold outline-none transition-all text-gray-900 placeholder:text-gray-400"
                    placeholder="••••••••"
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

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-navy focus:ring-navy w-4 h-4"
                  />
                  <span className="text-xs text-gray-500 group-hover:text-navy transition-colors">
                    Beni Hatırla
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-gold hover:text-navy transition-colors underline-offset-4 hover:underline"
                >
                  Şifremi Unuttum
                </Link>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-14 bg-navy hover:bg-navy-600 text-white font-semibold rounded shadow-lg shadow-navy/20 transition-all overflow-hidden border border-transparent hover:border-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  {!loading && (
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  )}
                </span>
                <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-[95%] transition-transform opacity-10" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-[11px] text-gray-400 uppercase tracking-[0.2em] leading-relaxed">
            © 2024 Yıldız Teknik Üniversitesi<br />
            Teknoloji Transfer Ofisi A.Ş.
          </p>
        </div>
      </div>
      </div>
    </>
  )
}
