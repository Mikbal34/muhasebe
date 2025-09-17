import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createProjectSchema } from '@/lib/schemas/validation'

interface RouteParams {
  params: { id: string }
}

// GET /api/projects/[id] - Get single project
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = params

  return withAuth(request, async (req, ctx) => {
    try {
      // Check if user has access to this project
      if (ctx.user.role === 'academician') {
        const { data: hasAccess } = await ctx.supabase
          .from('project_representatives')
          .select('id')
          .eq('project_id', id)
          .eq('user_id', ctx.user.id)
          .single()

        if (!hasAccess) {
          return apiResponse.forbidden('You do not have access to this project')
        }
      }

      const { data: project, error } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name, email),
          representatives:project_representatives(
            id,
            share_percentage,
            is_lead,
            user:users(id, full_name, email, phone, iban)
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
    // Only admins and finance officers can update projects
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can update projects')
    }

    try {
      // Check if project exists
      const { data: existingProject, error: checkError } = await ctx.supabase
        .from('projects')
        .select('id, status')
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

      const { data: updatedProject, error: updateError } = await (ctx.supabase as any)
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name, email),
          representatives:project_representatives(
            id,
            share_percentage,
            is_lead,
            user:users(id, full_name, email)
          )
        `)
        .single()

      if (updateError) {
        console.error('Project update error:', updateError)
        return apiResponse.error('Failed to update project', updateError.message, 500)
      }

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