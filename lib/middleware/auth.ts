import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/database'

export interface AuthContext {
  user: {
    id: string
    email: string
    full_name: string
    role: UserRole
    is_active: boolean
  }
  supabase: Awaited<ReturnType<typeof createClient>>
}

export type AuthenticatedHandler = (req: NextRequest, ctx: AuthContext) => Promise<NextResponse> | NextResponse

/**
 * Authentication middleware for API routes
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse> | NextResponse
) {
  try {
    const supabase = await createClient()

    // Check for Authorization header first (for API calls)
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)

      // Use admin client to verify the token
      const adminSupabase = await createAdminClient()
      const { data: { user: authUser }, error } = await adminSupabase.auth.getUser(token)

      if (error || !authUser) {
        console.error('Token verification error:', error)
        return NextResponse.json(
          { error: 'Invalid token', message: 'The provided authentication token is invalid' },
          { status: 401 }
        )
      }

      // Get user profile using admin client
      const { data: user, error: profileError } = await adminSupabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', authUser.id)
        .single()

      if (profileError || !user) {
        console.error('Profile fetch error:', profileError)
        return NextResponse.json(
          { error: 'User profile not found', message: 'User profile could not be loaded' },
          { status: 404 }
        )
      }

      // Check if user is active
      if (!(user as any).is_active) {
        return NextResponse.json(
          { error: 'Account disabled', message: 'Your account has been disabled' },
          { status: 403 }
        )
      }

      // Create auth context with admin client for proper permissions
      const authContext: AuthContext = { user, supabase: adminSupabase }
      return await handler(request, authContext)
    }

    // Fallback to cookie-based authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required', message: 'You must be logged in to access this resource' },
        { status: 401 }
      )
    }

    // Get full user profile
    const { data: user, error: profileError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('id', authUser.id)
      .single()

    if (profileError || !user) {
      return NextResponse.json(
        { error: 'User profile not found', message: 'User profile could not be loaded' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!(user as any).is_active) {
      return NextResponse.json(
        { error: 'Account disabled', message: 'Your account has been disabled' },
        { status: 403 }
      )
    }

    // Create auth context
    const authContext: AuthContext = {
      user,
      supabase,
    }

    // Call the handler with auth context
    return await handler(request, authContext)

  } catch (error) {
    console.error('Authentication middleware error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * Role-based authorization middleware
 */
export async function withRole(
  requiredRoles: UserRole | UserRole[],
  request: NextRequest,
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse> | NextResponse
) {
  return withAuth(request, async (req, ctx) => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

    if (!roles.includes(ctx.user.role)) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: `This action requires one of the following roles: ${roles.join(', ')}. Your role: ${ctx.user.role}`
        },
        { status: 403 }
      )
    }

    return handler(req, ctx)
  })
}

/**
 * Admin-only middleware
 */
export async function withAdmin(request: NextRequest, handler: AuthenticatedHandler) {
  return withRole(['admin'], request, handler)
}

export async function withManager(request: NextRequest, handler: AuthenticatedHandler) {
  return withRole(['admin', 'manager'], request, handler)
}

/**
 * Balance access middleware - checks if user can access specific user's balance
 */
export async function withBalanceAccess(
  targetUserId: string,
  request: NextRequest,
  handler: (req: NextRequest, ctx: AuthContext) => Promise<NextResponse> | NextResponse
) {
  return withAuth(request, async (req, ctx) => {
    // Users can see their own balance, finance officers/admins can see all
    if (targetUserId !== ctx.user.id &&
      ctx.user.role !== 'admin' &&
      ctx.user.role !== 'manager') {
      return apiResponse.forbidden('Access denied')
    }

    return handler(req, ctx)
  })
}

/**
 * API response helpers
 */
export const apiResponse = {
  success: (data?: any, message?: string) => {
    return NextResponse.json({
      success: true,
      data,
      ...(message && { message }),
    })
  },

  error: (error: string, message?: string, status: number = 400) => {
    return NextResponse.json(
      {
        success: false,
        error,
        ...(message && { message }),
      },
      { status }
    )
  },

  unauthorized: (message: string = 'Authentication required') => {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message },
      { status: 401 }
    )
  },

  forbidden: (message: string = 'Access denied') => {
    return NextResponse.json(
      { success: false, error: 'Forbidden', message },
      { status: 403 }
    )
  },

  notFound: (message: string = 'Resource not found') => {
    return NextResponse.json(
      { success: false, error: 'Not found', message },
      { status: 404 }
    )
  },

  validationError: (errors: string[]) => {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        message: 'The provided data is invalid',
        details: errors,
      },
      { status: 400 }
    )
  },
}

/**
 * Request validation helper
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data }
  } catch (error: any) {
    return {
      error: apiResponse.validationError(
        error.errors?.map((e: any) => e.message) || ['Invalid request data']
      ),
    }
  }
}

/**
 * Query parameter validation helper
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: { parse: (data: unknown) => T }
): { data: T } | { error: NextResponse } {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Convert string values to appropriate types
    const processedParams = Object.entries(params).reduce((acc, [key, value]) => {
      // Try to parse numbers
      if (!isNaN(Number(value)) && value !== '') {
        acc[key] = Number(value)
      }
      // Parse booleans
      else if (value === 'true' || value === 'false') {
        acc[key] = value === 'true'
      }
      // Keep as string
      else {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, any>)

    const data = schema.parse(processedParams)
    return { data }
  } catch (error: any) {
    return {
      error: apiResponse.validationError(
        error.errors?.map((e: any) => e.message) || ['Invalid query parameters']
      ),
    }
  }
}