import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Get query parameters
      const url = new URL(request.url)
      const role = url.searchParams.get('role')

      // Build query
      let query = ctx.supabase
        .from('users')
        .select('id, full_name, email, role, iban')
        .order('full_name')

      // Apply role filter if specified
      if (role) {
        query = query.eq('role', role)
      }

      const { data: users, error } = await query

      if (error) {
        console.error('Users fetch error:', error)
        return apiResponse.error('Failed to fetch users', error.message, 500)
      }

      return apiResponse.success({
        users: users || []
      })

    } catch (error: any) {
      console.error('Users API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can create users
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create users')
    }

    try {
      const body = await req.json()
      const { full_name, email, role } = body

      // Validate required fields
      if (!full_name || !email || !role) {
        return apiResponse.error('Full name, email and role are required', undefined, 400)
      }

      // Create admin client for auth operations (requires service role key)
      const adminSupabase = await createAdminClient()

      // Check if user already exists in auth.users (handles orphan users from failed attempts)
      const { data: existingAuthUsers } = await adminSupabase.auth.admin.listUsers()
      const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email)

      if (existingAuthUser) {
        // Check if profile exists
        const { data: existingProfile } = await adminSupabase
          .from('users')
          .select('id')
          .eq('id', existingAuthUser.id)
          .single()

        if (existingProfile) {
          return apiResponse.error('User with this email already exists', undefined, 400)
        }

        // Auth user exists but no profile - orphan from failed attempt, delete it
        console.log('Cleaning up orphan auth user:', existingAuthUser.id)
        await adminSupabase.auth.admin.deleteUser(existingAuthUser.id)
      }

      // Generate random password
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '123!'

      // Create user in Supabase Auth with generated password
      console.log('Creating auth user with email:', email)
      const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name
        }
      })

      if (authError) {
        console.error('Auth user creation error:', authError)
        console.error('Auth error details:', JSON.stringify(authError, null, 2))
        return apiResponse.error('Failed to create user', authError.message || 'Unknown auth error', 500)
      }

      if (!authUser?.user) {
        console.error('No user returned from createUser')
        return apiResponse.error('Failed to create user', 'No user data returned', 500)
      }

      console.log('Auth user created successfully:', authUser.user.id)

      // Create user profile (use adminSupabase to bypass RLS)
      const { data: userProfile, error: profileError } = await adminSupabase
        .from('users')
        .insert({
          id: authUser.user.id,
          full_name,
          email,
          role
        })
        .select()
        .single()

      if (profileError) {
        console.error('User profile creation error:', profileError)
        // Clean up auth user if profile creation fails
        await adminSupabase.auth.admin.deleteUser(authUser.user.id)
        return apiResponse.error('Failed to create user profile', profileError.message, 500)
      }

      return apiResponse.success(
        {
          user: userProfile,
          // In development, return password for easy access
          tempPassword: randomPassword
        },
        'User created successfully. Password has been generated.'
      )

    } catch (error: any) {
      console.error('Create user API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}