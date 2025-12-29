import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string }
}

// POST /api/projects/[id]/activate - Reactivate a project
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can activate projects
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Yalnızca yöneticiler proje aktifleştirebilir')
    }

    try {
      // Check if project exists
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

      // Only completed/cancelled projects can be activated
      if (project.status === 'active') {
        return apiResponse.error('Proje zaten aktif', 'Bu proje zaten aktif durumda', 400)
      }

      // Update project to active
      const { data: updatedProject, error: updateError } = await ctx.supabase
        .from('projects')
        .update({
          status: 'active',
          // İptal bilgilerini temizle (eğer iptal edilmişse)
          cancelled_at: null,
          cancelled_by: null,
          cancellation_reason: null,
        })
        .eq('id', projectId)
        .select()
        .single()

      if (updateError) {
        console.error('Project activate error:', updateError)
        return apiResponse.error('Proje aktifleştirilemedi', updateError.message, 500)
      }

      return apiResponse.success(
        { project: updatedProject },
        `${project.code} - ${project.name} projesi aktifleştirildi`
      )
    } catch (error: any) {
      console.error('Project activate error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}
