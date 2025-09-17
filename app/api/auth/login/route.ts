import { NextRequest } from 'next/server'
import { loginSchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest } from '@/lib/middleware/auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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
    console.log('Looking for user profile with ID:', authData.user.id)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('Profile query result:', { profile, profileError })

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
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          phone: profile.phone,
          iban: profile.iban,
          is_active: profile.is_active,
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