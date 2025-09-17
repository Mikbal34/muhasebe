import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const { error } = await ctx.supabase.auth.signOut()

      if (error) {
        return apiResponse.error('Logout failed', error.message, 400)
      }

      return apiResponse.success(null, 'Logged out successfully')
    } catch (error: any) {
      console.error('Logout error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}