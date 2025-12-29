import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createProjectSchema } from '@/lib/schemas/validation'
import { syncAutoExpense } from '@/lib/utils/expense-helpers'

interface RouteParams {
  params: { id: string }
}

// GET /api/projects/[id] - Get single project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    try {
      // Note: Both admin and manager can view all projects

      const { data: project, error } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name, email),
          cancelled_by_user:users!projects_cancelled_by_fkey(full_name, email),
          representatives:project_representatives(
            id,
            role,
            user_id,
            personnel_id,
            user:users(id, full_name, email, phone, iban, role),
            personnel:personnel(id, full_name, email, phone, iban, tc_no)
          ),
          incomes(
            id,
            gross_amount,
            net_amount,
            vat_amount,
            income_date,
            description,
            created_at
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiResponse.notFound('Project not found')
        }
        console.error('Project fetch error:', error)
        return apiResponse.error('Failed to fetch project', error.message, 500)
      }

      return apiResponse.success({ project })
    } catch (error: any) {
      console.error('Project API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// PUT /api/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can update projects
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can update projects')
    }

    try {
      // Check if project exists and get current values for expense sync
      const { data: existingProject, error: checkError } = await ctx.supabase
        .from('projects')
        .select('id, status, start_date, referee_payment, referee_payer, stamp_duty_amount, stamp_duty_payer')
        .eq('id', id)
        .single()

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return apiResponse.notFound('Project not found')
        }
        return apiResponse.error('Failed to check project', checkError.message, 500)
      }

      // Prevent editing completed projects
      if ((existingProject as any).status !== 'active') {
        return apiResponse.error('Cannot edit project', 'Completed or cancelled projects cannot be edited', 400)
      }

      const body = await request.json()
      const updateData: any = {}

      // Allow partial updates
      if (body.name !== undefined) updateData.name = body.name
      if (body.budget !== undefined) updateData.budget = body.budget
      if (body.start_date !== undefined) updateData.start_date = body.start_date
      if (body.end_date !== undefined) updateData.end_date = body.end_date
      if (body.status !== undefined) updateData.status = body.status
      if (body.company_rate !== undefined) updateData.company_rate = body.company_rate
      if (body.vat_rate !== undefined) updateData.vat_rate = body.vat_rate
      if (body.referee_payment !== undefined) updateData.referee_payment = body.referee_payment
      if (body.referee_payer !== undefined) updateData.referee_payer = body.referee_payer
      if (body.stamp_duty_payer !== undefined) updateData.stamp_duty_payer = body.stamp_duty_payer
      if (body.stamp_duty_amount !== undefined) updateData.stamp_duty_amount = body.stamp_duty_amount
      if (body.contract_path !== undefined) updateData.contract_path = body.contract_path
      if (body.has_assignment_permission !== undefined) updateData.has_assignment_permission = body.has_assignment_permission
      if (body.assignment_document_path !== undefined) updateData.assignment_document_path = body.assignment_document_path
      if (body.sent_to_referee !== undefined) updateData.sent_to_referee = body.sent_to_referee
      if (body.referee_approved !== undefined) updateData.referee_approved = body.referee_approved
      if (body.referee_approval_date !== undefined) updateData.referee_approval_date = body.referee_approval_date
      if (body.has_withholding_tax !== undefined) updateData.has_withholding_tax = body.has_withholding_tax
      if (body.withholding_tax_rate !== undefined) updateData.withholding_tax_rate = body.has_withholding_tax ? body.withholding_tax_rate : 0

      const { data: updatedProject, error: updateError } = await (ctx.supabase as any)
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name, email),
          representatives:project_representatives(
            id,
            role,
            user:users(id, full_name, email)
          )
        `)
        .single()

      if (updateError) {
        console.error('Project update error:', updateError)
        return apiResponse.error('Failed to update project', updateError.message, 500)
      }

      // Sync auto expenses for referee payment and stamp duty
      const finalRefereePayment = body.referee_payment ?? (existingProject as any).referee_payment ?? 0
      const finalRefereePayer = body.referee_payer ?? (existingProject as any).referee_payer
      const finalStampDutyAmount = body.stamp_duty_amount ?? (existingProject as any).stamp_duty_amount ?? 0
      const finalStampDutyPayer = body.stamp_duty_payer ?? (existingProject as any).stamp_duty_payer
      const projectStartDate = body.start_date ?? (existingProject as any).start_date

      // Sync referee payment expense
      await syncAutoExpense({
        supabase: ctx.supabase,
        project_id: id,
        expense_source: 'referee_payment',
        amount: finalRefereePayment,
        payer: finalRefereePayer || null,
        start_date: projectStartDate,
        created_by: ctx.user.id
      })

      // Sync stamp duty expense
      await syncAutoExpense({
        supabase: ctx.supabase,
        project_id: id,
        expense_source: 'stamp_duty',
        amount: finalStampDutyAmount,
        payer: finalStampDutyPayer || null,
        start_date: projectStartDate,
        created_by: ctx.user.id
      })

      return apiResponse.success(
        { project: updatedProject },
        'Project updated successfully'
      )
    } catch (error: any) {
      console.error('Project update error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins can delete projects
    if (ctx.user.role !== 'admin') {
      return apiResponse.forbidden('Only admins can delete projects')
    }

    try {
      // Check if project has any incomes
      const { data: incomes, error: incomeCheckError } = await ctx.supabase
        .from('incomes')
        .select('id')
        .eq('project_id', id)
        .limit(1)

      if (incomeCheckError) {
        console.error('Income check error:', incomeCheckError)
        return apiResponse.error('Failed to check project dependencies', incomeCheckError.message, 500)
      }

      if (incomes && incomes.length > 0) {
        return apiResponse.error('Cannot delete project', 'Project has associated income records', 400)
      }

      // Delete project (representatives will be cascade deleted)
      const { error: deleteError } = await ctx.supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Project delete error:', deleteError)
        return apiResponse.error('Failed to delete project', deleteError.message, 500)
      }

      return apiResponse.success(null, 'Project deleted successfully')
    } catch (error: any) {
      console.error('Project delete error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}