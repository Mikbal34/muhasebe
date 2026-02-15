import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/dashboard/remaining - Get remaining (uninvoiced) budget by project
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Only admins and managers can access
      if (!['admin', 'manager'].includes(ctx.user.role)) {
        return apiResponse.error('Unauthorized', 'Only admins and managers can access this data', 403)
      }

      // Get all active projects with their total invoiced amount
      const { data: projects, error: projectsError } = await ctx.supabase
        .from('projects')
        .select(`
          id,
          code,
          name,
          budget,
          company_name,
          status
        `)
        .eq('status', 'active')
        .gt('budget', 0)

      if (projectsError) {
        console.error('Projects fetch error:', projectsError)
        return apiResponse.error('Failed to fetch projects', projectsError.message, 500)
      }

      // Get all incomes (both planned and actual)
      const { data: incomes, error: incomesError } = await ctx.supabase
        .from('incomes')
        .select(`
          id,
          description,
          income_date,
          gross_amount,
          is_planned,
          project_id
        `)

      if (incomesError) {
        console.error('Incomes fetch error:', incomesError)
        return apiResponse.error('Failed to fetch incomes', incomesError.message, 500)
      }

      // Calculate remaining budget for each project
      const projectsWithRemaining = projects?.map((project: any) => {
        // Get actual invoices (not planned)
        const projectIncomes = incomes?.filter((i: any) =>
          i.project_id === project.id && !i.is_planned
        ) || []

        // Get planned invoices
        const plannedIncomes = incomes?.filter((i: any) =>
          i.project_id === project.id && i.is_planned
        ) || []

        const invoiced = projectIncomes.reduce((sum: number, i: any) => sum + (i.gross_amount || 0), 0)
        const remaining = (project.budget || 0) - invoiced
        const progress = project.budget > 0 ? (invoiced / project.budget) * 100 : 0

        return {
          id: project.id,
          code: project.code,
          name: project.name,
          company: project.company_name || '',
          budget: project.budget || 0,
          invoiced,
          remaining,
          progress: Math.round(progress * 10) / 10,
          plannedInvoices: plannedIncomes.map((i: any) => ({
            id: i.id,
            description: i.description || '',
            amount: i.gross_amount || 0,
            plannedDate: i.income_date
          }))
        }
      }).filter((p: any) => p.remaining > 0) || []

      // Sort by remaining amount (descending)
      projectsWithRemaining.sort((a: any, b: any) => b.remaining - a.remaining)

      const total = projectsWithRemaining.reduce((sum: number, p: any) => sum + p.remaining, 0)
      const totalPlannedCount = projectsWithRemaining.reduce(
        (sum: number, p: any) => sum + p.plannedInvoices.length, 0
      )

      return apiResponse.success({
        total,
        projectCount: projectsWithRemaining.length,
        totalPlannedCount,
        projects: projectsWithRemaining
      })
    } catch (error: any) {
      console.error('Remaining API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
