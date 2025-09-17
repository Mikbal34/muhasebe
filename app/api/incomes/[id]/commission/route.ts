import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/incomes/[id]/commission - Get commission details for an income
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    const { id } = params

    try {
      // Get commission details for this income
      const { data: commission, error } = await ctx.supabase
        .from('commissions')
        .select('rate, amount')
        .eq('income_id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No commission found (might be normal)
          return apiResponse.success(null)
        }
        console.error('Commission fetch error:', error)
        return apiResponse.error('Failed to fetch commission', error.message, 500)
      }

      return apiResponse.success(commission)
    } catch (error: any) {
      console.error('Commission API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}