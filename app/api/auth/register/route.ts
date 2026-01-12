import { NextRequest } from 'next/server'
import { registerSchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest } from '@/lib/middleware/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit'

export async function POST(request: NextRequest) {
  // Apply rate limiting for registration attempts (5 per minute)
  const rateCheck = await checkRateLimit(request, RATE_LIMITS.auth, 'register')
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetIn)
  }

  try {
    // Validate request data
    const validation = await validateRequest(request, registerSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { email, password, full_name, role = 'manager', phone, iban } = validation.data

    // Use admin client to create user
    const supabase = await createAdminClient()

    // First check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return apiResponse.error('Registration failed', 'User with this email already exists', 400)
    }

    // Create auth user without user_metadata to avoid trigger issues
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      return apiResponse.error('Registration failed', authError.message, 400)
    }

    if (!authData.user) {
      return apiResponse.error('Registration failed', 'User creation failed', 400)
    }

    // Always create user record manually since trigger might fail
    // Wait a bit to ensure auth user is fully committed
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const { error: profileError } = await (supabase as any)
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          role,
          phone: phone || null,
          iban: iban || null,
          is_active: true,
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        console.error('Profile error details:', JSON.stringify(profileError, null, 2))

        // Try to delete the auth user if profile creation failed
        await supabase.auth.admin.deleteUser(authData.user.id)
        return apiResponse.error('Registration failed', `Failed to create user profile: ${profileError.message}`, 400)
      }
    } catch (profileErr: any) {
      console.error('Profile creation exception:', profileErr)
      // Try to delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authData.user.id)
      return apiResponse.error('Registration failed', `Failed to create user profile: ${profileErr.message}`, 400)
    }

    return apiResponse.success(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name,
          role,
        },
      },
      'User registered successfully'
    )
  } catch (error: any) {
    console.error('Registration error:', error)
    return apiResponse.error('Internal server error', error.message, 500)
  }
}