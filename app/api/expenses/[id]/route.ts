import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// DELETE /api/expenses/[id] - Delete an expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins can delete expenses
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can delete expenses')
    }

    const { id } = params

    try {
      // Check if expense exists
      const { data: expense, error: fetchError } = await ctx.supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !expense) {
        return apiResponse.notFound('Expense not found')
      }

      // Delete the expense
      const { error: deleteError } = await ctx.supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Expense deletion error:', deleteError)
        return apiResponse.error('Failed to delete expense', deleteError.message, 500)
      }

      // Create audit log
      await (ctx.supabase as any).rpc('create_audit_log', {
        p_user_id: ctx.user.id,
        p_action: 'DELETE',
        p_entity_type: 'expense',
        p_entity_id: id,
        p_old_values: expense
      })

      return apiResponse.success(null, 'Expense deleted successfully')
    } catch (error: any) {
      console.error('Expense deletion error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
