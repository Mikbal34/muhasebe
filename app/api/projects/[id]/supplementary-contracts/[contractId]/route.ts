import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

interface RouteParams {
  params: { id: string; contractId: string }
}

// GET /api/projects/[id]/supplementary-contracts/[contractId] - Get single supplementary contract
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId, contractId } = params

  return withAuth(request, async (req, ctx) => {
    try {
      const { data: contract, error } = await ctx.supabase
        .from('supplementary_contracts')
        .select(`
          *,
          created_by_user:users!supplementary_contracts_created_by_fkey(full_name, email)
        `)
        .eq('id', contractId)
        .eq('project_id', projectId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return apiResponse.notFound('Ek sözleşme bulunamadı')
        }
        console.error('Supplementary contract fetch error:', error)
        return apiResponse.error('Ek sözleşme getirilemedi', error.message, 500)
      }

      return apiResponse.success({ contract })
    } catch (error: any) {
      console.error('Supplementary contract API error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}

// DELETE /api/projects/[id]/supplementary-contracts/[contractId] - Delete supplementary contract
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId, contractId } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can delete supplementary contracts
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Yalnızca yöneticiler ek sözleşme silebilir')
    }

    try {
      // Get the contract to delete
      const { data: contractToDelete, error: fetchError } = await ctx.supabase
        .from('supplementary_contracts')
        .select('id, project_id, amendment_number')
        .eq('id', contractId)
        .eq('project_id', projectId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return apiResponse.notFound('Ek sözleşme bulunamadı')
        }
        return apiResponse.error('Ek sözleşme kontrol edilemedi', fetchError.message, 500)
      }

      // Check if this is the latest contract (only latest can be deleted)
      const { data: latestContract, error: latestError } = await ctx.supabase
        .from('supplementary_contracts')
        .select('id, amendment_number')
        .eq('project_id', projectId)
        .order('amendment_number', { ascending: false })
        .limit(1)
        .single()

      if (latestError) {
        return apiResponse.error('En son ek sözleşme kontrol edilemedi', latestError.message, 500)
      }

      if (latestContract.id !== contractId) {
        return apiResponse.error(
          'Silme işlemi yapılamaz',
          'Sadece en son ek sözleşme silinebilir. Sırasıyla silmeniz gerekmektedir.',
          400
        )
      }

      // Delete the contract (trigger will update project values)
      const { error: deleteError } = await ctx.supabase
        .from('supplementary_contracts')
        .delete()
        .eq('id', contractId)

      if (deleteError) {
        console.error('Supplementary contract delete error:', deleteError)
        return apiResponse.error('Ek sözleşme silinemedi', deleteError.message, 500)
      }

      return apiResponse.success(
        null,
        `${contractToDelete.amendment_number}. Ek Sözleşme başarıyla silindi`
      )
    } catch (error: any) {
      console.error('Supplementary contract delete error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}
