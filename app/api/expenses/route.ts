import { NextRequest } from 'next/server'
import { createExpenseSchema, expenseQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/expenses - List expenses with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, expenseQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { project_id, start_date, end_date, created_by, page = 1, limit = 10000, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('expenses')
        .select(`
          *,
          project:projects(id, name, code),
          created_by_user:users!created_by(full_name)
        `, { count: 'exact' })

      // Apply filters
      if (project_id) {
        query = query.eq('project_id', project_id)
      }

      if (start_date) {
        query = query.gte('expense_date', start_date)
      }

      if (end_date) {
        query = query.lte('expense_date', end_date)
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: expenses, error, count } = await query

      if (error) {
        console.error('Expenses fetch error:', error)
        return apiResponse.error('Failed to fetch expenses', error.message, 500)
      }

      return apiResponse.success({
        expenses,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Expenses API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/expenses - Create new expense
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can create expenses
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create expenses')
    }

    // Validate request data
    const validation = await validateRequest(request, createExpenseSchema)
    if ('error' in validation) {
      return validation.error
    }

    const {
      expense_type = 'proje',
      project_id,
      amount,
      description,
      expense_date,
      is_tto_expense = true,
      expense_share_type = 'client'
    } = validation.data

    try {
      // Genel gider için proje kontrolü
      if (expense_type === 'genel' && project_id) {
        return apiResponse.error('Genel gider proje ile ilişkilendirilemez', undefined, 400)
      }

      // Proje gideri için proje kontrolü
      if (expense_type === 'proje' && !project_id) {
        return apiResponse.error('Proje gideri için proje seçimi zorunludur', undefined, 400)
      }

      // Proje seçilmişse varlığını ve durumunu kontrol et
      let project = null
      if (project_id) {
        const { data, error: projectError } = await ctx.supabase
          .from('projects')
          .select('id, code, name, company_rate, status')
          .eq('id', project_id)
          .single()

        if (projectError) {
          if (projectError.code === 'PGRST116') {
            return apiResponse.notFound('Proje bulunamadı')
          }
          return apiResponse.error('Proje kontrolü başarısız', projectError.message, 500)
        }
        project = data

        // İptal edilmiş projeye gider eklenemez
        if ((project as any).status === 'cancelled') {
          return apiResponse.error(
            'Proje iptal edilmiş',
            'İptal edilmiş projeye gider kaydı eklenemez',
            400
          )
        }
      }

      // Create expense
      const { data: expense, error: expenseError } = await (ctx.supabase as any)
        .from('expenses')
        .insert({
          expense_type,
          project_id: expense_type === 'genel' ? null : project_id,
          amount,
          description,
          expense_date: expense_date || new Date().toISOString().split('T')[0],
          is_tto_expense: expense_type === 'genel' ? true : is_tto_expense,
          expense_share_type: expense_type === 'genel' || is_tto_expense ? null : expense_share_type,
          created_by: ctx.user.id
        })
        .select(`
          *,
          project:projects(id, name, code, company_rate),
          created_by_user:users!created_by(full_name)
        `)
        .single()

      if (expenseError) {
        console.error('Expense creation error:', expenseError)
        return apiResponse.error('Gider oluşturulamadı', expenseError.message, 500)
      }

      // Create audit log
      await (ctx.supabase as any).rpc('create_audit_log', {
        p_user_id: ctx.user.id,
        p_action: 'CREATE',
        p_entity_type: 'expense',
        p_entity_id: expense.id,
        p_new_values: {
          expense_type,
          project_id: expense_type === 'genel' ? null : project_id,
          amount,
          description,
          is_tto_expense: expense_type === 'genel' ? true : is_tto_expense,
          expense_date: expense_date || new Date().toISOString().split('T')[0]
        }
      })

      // Mesaj oluştur
      let successMessage = ''
      if (expense_type === 'genel') {
        successMessage = `₺${amount.toLocaleString('tr-TR')} tutarında genel gider oluşturuldu`
      } else if (is_tto_expense) {
        const ttoAmount = amount * ((project as any)?.company_rate || 15) / 100
        successMessage = `₺${amount.toLocaleString('tr-TR')} tutarında TTO gideri oluşturuldu (TTO payı: ₺${ttoAmount.toLocaleString('tr-TR')})`
      } else if (expense_share_type === 'shared') {
        const companyRate = (project as any)?.company_rate || 15
        const ttoAmount = amount * companyRate / 100
        const repAmount = amount * (100 - companyRate) / 100
        successMessage = `₺${amount.toLocaleString('tr-TR')} tutarında ortak gider oluşturuldu (TTO: ₺${ttoAmount.toLocaleString('tr-TR')}, Temsilciler: ₺${repAmount.toLocaleString('tr-TR')})`
      } else {
        successMessage = `₺${amount.toLocaleString('tr-TR')} tutarında karşı taraf gideri oluşturuldu (dağıtılabilir miktardan düşülecek)`
      }

      return apiResponse.success(
        { expense },
        successMessage
      )
    } catch (error: any) {
      console.error('Expense creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
