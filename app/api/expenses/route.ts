import { NextRequest } from 'next/server'
import { createExpenseSchema, expenseQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/expenses - List expenses with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, expenseQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { project_id, start_date, end_date, created_by, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('expenses')
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!expenses_created_by_fkey(full_name)
        `, { count: 'exact' })

      // Apply filters
      if (project_id) {
        query = query.eq('project_id', project_id)
      }

      if (start_date) {
        query = query.gte('expense_date', start_date)
      }

      if (end_date) {
        query = query.lte('expense_date', end_date)
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: expenses, error, count } = await query

      if (error) {
        console.error('Expenses fetch error:', error)
        return apiResponse.error('Failed to fetch expenses', error.message, 500)
      }

      return apiResponse.success({
        expenses,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Expenses API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can create expenses
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create expenses')
    }

    // Validate request data
    const validation = await validateRequest(request, createExpenseSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { project_id, amount, description, expense_date } = validation.data

    try {
      // Check if project exists
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, code, name')
        .eq('id', project_id)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return apiResponse.notFound('Project not found')
        }
        return apiResponse.error('Failed to check project', projectError.message, 500)
      }

      // Create expense
      const { data: expense, error: expenseError } = await (ctx.supabase as any)
        .from('expenses')
        .insert({
          project_id,
          amount,
          description,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          created_by: ctx.user.id
        })
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!expenses_created_by_fkey(full_name)
        `)
        .single()

      if (expenseError) {
        console.error('Expense creation error:', expenseError)
        return apiResponse.error('Failed to create expense', expenseError.message, 500)
      }

      // Create audit log
      await (ctx.supabase as any).rpc('create_audit_log', {
        p_user_id: ctx.user.id,
        p_action: 'CREATE',
        p_entity_type: 'expense',
        p_entity_id: expense.id,
        p_new_values: {
          project_id,
          amount,
          description,
          expense_date: expense_date || new Date().toISOString().split('T')[0]
        }
      })

      return apiResponse.success(
        { expense },
        `Expense of ₺${amount.toLocaleString('tr-TR')} created successfully`
      )
    } catch (error: any) {
      console.error('Expense creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
