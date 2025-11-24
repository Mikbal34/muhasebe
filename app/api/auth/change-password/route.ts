import { NextRequest } from 'next/server'
import { withAuth, apiResponse } from '@/lib/middleware/auth'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const { supabase, user } = ctx
      const body = await request.json()

      const { current_password, new_password } = body

      // Validate required fields
      if (!current_password || !new_password) {
        return apiResponse.error(
          'Validation failed',
          'Current password and new password are required',
          400
        )
      }

      // Validate new password strength
      if (new_password.length < 8) {
        return apiResponse.error(
          'Validation failed',
          'New password must be at least 8 characters long',
          400
        )
      }

      // Check if new password is different from current password
      if (current_password === new_password) {
        return apiResponse.error(
          'Validation failed',
          'New password must be different from current password',
          400
        )
      }

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current_password
      })

      if (signInError) {
        return apiResponse.error(
          'Authentication failed',
          'Current password is incorrect',
          401
        )
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: new_password
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        return apiResponse.error(
          'Password update failed',
          updateError.message,
          500
        )
      }

      return apiResponse.success(
        { message: 'Password changed successfully' },
        'Password changed successfully'
      )
    } catch (error: any) {
      console.error('POST /api/auth/change-password error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
