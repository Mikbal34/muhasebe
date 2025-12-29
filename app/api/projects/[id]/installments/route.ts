import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { z } from 'zod'

// Validation schema for updating installments
const updateInstallmentsSchema = z.object({
  installments: z.array(z.object({
    id: z.string().uuid(),
    planned_amount: z.number().positive('Taksit tutarı pozitif olmalı'),
    planned_date: z.string().date('Geçersiz tarih'),
    description: z.string().max(500).nullable().optional()
  }))
})

// Validation schema for adding new installment
const addInstallmentSchema = z.object({
  planned_amount: z.number().positive('Taksit tutarı pozitif olmalı'),
  planned_date: z.string().date('Geçersiz tarih'),
  description: z.string().max(500).nullable().optional()
})

// GET /api/projects/[id]/installments - Get project planned payments and actual incomes
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

      // Get planned payments for this project
      const { data: plannedPayments, error: plannedError } = await ctx.supabase
        .from('planned_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('installment_number', { ascending: true })

      if (plannedError) {
        console.error('Planned payments fetch error:', plannedError)
        return apiResponse.error('Ödeme planı getirilemedi', plannedError.message, 500)
      }

      // Get actual incomes for comparison
      const { data: actualIncomes, error: incomesError } = await ctx.supabase
        .from('incomes')
        .select('id, gross_amount, net_amount, vat_amount, income_date, collected_amount, description, created_at')
        .eq('project_id', projectId)
        .order('income_date', { ascending: true })

      if (incomesError) {
        console.error('Incomes fetch error:', incomesError)
        // Don't fail - just return empty actual incomes
      }

      return apiResponse.success({
        project: {
          id: project.id,
          budget: project.budget,
          name: project.name,
          code: project.code
        },
        planned_payments: plannedPayments || [],
        actual_incomes: actualIncomes || []
      })
    } catch (error: any) {
      console.error('Get installments error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}

// PUT /api/projects/[id]/installments - Update planned payments
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

      // Calculate new installments total
      const newTotal = newInstallments.reduce((sum, inst) => sum + inst.planned_amount, 0)

      // Validate total does not exceed budget
      if (newTotal > project.budget + 0.01) {
        return apiResponse.error(
          'Bütçe aşımı',
          `Taksit toplamı (${newTotal.toLocaleString('tr-TR')} ₺) proje bütçesini (${project.budget.toLocaleString('tr-TR')} ₺) aşamaz`,
          400
        )
      }

      // Update each installment
      const updateResults = []
      for (const inst of newInstallments) {
        const { error: updateError } = await ctx.supabase
          .from('planned_payments')
          .update({
            planned_amount: inst.planned_amount,
            planned_date: inst.planned_date,
            description: inst.description
          })
          .eq('id', inst.id)
          .eq('project_id', projectId)

        if (updateError) {
          updateResults.push({ id: inst.id, status: 'error', message: updateError.message })
        } else {
          updateResults.push({ id: inst.id, status: 'updated' })
        }
      }

      // Get updated planned payments
      const { data: updatedPayments } = await ctx.supabase
        .from('planned_payments')
        .select('*')
        .eq('project_id', projectId)
        .order('installment_number', { ascending: true })

      return apiResponse.success({
        planned_payments: updatedPayments || [],
        updateResults
      }, 'Ödeme planı güncellendi')
    } catch (error: any) {
      console.error('Update installments error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}

// POST /api/projects/[id]/installments - Add new planned payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can add installments
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece admin ve manager taksit ekleyebilir')
    }

    const { id: projectId } = await params

    try {
      const body = await request.json()
      const validation = addInstallmentSchema.safeParse(body)

      if (!validation.success) {
        return apiResponse.error('Geçersiz veri', validation.error.message, 400)
      }

      // Get project
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, budget')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return apiResponse.notFound('Proje bulunamadı')
      }

      // Get existing planned payments to find next installment number
      const { data: existing } = await ctx.supabase
        .from('planned_payments')
        .select('installment_number, planned_amount')
        .eq('project_id', projectId)
        .order('installment_number', { ascending: false })

      const nextNumber = existing && existing.length > 0
        ? existing[0].installment_number + 1
        : 1

      // Calculate current total
      const currentTotal = (existing || []).reduce((sum, p) => sum + p.planned_amount, 0)
      const newTotal = currentTotal + validation.data.planned_amount

      // Validate total does not exceed budget
      if (newTotal > project.budget + 0.01) {
        return apiResponse.error(
          'Bütçe aşımı',
          `Yeni taksit eklendiğinde toplam (${newTotal.toLocaleString('tr-TR')} ₺) proje bütçesini (${project.budget.toLocaleString('tr-TR')} ₺) aşar`,
          400
        )
      }

      // Create new planned payment
      const { data: newPayment, error: insertError } = await ctx.supabase
        .from('planned_payments')
        .insert({
          project_id: projectId,
          installment_number: nextNumber,
          planned_amount: validation.data.planned_amount,
          planned_date: validation.data.planned_date,
          description: validation.data.description || `Taksit ${nextNumber}`,
          created_by: ctx.user.id
        })
        .select()
        .single()

      if (insertError) {
        console.error('Add planned payment error:', insertError)
        return apiResponse.error('Taksit eklenemedi', insertError.message, 500)
      }

      return apiResponse.success({ planned_payment: newPayment }, 'Taksit eklendi')
    } catch (error: any) {
      console.error('Add installment error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}

// DELETE /api/projects/[id]/installments - Delete a planned payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can delete installments
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece admin ve manager taksit silebilir')
    }

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('payment_id')

    if (!paymentId) {
      return apiResponse.error('Taksit ID gerekli', '', 400)
    }

    try {
      const { error: deleteError } = await ctx.supabase
        .from('planned_payments')
        .delete()
        .eq('id', paymentId)
        .eq('project_id', projectId)

      if (deleteError) {
        console.error('Delete planned payment error:', deleteError)
        return apiResponse.error('Taksit silinemedi', deleteError.message, 500)
      }

      return apiResponse.success({ deleted: true }, 'Taksit silindi')
    } catch (error: any) {
      console.error('Delete installment error:', error)
      return apiResponse.error('Bir hata oluştu', error.message, 500)
    }
  })
}
