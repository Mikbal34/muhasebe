import { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest } from '@/lib/middleware/auth'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting for login attempts (5 per minute)
  const rateCheck = await checkRateLimit(request, RATE_LIMITS.auth, 'login')
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn)
  }

  try {
    // Validate request data
    const validation = await validateRequest(request, loginSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { email, password } = validation.data
    const supabase = await createClient()

    // Attempt to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return apiResponse.error('Login failed', authError.message, 401)
    }

    if (!authData.user) {
      return apiResponse.error('Login failed', 'Authentication failed', 401)
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError)
      return apiResponse.error('Profile not found', 'User profile could not be loaded', 404)
    }

    // Check if user is active
    if (!(profile as any).is_active) {
      // Sign out the user
      await supabase.auth.signOut()
      return apiResponse.error('Account disabled', 'Your account has been disabled', 403)
    }

    return apiResponse.success(
      {
        user: {
          id: (profile as any).id,
          email: (profile as any).email,
          full_name: (profile as any).full_name,
          role: (profile as any).role,
          phone: (profile as any).phone,
          iban: (profile as any).iban,
          is_active: (profile as any).is_active,
        },
        session: authData.session,
      },
      'Login successful'
    )
  } catch (error: any) {
    console.error('Login error:', error)
    return apiResponse.error('Internal server error', error.message, 500)
  }
}