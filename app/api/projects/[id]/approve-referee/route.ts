import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// POST /api/projects/[id]/approve-referee - Approve referee for a project
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can approve referee
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can approve referee')
    }

    const projectId = params.id

    try {
      // Check if project exists and is sent to referee
      const { data: project, error: fetchError } = await ctx.supabase
        .from('projects')
        .select('id, sent_to_referee, referee_approved')
        .eq('id', projectId)
        .single()

      if (fetchError || !project) {
        return apiResponse.error('Project not found', fetchError?.message, 404)
      }

      if (!project.sent_to_referee) {
        return apiResponse.error('Project has not been sent to referee yet', '', 400)
      }

      if (project.referee_approved) {
        return apiResponse.error('Project is already approved by referee', '', 400)
      }

      // Update project to mark as referee approved
      const { data: updatedProject, error: updateError } = await ctx.supabase
        .from('projects')
        .update({
          referee_approved: true,
          referee_approval_date: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) {
        console.error('Referee approval error:', updateError)
        return apiResponse.error('Failed to approve referee', updateError.message, 500)
      }

      return apiResponse.success(
        { project: updatedProject },
        'Referee approval recorded successfully'
      )
    } catch (error: any) {
      console.error('Referee approval error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
