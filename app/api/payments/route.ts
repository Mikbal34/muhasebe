import { NextRequest } from 'next/server'
import { createPaymentInstructionSchema, paymentQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/payments - List payment instructions with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, paymentQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { status, user_id, start_date, end_date, page = 1, limit = 10000, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('payment_instructions')
        .select(`
          *,
          user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
          personnel:personnel!payment_instructions_personnel_id_fkey(id, full_name, email, iban),
          created_by_user:users!payment_instructions_created_by_fkey(full_name),
          items:payment_instruction_items(
            id,
            amount,
            description,
            income_distribution:income_distributions(
              id,
              amount,
              income:incomes(
                id,
                description,
                project:projects(id, name, code)
              )
            )
          )
        `)



      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      if (start_date) {
        query = query.gte('created_at', start_date)
      }

      if (end_date) {
        query = query.lte('created_at', end_date)
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: payments, error, count } = await query

      if (error) {
        console.error('Payment instructions fetch error:', error)
        return apiResponse.error('Failed to fetch payment instructions', error.message, 500)
      }

      return apiResponse.success({
        payments,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Payment instructions API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/payments - Create new payment instruction
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {


    // Only admins and managers can create payments
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create payments')
    }

    // Validate request data
    const validation = await validateRequest(request, createPaymentInstructionSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { user_id, personnel_id, total_amount, status = 'pending', notes, items } = validation.data

    try {
      // Check if user or personnel exists and get balance info
      let person: any = null
      let personType: 'user' | 'personnel' = user_id ? 'user' : 'personnel'
      let personId = user_id || personnel_id

      if (user_id) {
        const { data: userData, error: userError } = await ctx.supabase
          .from('users')
          .select(`
            id, full_name, email, iban, is_active,
            balance:balances!balances_user_id_fkey(id, available_amount, debt_amount, reserved_amount)
          `)
          .eq('id', user_id)
          .single()

        if (userError) {
          if (userError.code === 'PGRST116') {
            return apiResponse.notFound('User not found')
          }
          return apiResponse.error('Failed to check user', userError.message, 500)
        }

        if (!userData.is_active) {
          return apiResponse.error('Invalid user', 'Cannot create payment instruction for inactive user', 400)
        }

        person = userData
      } else if (personnel_id) {
        const { data: personnelData, error: personnelError } = await ctx.supabase
          .from('personnel')
          .select(`
            id, full_name, email, iban, is_active,
            balance:balances!balances_personnel_id_fkey(id, available_amount, debt_amount, reserved_amount)
          `)
          .eq('id', personnel_id)
          .single()

        if (personnelError) {
          if (personnelError.code === 'PGRST116') {
            return apiResponse.notFound('Personnel not found')
          }
          return apiResponse.error('Failed to check personnel', personnelError.message, 500)
        }

        if (!personnelData.is_active) {
          return apiResponse.error('Invalid personnel', 'Cannot create payment instruction for inactive personnel', 400)
        }

        person = personnelData
      }

      if (!person.iban) {
        return apiResponse.error('Invalid recipient', `${personType === 'user' ? 'User' : 'Personnel'} must have an IBAN to receive payments`, 400)
      }

      // Get balance info (balance might be an array from Supabase join)
      const balanceData = person.balance
      const balance = Array.isArray(balanceData) ? balanceData[0] : balanceData
      if (!balance) {
        return apiResponse.error('No balance found', 'Alıcının bakiye kaydı bulunamadı', 400)
      }

      // Check for debt
      if ((balance.debt_amount || 0) > 0) {
        return apiResponse.error('Outstanding debt', `Alıcının ₺${(balance.debt_amount || 0).toLocaleString('tr-TR')} tutarında borcu var. Önce borç ödenmelidir.`, 400)
      }

      // Check sufficient balance
      const availableAmount = balance.available_amount || 0
      if (total_amount > availableAmount) {
        return apiResponse.error('Insufficient balance', `Yetersiz bakiye. Mevcut: ₺${availableAmount.toLocaleString('tr-TR')}, İstenen: ₺${total_amount.toLocaleString('tr-TR')}`, 400)
      }

      // Verify that all income_distribution_ids exist and belong to the person
      for (const item of items) {
        if (item.income_distribution_id) {
          let distributionQuery = ctx.supabase
            .from('income_distributions')
            .select(`
              id, amount,
              income:incomes(
                id,
                project:projects(
                  representatives:project_representatives!inner(user_id, personnel_id)
                )
              )
            `)
            .eq('id', item.income_distribution_id)

          // Filter by user_id or personnel_id
          if (user_id) {
            distributionQuery = distributionQuery.eq('income.project.representatives.user_id', user_id)
          } else if (personnel_id) {
            distributionQuery = distributionQuery.eq('income.project.representatives.personnel_id', personnel_id)
          }

          const { data: distribution, error: distError } = await distributionQuery.single()

          if (distError || !distribution) {
            return apiResponse.error('Invalid income distribution', `Income distribution ${item.income_distribution_id} not found or not accessible by ${personType}`, 400)
          }

          // Check if the item amount doesn't exceed the distribution amount
          if (item.amount > (distribution as any).amount) {
            return apiResponse.error('Invalid amount', `Payment amount cannot exceed distribution amount (${(distribution as any).amount})`, 400)
          }
        }
      }

      // Validate total amount matches sum of items
      const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0)
      if (Math.abs(itemsTotal - total_amount) > 0.01) {
        return apiResponse.error('Invalid total amount', 'Total amount must equal sum of item amounts', 400)
      }

      // Create payment instruction
      const { data: payment, error: paymentError } = await (ctx.supabase as any)
        .from('payment_instructions')
        .insert({
          user_id: user_id || null,
          personnel_id: personnel_id || null,
          recipient_personnel_id: personnel_id || null,
          total_amount,
          status,
          notes,
          created_by: ctx.user.id
        })
        .select()
        .single()

      if (paymentError) {
        console.error('Payment instruction creation error:', paymentError)
        return apiResponse.error('Failed to create payment instruction', paymentError.message, 500)
      }

      // Create payment instruction items
      const itemsData = items.map(item => ({
        instruction_id: payment.id,
        income_distribution_id: item.income_distribution_id,
        amount: item.amount,
        description: item.description
      }))

      const { error: itemsError } = await (ctx.supabase as any)
        .from('payment_instruction_items')
        .insert(itemsData)

      if (itemsError) {
        // Rollback: delete the created payment instruction
        await ctx.supabase.from('payment_instructions').delete().eq('id', payment.id)
        console.error('Payment items creation error:', itemsError)
        return apiResponse.error('Failed to create payment items', itemsError.message, 500)
      }

      // Reserve the amount in balance (move from available to reserved)
      const { error: balanceError } = await ctx.supabase
        .from('balances')
        .update({
          available_amount: (balance.available_amount || 0) - total_amount,
          reserved_amount: (balance.reserved_amount || 0) + total_amount,
          last_updated: new Date().toISOString()
        })
        .eq(personType === 'user' ? 'user_id' : 'personnel_id', personId)

      if (balanceError) {
        // Rollback: delete payment items and payment instruction
        await ctx.supabase.from('payment_instruction_items').delete().eq('instruction_id', payment.id)
        await ctx.supabase.from('payment_instructions').delete().eq('id', payment.id)
        console.error('Balance reservation error:', balanceError)
        return apiResponse.error('Failed to reserve balance', balanceError.message, 500)
      }

      // Fetch complete payment instruction
      const { data: completePayment, error: fetchError } = await ctx.supabase
        .from('payment_instructions')
        .select(`
          *,
          user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
          personnel:personnel!payment_instructions_personnel_id_fkey(id, full_name, email, iban),
          created_by_user:users!payment_instructions_created_by_fkey(full_name),
          items:payment_instruction_items(
            id,
            amount,
            description,
            income_distribution:income_distributions(
              id,
              amount,
              income:incomes(
                id,
                description,
                project:projects(id, name, code)
              )
            )
          )
        `)
        .eq('id', payment.id)
        .single()

      if (fetchError) {
        console.error('Payment fetch error:', fetchError)
        return apiResponse.error('Payment instruction created but failed to fetch details', fetchError.message, 500)
      }

      // Create notification (only for users, personnel don't have login accounts)
      if (user_id) {
        await (ctx.supabase as any).rpc('create_notification', {
          p_user_id: user_id,
          p_type: 'info',
          p_title: 'Yeni Ödeme Talimatı',
          p_message: `₺${total_amount.toLocaleString('tr-TR')} tutarında yeni ödeme talimatı oluşturuldu.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/payments',
          p_reference_type: 'payment_instruction',
          p_reference_id: (payment as any).id
        })
      }

      return apiResponse.success(
        { payment: completePayment },
        'Payment instruction created successfully'
      )
    } catch (error: any) {
      console.error('Payment instruction creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// Helper function for academician payment requests
async function createAcademicianPaymentRequest(request: NextRequest, ctx: any) {
  try {
    const body = await request.json()
    const { amount, notes } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return apiResponse.error('Valid amount is required', undefined, 400)
    }

    // Get user's balance info
    const { data: user, error: userError } = await ctx.supabase
      .from('users')
      .select(`
        id, full_name, email, iban, is_active,
        balance:balances(id, available_amount, debt_amount, reserved_amount)
      `)
      .eq('id', ctx.user.id)
      .single()

    if (userError) {
      return apiResponse.error('Failed to check user balance', userError.message, 500)
    }

    if (!user.is_active) {
      return apiResponse.error('Account disabled', 'Your account has been disabled', 403)
    }

    if (!user.iban) {
      return apiResponse.error('IBAN required', 'Please update your IBAN information in profile settings', 400)
    }

    // Balance is an object, not an array in this query
    const balance = user.balance


    if (!balance) {
      return apiResponse.error('No balance found', 'You do not have a balance record', 400)
    }

    // Check for debt
    if (balance.debt_amount > 0) {
      return apiResponse.error('Outstanding debt', `You have outstanding debt of ₺${balance.debt_amount.toLocaleString('tr-TR')}. Please settle your debt first.`, 400)
    }

    // Check sufficient balance
    if (amount > balance.available_amount) {
      return apiResponse.error('Insufficient balance', `Insufficient balance. Available: ${balance.available_amount}, Requested: ${amount}`, 400)
    }

    // Reserve the amount in balance (move from available to reserved)
    const { error: reserveError } = await ctx.supabase
      .from('balances')
      .update({
        available_amount: balance.available_amount - amount,
        reserved_amount: balance.reserved_amount + amount,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', ctx.user.id)

    if (reserveError) {
      console.error('Balance reservation error:', reserveError)
      return apiResponse.error('Failed to reserve balance', reserveError.message, 500)
    }

    // Create payment instruction
    const { data: payment, error: paymentError } = await ctx.supabase
      .from('payment_instructions')
      .insert({
        user_id: ctx.user.id,
        total_amount: amount,
        status: 'pending',
        notes: notes || `Payment request of ₺${amount.toLocaleString('tr-TR')}`,
        created_by: ctx.user.id
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      // Rollback balance reservation
      await ctx.supabase
        .from('balances')
        .update({
          available_amount: balance.available_amount,
          reserved_amount: balance.reserved_amount,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', ctx.user.id)

      return apiResponse.error('Failed to create payment request', paymentError.message, 500)
    }

    // Create a simple payment item
    const { error: itemError } = await ctx.supabase
      .from('payment_instruction_items')
      .insert({
        instruction_id: payment.id,
        amount: amount,
        description: notes || 'Balance withdrawal request'
      })

    if (itemError) {
      // Rollback: delete the created payment instruction and restore balance
      await ctx.supabase.from('payment_instructions').delete().eq('id', payment.id)
      await ctx.supabase
        .from('balances')
        .update({
          available_amount: balance.available_amount,
          reserved_amount: balance.reserved_amount,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', ctx.user.id)

      console.error('Payment item creation error:', itemError)
      return apiResponse.error('Failed to create payment item', itemError.message, 500)
    }

    // Fetch complete payment instruction
    const { data: completePayment, error: fetchError } = await ctx.supabase
      .from('payment_instructions')
      .select(`
        *,
        user:users!payment_instructions_user_id_fkey(id, full_name, email, iban),
        created_by_user:users!payment_instructions_created_by_fkey(full_name),
        items:payment_instruction_items(
          id,
          amount,
          description
        )
      `)
      .eq('id', payment.id)
      .single()

    if (fetchError) {
      console.error('Payment fetch error:', fetchError)
      return apiResponse.error('Payment request created but failed to fetch details', fetchError.message, 500)
    }

    // Create notification for the user
    await ctx.supabase.rpc('create_notification', {
      p_user_id: ctx.user.id,
      p_type: 'info',
      p_title: 'Ödeme Talebi Oluşturuldu',
      p_message: `₺${amount.toLocaleString('tr-TR')} tutarındaki ödeme talebiniz oluşturuldu ve onay bekliyor.`,
      p_auto_hide: true,
      p_duration: 8000,
      p_action_label: 'Görüntüle',
      p_action_url: '/dashboard/payments',
      p_reference_type: 'payment_instruction',
      p_reference_id: payment.id
    })

    return apiResponse.success(
      { payment: completePayment },
      'Payment request created successfully'
    )
  } catch (error: any) {
    console.error('Academician payment request error:', error)
    return apiResponse.error('Internal server error', error.message, 500)
  }
}