import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { z } from 'zod'

// Validation schema for updating installments
const updateInstallmentsSchema = z.object({
  installments: z.array(z.object({
    id: z.string().uuid(),
    gross_amount: z.number().positive('Taksit tutarı pozitif olmalı'),
    income_date: z.string().date('Geçersiz tarih'),
    description: z.string().max(500).nullable().optional()
  }))
})

// GET /api/projects/[id]/installments - Get project installments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    const { id: projectId } = await params

    try {
      // Verify project exists
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, budget, name, code')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return apiResponse.notFound('Proje bulunamadı')
      }

      // Get planned installments for this project
      const { data: installments, error: installmentsError } = await ctx.supabase
        .from('incomes')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_planned', true)
        .order('installment_number', { ascending: true })

      if (installmentsError) {
        console.error('Installments fetch error:', installmentsError)
        return apiResponse.error('Taksitler getirilemedi', installmentsError.message, 500)
      }

      return apiResponse.success({
        project: {
          id: project.id,
          budget: project.budget,
          name: project.name,
          code: project.code
        },
        installments: installments || []
      })
    } catch (error: any) {
      console.error('Get installments error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}

// PUT /api/projects/[id]/installments - Update project installments
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can update installments
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece admin ve manager taksit güncelleyebilir')
    }

    const { id: projectId } = await params

    try {
      // Parse request body
      const body = await request.json()
      const validation = updateInstallmentsSchema.safeParse(body)

      if (!validation.success) {
        return apiResponse.error('Geçersiz veri', validation.error.message, 400)
      }

      const { installments: newInstallments } = validation.data

      // Get project and its budget
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, budget')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return apiResponse.notFound('Proje bulunamadı')
      }

      // Get existing installments
      const { data: existingInstallments, error: existingError } = await ctx.supabase
        .from('incomes')
        .select('id, gross_amount, collected_amount')
        .eq('project_id', projectId)
        .eq('is_planned', true)

      if (existingError) {
        return apiResponse.error('Mevcut taksitler getirilemedi', existingError.message, 500)
      }

      // Calculate collected total (from installments that can't be edited)
      const collectedTotal = (existingInstallments || [])
        .filter(inst => (inst.collected_amount || 0) > 0)
        .reduce((sum, inst) => sum + inst.gross_amount, 0)

      // Calculate new installments total
      const newTotal = newInstallments.reduce((sum, inst) => sum + inst.gross_amount, 0)

      // Validate total does not exceed budget (can be less for partial planning)
      if ((collectedTotal + newTotal) > project.budget + 0.01) {
        return apiResponse.error(
          'Bütçe aşımı',
          `Taksit toplamı (${(collectedTotal + newTotal).toLocaleString('tr-TR')} ₺) proje bütçesini (${project.budget.toLocaleString('tr-TR')} ₺) aşamaz`,
          400
        )
      }

      // Update each installment (only if not collected)
      const updateResults = []
      for (const inst of newInstallments) {
        // Check if this installment exists and is not collected
        const existing = existingInstallments?.find(e => e.id === inst.id)

        if (!existing) {
          updateResults.push({ id: inst.id, status: 'not_found' })
          continue
        }

        if ((existing.collected_amount || 0) > 0) {
          updateResults.push({ id: inst.id, status: 'already_collected' })
          continue
        }

        // Update the installment
        const { error: updateError } = await ctx.supabase
          .from('incomes')
          .update({
            gross_amount: inst.gross_amount,
            income_date: inst.income_date,
            description: inst.description
          })
          .eq('id', inst.id)

        if (updateError) {
          updateResults.push({ id: inst.id, status: 'error', message: updateError.message })
        } else {
          updateResults.push({ id: inst.id, status: 'updated' })
        }
      }

      // Get updated installments
      const { data: updatedInstallments } = await ctx.supabase
        .from('incomes')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_planned', true)
        .order('installment_number', { ascending: true })

      return apiResponse.success({
        installments: updatedInstallments || [],
        updateResults
      }, 'Taksitler güncellendi')
    } catch (error: any) {
      console.error('Update installments error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}
