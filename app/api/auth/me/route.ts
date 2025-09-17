import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Get user balance
      const { data: balance } = await ctx.supabase
        .from('balances')
        .select('available_amount, debt_amount, reserved_amount, last_updated')
        .eq('user_id', ctx.user.id)
        .single()

      return apiResponse.success({
        user: ctx.user,
        balance: balance || {
          available_amount: 0,
          debt_amount: 0,
          reserved_amount: 0,
          last_updated: new Date().toISOString(),
        },
      })
    } catch (error: any) {
      console.error('Get user profile error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const body = await request.json()
      const allowedFields = ['full_name', 'phone', 'iban']

      // Filter only allowed fields
      const updates = Object.keys(body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = body[key]
          return obj
        }, {} as any)

      if (Object.keys(updates).length === 0) {
        return apiResponse.error('Invalid request', 'No valid fields provided for update', 400)
      }

      const { data: updatedUser, error } = await ctx.supabase
        .from('users')
        .update(updates)
        .eq('id', ctx.user.id)
        .select()
        .single()

      if (error) {
        return apiResponse.error('Update failed', error.message, 400)
      }

      return apiResponse.success(updatedUser, 'Profile updated successfully')
    } catch (error: any) {
      console.error('Update profile error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}