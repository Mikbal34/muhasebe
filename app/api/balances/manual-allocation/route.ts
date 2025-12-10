import { NextRequest } from 'next/server'
import { withManager, apiResponse } from '@/lib/middleware/auth'
import { z } from 'zod'
import Decimal from 'decimal.js'

const allocationSchema = z.object({
  project_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  personnel_id: z.string().uuid().nullable().optional(),
  amount: z.number(),
  notes: z.string().optional(),
}).refine(data => data.user_id || data.personnel_id, {
  message: 'Either user_id or personnel_id is required',
})

// GET: Get project allocation summary
export async function GET(request: NextRequest) {
  return withManager(request, async (req, ctx) => {
    try {
      const { searchParams } = new URL(request.url)
      const projectId = searchParams.get('project_id')

      if (!projectId) {
        return apiResponse.error('Validation failed', 'project_id is required', 400)
      }

      const { supabase } = ctx

      // Get project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError || !project) {
        return apiResponse.error('Project not found', 'Project does not exist', 404)
      }

      // Get project team members (both users and personnel)
      const { data: representatives, error: repsError } = await supabase
        .from('project_representatives')
        .select(`
          id,
          user_id,
          personnel_id,
          role,
          user:users (
            id,
            full_name,
            email
          ),
          personnel:personnel (
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)

      if (repsError) {
        return apiResponse.error('Failed to fetch representatives', repsError.message, 500)
      }

      // Get project incomes (including collected_amount for tahsilat bazlı hesaplama)
      // vat_amount artık tevkifat düşülmüş halde geliyor (migration 066 ile)
      const { data: incomes, error: incomesError } = await supabase
        .from('incomes')
        .select('id, gross_amount, vat_amount, vat_rate, collected_amount, withholding_tax_amount')
        .eq('project_id', projectId)

      if (incomesError) {
        return apiResponse.error('Failed to fetch incomes', incomesError.message, 500)
      }

      // Get project commissions (for reference only)
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('amount, income_id')
        .in('income_id', (incomes || []).map((inc: any) => inc.id) || [])

      if (commissionsError && commissionsError.code !== 'PGRST116') {
        return apiResponse.error('Failed to fetch commissions', commissionsError.message, 500)
      }

      // Get project expenses (giderler)
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, amount, is_tto_expense, expense_share_type')
        .eq('project_id', projectId)

      if (expensesError) {
        return apiResponse.error('Failed to fetch expenses', expensesError.message, 500)
      }

      // Calculate financial summary - TAHSILAT BAZLI
      // Toplam brüt ve KDV (tüm gelirlerden - bilgi amaçlı)
      const totalGross = (incomes || []).reduce((sum: Decimal, inc: any) =>
        sum.plus(new Decimal(inc.gross_amount || 0)), new Decimal(0)
      )
      const totalVAT = (incomes || []).reduce((sum: Decimal, inc: any) =>
        sum.plus(new Decimal(inc.vat_amount || 0)), new Decimal(0)
      )

      // Toplam tahsil edilen
      const totalCollected = (incomes || []).reduce((sum: Decimal, inc: any) =>
        sum.plus(new Decimal(inc.collected_amount || 0)), new Decimal(0)
      )

      // Tahsil edilenden KDV hesapla
      // vat_amount artık tevkifat düşülmüş değeri içeriyor (migration 066)
      // Oran hesabı: collected / gross * vat_amount (kısmi tahsilat için)
      const collectedVAT = (incomes || []).reduce((sum: Decimal, inc: any) => {
        const collected = new Decimal(inc.collected_amount || 0)
        const gross = new Decimal(inc.gross_amount || 1) // divide by zero koruması
        const vatAmount = new Decimal(inc.vat_amount || 0)

        // Kısmi tahsilat oranı
        const collectionRatio = gross.isZero() ? new Decimal(0) : collected.dividedBy(gross)

        // Tahsil edilen kısma düşen KDV (tevkifat zaten düşülmüş)
        return sum.plus(vatAmount.times(collectionRatio))
      }, new Decimal(0))

      // Tahsil edilen net tutar
      const collectedNet = totalCollected.minus(collectedVAT)

      // Tahsil edilenden komisyon hesapla
      const commissionRate = new Decimal(project.company_rate || 0)
      const collectedCommission = collectedNet.times(commissionRate).dividedBy(100)

      // Dağıtılabilir = Tahsil Edilen Net - Komisyon
      let distributableAmount = collectedNet.minus(collectedCommission)

      // =====================================================
      // GİDERLERİ DAĞITILABILIR MİKTARDAN DÜŞ
      // =====================================================

      // 1. Karşı taraf giderleri (client) - direkt dağıtılabilirden düşülür
      const clientExpenses = (expenses || [])
        .filter((exp: any) => !exp.is_tto_expense && (exp.expense_share_type === 'client' || !exp.expense_share_type))
        .reduce((sum: Decimal, exp: any) => sum.plus(new Decimal(exp.amount || 0)), new Decimal(0))

      // 2. Ortak giderlerin temsilci payı - dağıtılabilirden düşülür
      // TTO payı zaten trigger ile TTO bakiyesinden düşülüyor
      const sharedExpenses = (expenses || [])
        .filter((exp: any) => !exp.is_tto_expense && exp.expense_share_type === 'shared')
        .reduce((sum: Decimal, exp: any) => sum.plus(new Decimal(exp.amount || 0)), new Decimal(0))

      // Ortak giderin temsilci payı = Toplam × (100 - company_rate) / 100
      const sharedExpensesRepPortion = sharedExpenses.times(new Decimal(100).minus(commissionRate)).dividedBy(100)

      // Toplam gider düşümü
      const totalExpenseDeduction = clientExpenses.plus(sharedExpensesRepPortion)
      distributableAmount = distributableAmount.minus(totalExpenseDeduction)

      // =====================================================
      // DAMGA VERGİSİ VE HAKEM HEYETİ DÜŞÜMÜ
      // Karşı taraf (client) ödüyorsa dağıtılabilirden düşülür
      // =====================================================
      const stampDutyClientDeducted = new Decimal((project as any).stamp_duty_client_deducted || 0)
      const refereeClientDeducted = new Decimal((project as any).referee_client_deducted || 0)
      const totalStampRefereeDeduction = stampDutyClientDeducted.plus(refereeClientDeducted)
      distributableAmount = distributableAmount.minus(totalStampRefereeDeduction)

      // Negatife düşmemesi için
      if (distributableAmount.isNegative()) {
        distributableAmount = new Decimal(0)
      }

      // Referans için tüm komisyonların toplamı
      const totalCommission = (commissions || []).reduce((sum: Decimal, comm: any) =>
        sum.plus(new Decimal(comm.amount || 0)), new Decimal(0)
      )

      const netAmount = totalGross.minus(totalVAT)

      // Get all manual allocations for this project
      const { data: allocations, error: allocationsError } = await supabase
        .from('manual_balance_allocations')
        .select('user_id, personnel_id, amount')
        .eq('project_id', projectId)

      if (allocationsError) {
        return apiResponse.error('Failed to fetch allocations', allocationsError.message, 500)
      }

      // Calculate total allocated per person (user or personnel)
      const allocationsByPerson = (allocations || []).reduce((acc: Record<string, Decimal>, alloc: any) => {
        const personId = alloc.user_id || alloc.personnel_id
        if (!personId) return acc

        if (!acc[personId]) {
          acc[personId] = new Decimal(0)
        }
        acc[personId] = acc[personId].plus(new Decimal(alloc.amount))
        return acc
      }, {})

      const totalAllocated = Object.values(allocationsByPerson).reduce(
        (sum: Decimal, amt: Decimal) => sum.plus(amt),
        new Decimal(0)
      )

      // Get user and personnel balances
      const userIds = (representatives || []).filter((rep: any) => rep.user_id).map((rep: any) => rep.user_id)
      const personnelIds = (representatives || []).filter((rep: any) => rep.personnel_id).map((rep: any) => rep.personnel_id)

      const { data: userBalances, error: userBalancesError } = await supabase
        .from('balances')
        .select('user_id, available_amount')
        .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

      const { data: personnelBalances, error: personnelBalancesError } = await supabase
        .from('balances')
        .select('personnel_id, available_amount')
        .in('personnel_id', personnelIds.length > 0 ? personnelIds : ['00000000-0000-0000-0000-000000000000'])

      const balancesByUser = (userBalances || []).reduce((acc: Record<string, number>, bal: any) => {
        acc[bal.user_id] = bal.available_amount || 0
        return acc
      }, {})

      const balancesByPersonnel = (personnelBalances || []).reduce((acc: Record<string, number>, bal: any) => {
        acc[bal.personnel_id] = bal.available_amount || 0
        return acc
      }, {})

      // Combine all data
      const teamMembers = (representatives || []).map((rep: any) => {
        const personId = rep.user_id || rep.personnel_id
        const personData = rep.user || rep.personnel

        // Get current balance based on person type
        let currentBalance = 0
        if (rep.user_id) {
          currentBalance = balancesByUser[rep.user_id] || 0
        } else if (rep.personnel_id) {
          currentBalance = balancesByPersonnel[rep.personnel_id] || 0
        }

        return {
          id: rep.id,
          user_id: rep.user_id,
          personnel_id: rep.personnel_id,
          person_type: rep.user_id ? 'user' : 'personnel',
          person_name: personData?.full_name || 'Unknown',
          person_email: personData?.email || '',
          role: rep.role,
          allocated_amount: allocationsByPerson[personId]?.toNumber() || 0,
          current_balance: currentBalance,
        }
      })

      return apiResponse.success({
        project: {
          id: (project as any).id,
          code: (project as any).code,
          name: (project as any).name,
        },
        financial_summary: {
          // Tüm gelirler (bilgi amaçlı)
          total_gross: totalGross.toNumber(),
          total_vat: totalVAT.toNumber(),
          net_amount: netAmount.toNumber(),
          total_commission: totalCommission.toNumber(),
          // Tahsil edilen bazlı (asıl hesaplama)
          total_collected: totalCollected.toNumber(),
          collected_vat: collectedVAT.toNumber(),
          collected_net: collectedNet.toNumber(),
          collected_commission: collectedCommission.toNumber(),
          // Giderler
          client_expenses: clientExpenses.toNumber(),
          shared_expenses: sharedExpenses.toNumber(),
          shared_expenses_rep_portion: sharedExpensesRepPortion.toNumber(),
          total_expense_deduction: totalExpenseDeduction.toNumber(),
          // Damga vergisi ve hakem heyeti (karşı taraf ödüyorsa)
          stamp_duty_client_deducted: stampDutyClientDeducted.toNumber(),
          referee_client_deducted: refereeClientDeducted.toNumber(),
          total_stamp_referee_deduction: totalStampRefereeDeduction.toNumber(),
          // Dağıtılabilir (tahsil edilenden - giderler)
          distributable_amount: distributableAmount.toNumber(),
          total_allocated: totalAllocated.toNumber(),
          remaining_amount: distributableAmount.minus(totalAllocated).toNumber(),
        },
        team_members: teamMembers,
      })
    } catch (error: any) {
      console.error('GET /api/balances/manual-allocation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST: Create manual allocation
export async function POST(request: NextRequest) {
  return withManager(request, async (req, ctx) => {
    try {
      const body = await request.json()
      const validation = allocationSchema.safeParse(body)

      if (!validation.success) {
        return apiResponse.validationError(
          validation.error.errors.map(e => e.message)
        )
      }

      const { project_id, user_id, personnel_id, amount, notes } = validation.data
      const { supabase, user } = ctx

      // Verify project exists
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id, code, name')
        .eq('id', project_id)
        .single()

      if (projectError || !project) {
        return apiResponse.error('Project not found', 'Project does not exist', 404)
      }

      // Verify user or personnel is a representative of this project
      let representativeQuery = supabase
        .from('project_representatives')
        .select('id')
        .eq('project_id', project_id)

      if (user_id) {
        representativeQuery = representativeQuery.eq('user_id', user_id)
      } else if (personnel_id) {
        representativeQuery = representativeQuery.eq('personnel_id', personnel_id)
      }

      const { data: representative, error: repError } = await representativeQuery.single()

      if (repError || !representative) {
        return apiResponse.error(
          'Invalid person',
          'This person is not a representative of this project',
          400
        )
      }

      // Create manual allocation (trigger will validate against project budget)
      const { data: allocation, error: allocationError } = await (supabase as any)
        .from('manual_balance_allocations')
        .insert({
          project_id,
          user_id: user_id || null,
          personnel_id: personnel_id || null,
          amount,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (allocationError) {
        // Check if it's the budget validation error
        if (allocationError.message.includes('dağıtılabilir tutarını')) {
          return apiResponse.error(
            'Allocation exceeds budget',
            allocationError.message,
            400
          )
        }
        return apiResponse.error('Failed to create allocation', allocationError.message, 500)
      }

      // Update balance (for both users and personnel)
      const { error: balanceError } = await (supabase as any).rpc('update_balance', {
        p_type: 'income',
        p_amount: amount,
        p_user_id: user_id || null,
        p_personnel_id: personnel_id || null,
        p_reference_type: 'manual_allocation',
        p_reference_id: allocation.id,
        p_description: `Manuel bakiye dağıtımı: ${(project as any).code} - ${(project as any).name}${notes ? ` (${notes})` : ''}`,
      })

      if (balanceError) {
        console.error('Balance update error:', balanceError)
        // Rollback allocation
        await supabase
          .from('manual_balance_allocations')
          .delete()
          .eq('id', allocation.id)

        return apiResponse.error('Failed to update balance', balanceError.message, 500)
      }

      // Create audit log
      await (supabase as any).rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: 'CREATE',
        p_entity_type: 'manual_balance_allocation',
        p_entity_id: allocation.id,
        p_new_values: {
          project_id,
          user_id,
          personnel_id,
          amount,
          notes,
        },
      })

      return apiResponse.success(
        { allocation },
        amount > 0
          ? `Başarıyla ${Math.abs(amount).toLocaleString('tr-TR')} ₺ bakiye eklendi`
          : `Başarıyla ${Math.abs(amount).toLocaleString('tr-TR')} ₺ bakiye düşüldü`
      )
    } catch (error: any) {
      console.error('POST /api/balances/manual-allocation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
