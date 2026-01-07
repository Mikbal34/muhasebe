import { NextRequest } from 'next/server'
import { createIncomeSchema, incomeQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/incomes - List incomes with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, incomeQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { project_id, start_date, end_date, created_by, page = 1, limit = 20, sort = 'income_date', order = 'asc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('incomes')
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!incomes_created_by_fkey(full_name),
          distributions:income_distributions(
            id,
            amount,
            user_id,
            personnel_id,
            user:users(id, full_name, email),
            personnel:personnel(id, full_name, email)
          )
        `)



      // Apply filters
      if (project_id) {
        query = query.eq('project_id', project_id)
      }

      if (start_date) {
        query = query.gte('income_date', start_date)
      }

      if (end_date) {
        query = query.lte('income_date', end_date)
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: incomes, error, count } = await query

      if (error) {
        console.error('Incomes fetch error:', error)
        return apiResponse.error('Failed to fetch incomes', error.message, 500)
      }

      return apiResponse.success({
        incomes,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Incomes API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/incomes - Create new income
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can create incomes
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create incomes')
    }

    // Validate request data
    const validation = await validateRequest(request, createIncomeSchema)
    if ('error' in validation) {
      return validation.error
    }

    const {
      project_id,
      gross_amount,
      vat_rate = 18,
      description,
      income_date,
      is_fsmh_income = false,
      income_type = 'ozel',
      is_tto_income = true
    } = validation.data

    try {
      // Check if project exists and get representatives
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select(`
          id, name, code, status, budget, company_rate, vat_rate,
          has_withholding_tax, withholding_tax_rate,
          sent_to_referee, referee_approved, remaining_budget,
          total_commission_due, total_commission_collected,
          representatives:project_representatives(
            id, user_id, personnel_id, role,
            user:users(id, full_name, email),
            personnel:personnel(id, full_name, email)
          )
        `)
        .eq('id', project_id)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return apiResponse.notFound('Project not found')
        }
        return apiResponse.error('Failed to check project', projectError.message, 500)
      }

      if ((project as any).status === 'cancelled') {
        return apiResponse.error('Proje iptal edilmiş', 'İptal edilmiş projeye gelir kaydı eklenemez', 400)
      }

      if ((project as any).status === 'completed') {
        return apiResponse.error('Proje tamamlanmış', 'Tamamlanmış projeye gelir kaydı eklenemez', 400)
      }

      // Check referee approval
      if (!(project as any).referee_approved) {
        return apiResponse.error(
          'Hakem onayı gerekli',
          'Bu proje hakem heyeti onayı almamış. Gelir kaydı yapabilmek için önce projeyi düzenleyip hakem onayını işaretleyin.',
          400
        )
      }

      // Check total incomes don't exceed budget
      const { data: existingIncomes, error: incomesError } = await ctx.supabase
        .from('incomes')
        .select('gross_amount')
        .eq('project_id', project_id)

      if (incomesError) {
        return apiResponse.error('Failed to check existing incomes', incomesError.message, 500)
      }

      const totalExistingIncomes = existingIncomes?.reduce((sum, income: any) => sum + income.gross_amount, 0) || 0
      const totalWithNewIncome = totalExistingIncomes + gross_amount

      if (totalWithNewIncome > (project as any).budget) {
        return apiResponse.error(
          'Bütçe Aşımı',
          `Bu gelir kaydı proje bütçesini aşıyor. Proje bütçesi: ₺${(project as any).budget.toLocaleString('tr-TR')}, Mevcut gelirler: ₺${totalExistingIncomes.toLocaleString('tr-TR')}, Eklenmeye çalışılan: ₺${gross_amount.toLocaleString('tr-TR')}`,
          400
        )
      }

      // TTO Geliri Kontrolü: TTO dışı gelir olarak işaretlenmek isteniyorsa
      // kalan bütçe, kalan komisyon alacağını karşılayabilmeli
      if (!is_tto_income) {
        const currentRemainingBudget = (project as any).remaining_budget ?? (project as any).budget
        const newRemainingBudget = currentRemainingBudget - gross_amount
        const totalCommissionDue = (project as any).total_commission_due ?? 0
        const totalCommissionCollected = (project as any).total_commission_collected ?? 0
        const remainingCommission = totalCommissionDue - totalCommissionCollected

        if (newRemainingBudget < remainingCommission) {
          return apiResponse.error(
            'TTO Geliri Olarak İşaretlenmeli',
            `Bu gelir TTO geliri olarak işaretlenmelidir. Kalan bütçe (₺${newRemainingBudget.toLocaleString('tr-TR')}) komisyon alacağını (₺${remainingCommission.toLocaleString('tr-TR')}) karşılayamıyor. Komisyon hiçbir zaman ödenmemiş bırakılamaz.`,
            400
          )
        }
      }

      // Use user's provided VAT rate (don't override with project default)
      const finalVatRate = vat_rate

      // Tevkifat tutarını hesapla (varsa)
      // Formula: Tam KDV = Brüt × KDV Oranı / (100 + KDV Oranı) - Türk KDV sistemi (brüt KDV dahil)
      //          Tevkifat = Tam KDV × Tevkifat Oranı / 100
      // NOT: vat_amount ve net_amount trigger'da hesaplanacak
      let withholding_tax_amount = 0
      if ((project as any).has_withholding_tax && (project as any).withholding_tax_rate > 0) {
        const fullVatAmount = gross_amount * finalVatRate / (100 + finalVatRate)
        withholding_tax_amount = fullVatAmount * (project as any).withholding_tax_rate / 100
      }

      // Let the database trigger handle most calculations
      // We only calculate withholding tax here

      // Açıklama boşsa, mevcut gelir sayısına göre otomatik oluştur
      let finalDescription = description
      if (!finalDescription || !finalDescription.trim()) {
        const incomeCount = existingIncomes?.length || 0
        finalDescription = `Taksit ${incomeCount + 1}`
      }

      // Create income record (trigger will calculate other amounts)
      const { data: income, error: incomeError } = await (ctx.supabase as any)
        .from('incomes')
        .insert({
          project_id,
          gross_amount,
          vat_rate: finalVatRate, // Use user's provided VAT rate
          description: finalDescription,
          income_date,
          is_fsmh_income,
          income_type,
          is_tto_income,
          withholding_tax_amount,
          created_by: ctx.user.id
        })
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!incomes_created_by_fkey(full_name)
        `)
        .single()

      if (incomeError) {
        console.error('Income creation error:', incomeError)
        return apiResponse.error('Failed to create income', incomeError.message, 500)
      }

      // Tüm taksit açıklamalarını güncelle (X/Y formatında)
      const { data: allIncomes } = await ctx.supabase
        .from('incomes')
        .select('id, description')
        .eq('project_id', project_id)
        .order('income_date', { ascending: true })

      if (allIncomes && allIncomes.length > 0) {
        const totalCount = allIncomes.length
        for (let i = 0; i < allIncomes.length; i++) {
          const inc = allIncomes[i]
          // Sadece "Taksit X" veya "Taksit X/Y" formatındaki açıklamaları güncelle
          if (inc.description?.match(/^Taksit \d+/)) {
            await ctx.supabase
              .from('incomes')
              .update({ description: `Taksit ${i + 1}/${totalCount}` })
              .eq('id', inc.id)
          }
        }
      }

      // NOTE: No automatic distribution anymore
      // Balances will be allocated manually via the manual allocation page

      // Create notifications for project leader only (not all representatives)
      // Only send notification if project leader is a user (not personnel)
      const projectLeader = (project as any).representatives.find((rep: any) => rep.role === 'project_leader')
      if (projectLeader && projectLeader.user_id) {
        await (ctx.supabase as any).rpc('create_notification', {
          p_user_id: projectLeader.user_id,
          p_type: 'info',
          p_title: 'Yeni Gelir Kaydı',
          p_message: `${(project as any).name} projesi için ₺${(income as any).gross_amount.toLocaleString('tr-TR')} brüt gelir kaydedildi. Ekip üyelerine bakiye dağıtımını yapabilirsiniz.`,
          p_auto_hide: true,
          p_duration: 10000,
          p_action_label: 'Bakiye Dağıt',
          p_action_url: '/dashboard/balances/allocate',
          p_reference_type: 'income',
          p_reference_id: (income as any).id
        })
      }

      // Notify the creator (admin/manager)
      await (ctx.supabase as any).rpc('create_notification', {
        p_user_id: ctx.user.id,
        p_type: 'success',
        p_title: 'Gelir Kaydı Oluşturuldu',
        p_message: `${(project as any).name} projesi için ₺${(income as any).gross_amount.toLocaleString('tr-TR')} brüt gelir kaydı oluşturuldu. Ekip üyelerine manuel bakiye dağıtımı yapabilirsiniz.`,
        p_auto_hide: true,
        p_duration: 10000,
        p_action_label: 'Bakiye Dağıt',
        p_action_url: '/dashboard/balances/allocate',
        p_reference_type: 'income',
        p_reference_id: (income as any).id
      })

      return apiResponse.success(
        { income },
        'Income created successfully'
      )
    } catch (error: any) {
      console.error('Income creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}