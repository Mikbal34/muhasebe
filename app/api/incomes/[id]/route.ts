import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { updateIncomeCollectionSchema } from '@/lib/schemas/validation'

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

      // Note: Both admin and manager can view all income records

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
    // Only admins and managers can delete incomes
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can delete incomes')
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

// PATCH /api/incomes/[id] - Update income collection amount
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can update collection
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can update income collection')
    }

    const { id } = params

    try {
      const body = await request.json()

      // Validate request body
      const validation = updateIncomeCollectionSchema.safeParse(body)
      if (!validation.success) {
        return apiResponse.validationError(
          validation.error.errors.map((e) => e.message)
        )
      }

      const { collected_amount, collection_date } = validation.data

      // Get the income to check gross_amount constraint and project status
      const { data: existingIncome, error: fetchError } = await ctx.supabase
        .from('incomes')
        .select('gross_amount, collected_amount, project:projects(id, status)')
        .eq('id', id)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return apiResponse.notFound('Income not found')
        }
        return apiResponse.error('Failed to fetch income', fetchError.message, 500)
      }

      // Check if project is cancelled
      if ((existingIncome as any).project?.status === 'cancelled') {
        return apiResponse.error(
          'Proje iptal edilmiş',
          'İptal edilmiş projenin gelirine tahsilat kaydı yapılamaz',
          400
        )
      }

      // Validate collected_amount doesn't exceed gross_amount
      if (collected_amount > existingIncome.gross_amount) {
        return apiResponse.error(
          'Validation failed',
          'Tahsil edilen tutar brüt tutardan fazla olamaz',
          400
        )
      }

      // Update the income
      const updateData: any = {
        collected_amount,
      }

      // Only add collection_date if provided
      if (collection_date !== undefined && collection_date !== null) {
        updateData.collection_date = collection_date
      }

      const { data: updatedIncome, error: updateError } = await ctx.supabase
        .from('incomes')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          project:projects(id, code, name),
          created_by_user:users!incomes_created_by_fkey(id, full_name)
        `)
        .single()

      if (updateError) {
        console.error('Income update error:', updateError)
        return apiResponse.error('Failed to update income', updateError.message, 500)
      }

      // Log the collection update
      await ctx.supabase.from('audit_logs').insert({
        user_id: ctx.user.id,
        action: 'update_income_collection',
        table_name: 'incomes',
        record_id: id,
        changes: {
          collected_amount: {
            old: existingIncome.collected_amount,
            new: collected_amount,
          },
        },
      })

      return apiResponse.success({ income: updatedIncome }, 'Tahsilat kaydı başarıyla güncellendi')
    } catch (error: any) {
      console.error('Income collection update error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}