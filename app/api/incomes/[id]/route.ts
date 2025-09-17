import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/incomes/[id] - Get single income detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    const { id } = params

    try {
      // Get income with all related data
      const { data: income, error } = await ctx.supabase
        .from('incomes')
        .select(`
          *,
          project:projects(
            id,
            name,
            code,
            company_rate,
            vat_rate
          ),
          created_by_user:users!incomes_created_by_fkey(full_name),
          distributions:income_distributions(
            id,
            amount,
            share_percentage,
            user:users(id, full_name, email)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiResponse.notFound('Income not found')
        }
        console.error('Income fetch error:', error)
        return apiResponse.error('Failed to fetch income', error.message, 500)
      }

      // Check access permissions
      if (ctx.user.role === 'academician') {
        // Check if academician is a representative of this project
        const { data: representative } = await ctx.supabase
          .from('project_representatives')
          .select('id')
          .eq('project_id', (income as any).project_id)
          .eq('user_id', ctx.user.id)
          .single()

        if (!representative) {
          return apiResponse.forbidden('You do not have access to this income record')
        }
      }

      return apiResponse.success({ income })
    } catch (error: any) {
      console.error('Income API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE /api/incomes/[id] - Delete income
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and finance officers can delete incomes
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can delete incomes')
    }

    const { id } = params

    try {
      // First check if income exists
      const { data: income, error: checkError } = await ctx.supabase
        .from('incomes')
        .select('id, project_id, net_amount')
        .eq('id', id)
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return apiResponse.notFound('Income not found')
        }
        return apiResponse.error('Failed to check income', checkError.message, 500)
      }

      // Delete income (cascade will handle distributions and commissions)
      const { error: deleteError } = await ctx.supabase
        .from('incomes')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Income deletion error:', deleteError)
        return apiResponse.error('Failed to delete income', deleteError.message, 500)
      }

      return apiResponse.success(null, 'Income deleted successfully')
    } catch (error: any) {
      console.error('Income deletion error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}