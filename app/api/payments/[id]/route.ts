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
          personnel:personnel!payment_instructions_personnel_id_fkey(id, full_name, email, iban),
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
        .select('id, status, user_id, personnel_id, total_amount')
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
        // Validate status transitions (simplified flow: pending → completed/rejected)
        const allowedTransitions: Record<string, string[]> = {
          'pending': ['completed', 'rejected'],
          'completed': [], // Cannot change from completed
          'rejected': ['pending'] // Can reopen rejected payments
        }

        if (!allowedTransitions[(existingPayment as any).status]?.includes(body.status)) {
          return apiResponse.error('Invalid status transition',
            `Cannot change status from ${(existingPayment as any).status} to ${body.status}`, 400)
        }

        updateData.status = body.status

        // If completing, update timestamp
        if (body.status === 'completed') {
          updateData.approved_at = new Date().toISOString()
        }

        // Handle balance updates based on status change
        const personType = existingPayment.user_id ? 'user' : 'personnel'
        const personId = existingPayment.user_id || existingPayment.personnel_id

        // Get current balance
        const { data: balance, error: balanceError } = await ctx.supabase
          .from('balances')
          .select('id, available_amount, reserved_amount, total_payment')
          .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)
          .single()

        if (balanceError) {
          console.error('Balance fetch error:', balanceError)
          return apiResponse.error('Failed to fetch balance', balanceError.message, 500)
        }

        if (body.status === 'completed') {
          // Finalize: Move from reserved to total_payment
          const { error: updateBalanceError } = await ctx.supabase
            .from('balances')
            .update({
              reserved_amount: Math.max(0, (balance.reserved_amount || 0) - existingPayment.total_amount),
              total_payment: (balance.total_payment || 0) + existingPayment.total_amount,
              last_updated: new Date().toISOString()
            })
            .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)

          if (updateBalanceError) {
            console.error('Balance update error:', updateBalanceError)
            return apiResponse.error('Failed to update balance', updateBalanceError.message, 500)
          }
        } else if (body.status === 'rejected') {
          // Refund: Move from reserved back to available
          const { error: updateBalanceError } = await ctx.supabase
            .from('balances')
            .update({
              reserved_amount: Math.max(0, (balance.reserved_amount || 0) - existingPayment.total_amount),
              available_amount: (balance.available_amount || 0) + existingPayment.total_amount,
              last_updated: new Date().toISOString()
            })
            .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)

          if (updateBalanceError) {
            console.error('Balance update error:', updateBalanceError)
            return apiResponse.error('Failed to update balance', updateBalanceError.message, 500)
          }
        } else if (body.status === 'pending' && (existingPayment as any).status === 'rejected') {
          // Reopening rejected payment: Move from available back to reserved
          // First check if there's enough balance
          if (existingPayment.total_amount > (balance.available_amount || 0)) {
            return apiResponse.error('Insufficient balance',
              `Yetersiz bakiye. Mevcut: ₺${(balance.available_amount || 0).toLocaleString('tr-TR')}, Gerekli: ₺${existingPayment.total_amount.toLocaleString('tr-TR')}`, 400)
          }

          const { error: updateBalanceError } = await ctx.supabase
            .from('balances')
            .update({
              available_amount: (balance.available_amount || 0) - existingPayment.total_amount,
              reserved_amount: (balance.reserved_amount || 0) + existingPayment.total_amount,
              last_updated: new Date().toISOString()
            })
            .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)

          if (updateBalanceError) {
            console.error('Balance update error:', updateBalanceError)
            return apiResponse.error('Failed to update balance', updateBalanceError.message, 500)
          }
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
          personnel:personnel!payment_instructions_personnel_id_fkey(id, full_name, email, iban),
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

      // If payment is pending, return reserved amount to available
      if ((payment as any).status === 'pending') {
        // Get full payment details to determine person type
        const { data: fullPayment, error: fullPaymentError } = await ctx.supabase
          .from('payment_instructions')
          .select('user_id, personnel_id, total_amount')
          .eq('id', id)
          .single()

        if (!fullPaymentError && fullPayment) {
          const personType = fullPayment.user_id ? 'user' : 'personnel'
          const personId = fullPayment.user_id || fullPayment.personnel_id

          // Get current balance
          const { data: balance, error: balanceError } = await ctx.supabase
            .from('balances')
            .select('available_amount, reserved_amount')
            .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)
            .single()

          if (!balanceError && balance) {
            // Return reserved to available
            await ctx.supabase
              .from('balances')
              .update({
                available_amount: (balance.available_amount || 0) + fullPayment.total_amount,
                reserved_amount: Math.max(0, (balance.reserved_amount || 0) - fullPayment.total_amount),
                last_updated: new Date().toISOString()
              })
              .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)
          }
        }
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