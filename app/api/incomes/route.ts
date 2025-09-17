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

    const { project_id, start_date, end_date, created_by, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = queryValidation.data

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
            share_percentage,
            user:users(id, full_name, email)
          )
        `)

      // Apply filters based on user role
      if (ctx.user.role === 'academician') {
        // Academicians can only see incomes from projects they're representatives of
        const { data: representativeProjects } = await ctx.supabase
          .from('project_representatives')
          .select('project_id')
          .eq('user_id', ctx.user.id)

        if (representativeProjects && representativeProjects.length > 0) {
          const projectIds = representativeProjects.map((p: any) => p.project_id)
          query = query.in('project_id', projectIds)
        } else {
          // No projects, return empty result
          return apiResponse.success({
            incomes: [],
            pagination: { page, limit, total: 0, pages: 0 }
          })
        }
      }

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
    // Only admins and finance officers can create incomes
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can create incomes')
    }

    // Validate request data
    const validation = await validateRequest(request, createIncomeSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { project_id, gross_amount, vat_rate = 18, description, income_date } = validation.data

    try {
      // Check if project exists and get representatives
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select(`
          id, name, code, status, budget, company_rate, vat_rate,
          representatives:project_representatives(
            id, user_id, share_percentage,
            user:users(id, full_name, email)
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

      if ((project as any).status !== 'active') {
        return apiResponse.error('Invalid project', 'Cannot add income to inactive project', 400)
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

      // Use user's provided VAT rate (don't override with project default)
      const finalVatRate = vat_rate

      // Let the database trigger handle ALL calculations
      // We don't calculate here to avoid conflicts

      // Create income record (trigger will calculate amounts)
      const { data: income, error: incomeError } = await (ctx.supabase as any)
        .from('incomes')
        .insert({
          project_id,
          gross_amount,
          vat_rate: finalVatRate, // Use user's provided VAT rate
          description,
          income_date,
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

      // The trigger should create income_distributions automatically
      // Let's fetch the complete income with distributions
      const { data: completeIncome, error: fetchError } = await ctx.supabase
        .from('incomes')
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!incomes_created_by_fkey(full_name),
          distributions:income_distributions(
            id,
            amount,
            share_percentage,
            user:users(id, full_name, email)
          )
        `)
        .eq('id', income.id)
        .single()

      if (fetchError) {
        console.error('Income fetch error:', fetchError)
        return apiResponse.error('Income created but failed to fetch details', fetchError.message, 500)
      }

      // Create notifications for all project representatives
      for (const rep of (project as any).representatives) {
        await (ctx.supabase as any).rpc('create_notification', {
          p_user_id: rep.user_id,
          p_type: 'success',
          p_title: 'Yeni Gelir Kaydı',
          p_message: `${(project as any).name} projesi için ₺${(completeIncome as any).net_amount.toLocaleString('tr-TR')} net gelir dağıtımı yapıldı.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/incomes',
          p_reference_type: 'income',
          p_reference_id: (income as any).id
        })
      }

      // Also notify the creator (admin/finance officer) if not already a representative
      const creatorIsRepresentative = (project as any).representatives.some((rep: any) => rep.user_id === ctx.user.id)
      if (!creatorIsRepresentative) {
        await (ctx.supabase as any).rpc('create_notification', {
          p_user_id: ctx.user.id,
          p_type: 'success',
          p_title: 'Gelir Kaydı Oluşturuldu',
          p_message: `${(project as any).name} projesi için ₺${(completeIncome as any).gross_amount.toLocaleString('tr-TR')} brüt, ₺${(completeIncome as any).net_amount.toLocaleString('tr-TR')} net gelir kaydı oluşturuldu.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/incomes',
          p_reference_type: 'income',
          p_reference_id: (income as any).id
        })
      }

      return apiResponse.success(
        { income: completeIncome },
        'Income created successfully'
      )
    } catch (error: any) {
      console.error('Income creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}