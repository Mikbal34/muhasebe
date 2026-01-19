'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Geçerli bir e-posta adresi girin')
      setLoading(false)
      return
    }

    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      })

      if (resetError) {
        console.error('Reset password error:', resetError)
        setSuccess(true)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      console.error('Forgot password error:', err)
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]">
        <BackgroundStars />

        <div className="w-full max-w-[440px] flex flex-col items-center">
          {/* Logo */}
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

          {/* Success Card */}
          <div className="w-full bg-white border border-gold/20 rounded-lg shadow-[0_20px_50px_rgba(0,32,92,0.1)] p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-navy via-gold to-navy" />

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-navy mb-2">
                E-posta Gönderildi
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Şifre sıfırlama bağlantısı <strong className="text-navy">{email}</strong> adresine gönderildi.
                Lütfen e-postanızı kontrol edin.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                E-posta gelmezse spam klasörünü kontrol edin.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium text-gold hover:text-navy transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Giriş sayfasına dön
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
            Şifremi Unuttum
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            E-posta adresinizi girin, şifre sıfırlama bağlantısı göndereceğiz.
          </p>
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
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-navy/70 uppercase tracking-wider">
                E-posta Adresi
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
                  <Mail className="h-5 w-5" />
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
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
              </span>
              <div className="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-[95%] transition-transform opacity-10" />
            </button>
          </form>
        </div>

        {/* Back to Login */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-gray-500 hover:text-navy transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Giriş sayfasına dön
          </Link>
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
