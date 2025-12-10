import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can view earnings')
    }

    try {
      const supabase = await createClient()
      const personnelId = params.id

      // Fetch income distributions for this personnel
      const { data: distributions, error } = await supabase
        .from('income_distributions')
        .select(`
          id,
          amount,
          income:income_id(
            id,
            project:project_id(id, code, name)
          )
        `)
        .eq('personnel_id', personnelId)

      if (error) throw error

      // Group by project
      const projectMap = new Map<string, {
        project_id: string
        project_code: string
        project_name: string
        total_amount: number
      }>()

      let totalEarnings = 0

      ;(distributions || []).forEach((dist: any) => {
        const projectId = dist.income?.project?.id || 'unknown'
        const projectCode = dist.income?.project?.code || 'N/A'
        const projectName = dist.income?.project?.name || 'Bilinmeyen Proje'
        const amount = dist.amount || 0

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            project_id: projectId,
            project_code: projectCode,
            project_name: projectName,
            total_amount: 0
          })
        }

        const project = projectMap.get(projectId)!
        project.total_amount += amount
        totalEarnings += amount
      })

      // Calculate percentages and convert to array
      const earnings = Array.from(projectMap.values())
        .map(project => ({
          ...project,
          percentage: totalEarnings > 0 ? (project.total_amount / totalEarnings) * 100 : 0
        }))
        .sort((a, b) => b.total_amount - a.total_amount)

      return apiResponse.success({
        earnings,
        total: totalEarnings
      })

    } catch (error: any) {
      console.error('Personnel earnings fetch error:', error)
      return apiResponse.error('Failed to fetch earnings', error.message, 500)
    }
  })
}
