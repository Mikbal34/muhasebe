import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/dashboard/outstanding - Get outstanding (unpaid) invoices by project
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Only admins and managers can access
      if (!['admin', 'manager'].includes(ctx.user.role)) {
        return apiResponse.error('Unauthorized', 'Only admins and managers can access this data', 403)
      }

      // Get projects with their incomes where there's outstanding balance
      const { data: incomes, error: incomesError } = await ctx.supabase
        .from('incomes')
        .select(`
          id,
          description,
          income_date,
          gross_amount,
          collected_amount,
          project:projects (
            id,
            code,
            name,
            budget,
            company_name
          )
        `)
        .gt('gross_amount', 0)
        .order('income_date', { ascending: false })

      if (incomesError) {
        console.error('Incomes fetch error:', incomesError)
        return apiResponse.error('Failed to fetch incomes', incomesError.message, 500)
      }

      // Filter incomes with outstanding balance and group by project
      const projectMap = new Map<string, {
        id: string
        code: string
        name: string
        company: string
        budget: number
        invoiced: number
        collected: number
        outstanding: number
        incomes: Array<{
          id: string
          description: string
          date: string
          gross: number
          collected: number
          outstanding: number
        }>
      }>()

      incomes?.forEach((income: any) => {
        if (!income.project) return

        const outstanding = (income.gross_amount || 0) - (income.collected_amount || 0)

        // Only include if there's outstanding balance
        if (outstanding <= 0) return

        const projectId = income.project.id

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            id: projectId,
            code: income.project.code,
            name: income.project.name,
            company: income.project.company_name || '',
            budget: income.project.budget || 0,
            invoiced: 0,
            collected: 0,
            outstanding: 0,
            incomes: []
          })
        }

        const project = projectMap.get(projectId)!
        project.invoiced += income.gross_amount || 0
        project.collected += income.collected_amount || 0
        project.outstanding += outstanding
        project.incomes.push({
          id: income.id,
          description: income.description || '',
          date: income.income_date,
          gross: income.gross_amount || 0,
          collected: income.collected_amount || 0,
          outstanding: outstanding
        })
      })

      // Convert map to array and calculate totals
      const projects = Array.from(projectMap.values())
        .sort((a, b) => b.outstanding - a.outstanding)

      const total = projects.reduce((sum, p) => sum + p.outstanding, 0)

      return apiResponse.success({
        total,
        projectCount: projects.length,
        projects
      })
    } catch (error: any) {
      console.error('Outstanding API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
