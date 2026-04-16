import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// POST /api/payments/bulk-complete — Tüm pending ödemeleri completed yap
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Sadece yöneticiler toplu onay yapabilir')
    }

    try {
      // Fetch all pending payments
      const { data: pendingPayments, error: fetchError } = await (ctx.supabase as any)
        .from('payment_instructions')
        .select('id, total_amount, user_id, personnel_id, project_id, status')
        .eq('status', 'pending')

      if (fetchError) {
        return apiResponse.error('Bekleyen ödemeler yüklenemedi', fetchError.message, 500)
      }

      if (!pendingPayments || pendingPayments.length === 0) {
        return apiResponse.error('Bekleyen ödeme talimatı bulunamadı', undefined, 400)
      }

      let completedCount = 0
      let completedTotal = 0
      const errors: { id: string; message: string }[] = []

      for (const payment of pendingPayments) {
        try {
          // Update status to completed
          const { error: updateError } = await (ctx.supabase as any)
            .from('payment_instructions')
            .update({
              status: 'completed',
              approved_by: ctx.user.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', payment.id)

          if (updateError) {
            errors.push({ id: payment.id, message: updateError.message })
            continue
          }

          completedCount++
          completedTotal += payment.total_amount
        } catch (err: any) {
          errors.push({ id: payment.id, message: err?.message || 'Bilinmeyen hata' })
        }
      }

      // Audit log (non-fatal)
      try {
        await (ctx.supabase as any).rpc('create_audit_log', {
          p_user_id: ctx.user.id,
          p_action: 'BULK_COMPLETE',
          p_entity_type: 'payment_instruction',
          p_entity_id: null,
          p_new_values: {
            completed_count: completedCount,
            total_amount: completedTotal
          }
        })
      } catch { /* non-fatal */ }

      return apiResponse.success(
        {
          completed: completedCount,
          total_amount: completedTotal,
          total_pending: pendingPayments.length,
          errors: errors.length > 0 ? errors : undefined
        },
        `${completedCount} ödeme talimatı tamamlandı olarak işaretlendi`
      )
    } catch (error: any) {
      console.error('Bulk complete error:', error)
      return apiResponse.error('Toplu onay başarısız', error.message, 500)
    }
  })
}
