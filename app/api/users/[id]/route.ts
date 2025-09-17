import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// GET /api/users/[id] - Get single user
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    try {
      const { data: user, error } = await ctx.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiResponse.notFound('User not found')
        }
        console.error('User fetch error:', error)
        return apiResponse.error('Failed to fetch user', error.message, 500)
      }

      return apiResponse.success({ user })
    } catch (error: any) {
      console.error('User API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins can delete users
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can delete users')
    }

    // Prevent admin from deleting themselves
    if (ctx.user.id === id) {
      return apiResponse.error('Cannot delete your own account', undefined, 400)
    }

    try {
      // Check if user has any project associations
      const { data: projectReps, error: repCheckError } = await ctx.supabase
        .from('project_representatives')
        .select('id')
        .eq('user_id', id)
        .limit(1)

      if (repCheckError) {
        console.error('Project representatives check error:', repCheckError)
        return apiResponse.error('Failed to check user dependencies', repCheckError.message, 500)
      }

      if (projectReps && projectReps.length > 0) {
        return apiResponse.error('Cannot delete user', 'User is associated with projects', 400)
      }

      // Delete from auth (this will cascade delete profile)
      const { error: authError } = await ctx.supabase.auth.admin.deleteUser(id)

      if (authError) {
        console.error('Auth user delete error:', authError)
        return apiResponse.error('Failed to delete user', authError.message, 500)
      }

      return apiResponse.success(null, 'User deleted successfully')
    } catch (error: any) {
      console.error('User delete error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// PUT /api/users/[id] - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins can update other users
    if (ctx.user.role !== 'admin' && ctx.user.id !== id) {
      return apiResponse.forbidden('Only admins can update other users')
    }

    try {
      const body = await req.json()
      const updateData: any = {}

      // Allow partial updates
      if (body.full_name !== undefined) updateData.full_name = body.full_name
      if (body.role !== undefined && ctx.user.role === 'admin') updateData.role = body.role
      if (body.phone !== undefined) updateData.phone = body.phone
      if (body.iban !== undefined) updateData.iban = body.iban

      const { data: updatedUser, error: updateError } = await (ctx.supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('User update error:', updateError)
        return apiResponse.error('Failed to update user', updateError.message, 500)
      }

      return apiResponse.success(
        { user: updatedUser },
        'User updated successfully'
      )
    } catch (error: any) {
      console.error('User update error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}