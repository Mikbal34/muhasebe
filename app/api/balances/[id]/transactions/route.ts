import { NextRequest } from 'next/server'
import { transactionQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateQuery, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// GET /api/balances/[id]/transactions - Get balance transaction history
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, transactionQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { type, start_date, end_date, page = 1, limit = 50, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      // First check if balance exists and user has access
      const { data: balance, error: balanceError } = await ctx.supabase
        .from('balances')
        .select('id, user_id')
        .eq('id', id)
        .single()

      if (balanceError) {
        if (balanceError.code === 'PGRST116') {
          return apiResponse.notFound('Balance not found')
        }
        return apiResponse.error('Failed to check balance', balanceError.message, 500)
      }

      // Check access permissions
      if (ctx.user.role === 'academician' && (balance as any).user_id !== ctx.user.id) {
        return apiResponse.forbidden('You can only view your own balance transactions')
      }

      let query = ctx.supabase
        .from('balance_transactions')
        .select('*')
        .eq('balance_id', id)

      // Apply filters
      if (type) {
        query = query.eq('type', type)
      }

      if (start_date) {
        query = query.gte('created_at', start_date)
      }

      if (end_date) {
        query = query.lte('created_at', end_date)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: transactions, error, count } = await query

      if (error) {
        console.error('Balance transactions fetch error:', error)
        return apiResponse.error('Failed to fetch transactions', error.message, 500)
      }

      return apiResponse.success({
        transactions,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Balance transactions API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}