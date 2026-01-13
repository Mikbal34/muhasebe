import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/middleware/auth'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting (3 per minute)
  const rateCheck = await checkRateLimit(request, { ...RATE_LIMITS.auth, maxRequests: 3 }, 'forgot-password')
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn)
  }

  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return apiResponse.error('E-posta adresi gerekli', undefined, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return apiResponse.error('Geçerli bir e-posta adresi girin', undefined, 400)
    }

    const supabase = await createClient()

    // Get the site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    })

    if (error) {
      console.error('Password reset error:', error)
      // Don't expose whether email exists or not for security
      return apiResponse.success(
        null,
        'Eğer bu e-posta adresi sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.'
      )
    }

    return apiResponse.success(
      null,
      'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
    )
  } catch (error: any) {
    console.error('Forgot password error:', error)
    return apiResponse.error('Bir hata oluştu', error.message, 500)
  }
}
