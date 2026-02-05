import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/middleware/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return apiResponse.error('Unauthorized', 'No token provided', 401)
    }

    const token = authHeader.substring(7)
    const supabase = await createAdminClient()

    // Token'dan user'ı al
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return apiResponse.error('Unauthorized', 'Invalid token', 401)
    }

    // Profile'ı getir
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return apiResponse.error('Profile not found', 'User profile could not be loaded', 404)
    }

    if (!profile.is_active) {
      return apiResponse.error('Account disabled', 'Your account has been disabled', 403)
    }

    return apiResponse.success({
      user: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        phone: profile.phone,
        iban: profile.iban,
        is_active: profile.is_active,
      }
    })
  } catch (error: any) {
    console.error('Profile API error:', error)
    return apiResponse.error('Internal server error', error.message, 500)
  }
}
