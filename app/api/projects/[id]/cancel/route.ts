import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// POST /api/projects/[id]/cancel - Cancel a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can cancel projects
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Yalnızca yöneticiler proje iptal edebilir')
    }

    try {
      // Check if project exists and is active
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, status, name, code')
        .eq('id', projectId)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return apiResponse.notFound('Proje bulunamadı')
        }
        return apiResponse.error('Proje kontrol edilemedi', projectError.message, 500)
      }

      // Only active projects can be cancelled
      if (project.status !== 'active') {
        return apiResponse.error(
          'Proje iptal edilemez',
          project.status === 'cancelled'
            ? 'Bu proje zaten iptal edilmiş'
            : 'Tamamlanmış projeler iptal edilemez',
          400
        )
      }

      // Get optional reason from request body
      let reason: string | null = null
      try {
        const body = await request.json()
        reason = body.reason || null
      } catch {
        // No body or invalid JSON - that's okay, reason is optional
      }

      // Update project to cancelled
      const { data: updatedProject, error: updateError } = await ctx.supabase
        .from('projects')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: ctx.user.id,
          cancellation_reason: reason,
        })
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) {
        console.error('Project cancel error:', updateError)
        return apiResponse.error('Proje iptal edilemedi', updateError.message, 500)
      }

      return apiResponse.success(
        { project: updatedProject },
        `${project.code} - ${project.name} projesi iptal edildi`
      )
    } catch (error: any) {
      console.error('Project cancel error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}
