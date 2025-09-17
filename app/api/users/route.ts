import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

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
    // Only admins can create users
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can create users')
    }

    try {
      const body = await req.json()
      const { full_name, email, role } = body

      // Validate required fields
      if (!full_name || !email || !role) {
        return apiResponse.error('Full name, email and role are required', undefined, 400)
      }

      // Check if user already exists
      const { data: existingUser } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        return apiResponse.error('User with this email already exists', undefined, 400)
      }

      // Generate random password
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '123!'

      // Create user in Supabase Auth with generated password
      const { data: authUser, error: authError } = await ctx.supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true
      })

      if (authError) {
        console.error('Auth user creation error:', authError)
        return apiResponse.error('Failed to create user', authError.message, 500)
      }

      // Create user profile
      const { data: userProfile, error: profileError } = await (ctx.supabase as any)
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
        await ctx.supabase.auth.admin.deleteUser(authUser.user.id)
        return apiResponse.error('Failed to create user profile', profileError.message, 500)
      }

      // Log password for development (in production, send via email service)
      console.log(`\n🔐 NEW USER CREATED 🔐`)
      console.log(`Email: ${email}`)
      console.log(`Password: ${randomPassword}`)
      console.log(`Full Name: ${full_name}`)
      console.log(`Role: ${role}`)
      console.log(`-------------------\n`)

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