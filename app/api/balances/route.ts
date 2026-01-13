import { NextRequest } from 'next/server'
import { balanceQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/balances - List user balances with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, balanceQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { user_id, page = 1, limit = 10000, sort = 'last_updated', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('balances')
        .select(`
          *,
          user:users!balances_user_id_fkey(id, full_name, email, iban),
          personnel:personnel!balances_personnel_id_fkey(id, full_name, email, iban),
          project:projects!balances_project_id_fkey(id, code, name)
        `)

      // Apply filters based on user role
      // Both admin and manager can view all balances
      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: balances, error, count } = await query

      if (error) {
        console.error('Balances fetch error:', error)
        return apiResponse.error('Failed to fetch balances', error.message, 500)
      }

      return apiResponse.success({
        balances,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Balances API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}