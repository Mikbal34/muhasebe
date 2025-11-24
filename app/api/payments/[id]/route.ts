import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// GET /api/payments/[id] - Get single payment instruction
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    try {
      // Note: Both admin and manager can view all payment instructions

      const { data: payment, error } = await ctx.supabase
        .from('payment_instructions')
        .select(`
          *,
          user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
          created_by_user:users!payment_instructions_created_by_fkey(full_name, email),
          items:payment_instruction_items(
            id,
            amount,
            description,
            income_distribution:income_distributions(
              id,
              amount,
              income:incomes(
                id,
                description,
                gross_amount,
                income_date,
                project:projects(id, name, code)
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiResponse.notFound('Payment instruction not found')
        }
        console.error('Payment fetch error:', error)
        return apiResponse.error('Failed to fetch payment instruction', error.message, 500)
      }

      return apiResponse.success({ payment })
    } catch (error: any) {
      console.error('Payment API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// PUT /api/payments/[id] - Update payment instruction status
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can update payment instructions
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can update payment instructions')
    }

    try {
      const body = await request.json()

      // Check if payment instruction exists
      const { data: existingPayment, error: checkError } = await ctx.supabase
        .from('payment_instructions')
        .select('id, status, user_id, total_amount')
        .eq('id', id)
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return apiResponse.notFound('Payment instruction not found')
        }
        return apiResponse.error('Failed to check payment instruction', checkError.message, 500)
      }

      // Only allow status updates for now
      const updateData: any = {}
      if (body.status !== undefined) {
        // Validate status transitions
        const allowedTransitions: Record<string, string[]> = {
          'pending': ['approved', 'rejected'],
          'approved': ['processing', 'rejected'],
          'processing': ['completed', 'rejected'],
          'completed': [], // Cannot change from completed
          'rejected': ['pending'] // Can reopen rejected payments
        }

        if (!allowedTransitions[(existingPayment as any).status]?.includes(body.status)) {
          return apiResponse.error('Invalid status transition',
            `Cannot change status from ${(existingPayment as any).status} to ${body.status}`, 400)
        }

        updateData.status = body.status

        // If approving or completing, update user balance
        if (body.status === 'approved' || body.status === 'completed') {
          // This will be handled by database triggers
          updateData.approved_at = new Date().toISOString()
        }
      }

      if (body.notes !== undefined) {
        updateData.notes = body.notes
      }

      const { data: updatedPayment, error: updateError } = await (ctx.supabase as any)
        .from('payment_instructions')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
          created_by_user:users!payment_instructions_created_by_fkey(full_name, email),
          items:payment_instruction_items(
            id,
            amount,
            description,
            income_distribution:income_distributions(
              id,
              amount,
              income:incomes(
                id,
                description,
                project:projects(id, name, code)
              )
            )
          )
        `)
        .single()

      if (updateError) {
        console.error('Payment update error:', updateError)
        return apiResponse.error('Failed to update payment instruction', updateError.message, 500)
      }

      return apiResponse.success(
        { payment: updatedPayment },
        'Payment instruction updated successfully'
      )
    } catch (error: any) {
      console.error('Payment update error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE /api/payments/[id] - Delete payment instruction
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins can delete payment instructions
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can delete payment instructions')
    }

    try {
      // Check if payment instruction exists and its status
      const { data: payment, error: checkError } = await ctx.supabase
        .from('payment_instructions')
        .select('id, status')
        .eq('id', id)
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return apiResponse.notFound('Payment instruction not found')
        }
        return apiResponse.error('Failed to check payment instruction', checkError.message, 500)
      }

      // Don't allow deletion of completed payments
      if ((payment as any).status === 'completed') {
        return apiResponse.error('Cannot delete payment', 'Completed payment instructions cannot be deleted', 400)
      }

      // Delete payment instruction (items will be cascade deleted)
      const { error: deleteError } = await ctx.supabase
        .from('payment_instructions')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Payment delete error:', deleteError)
        return apiResponse.error('Failed to delete payment instruction', deleteError.message, 500)
      }

      return apiResponse.success(null, 'Payment instruction deleted successfully')
    } catch (error: any) {
      console.error('Payment delete error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}