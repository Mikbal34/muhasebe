import { NextRequest } from 'next/server'
import { createReportSchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, withAuth } from '@/lib/middleware/auth'

// GET /api/reports - List generated reports
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and finance officers can access reports
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can access reports')
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const type = searchParams.get('type')

    try {
      let query = ctx.supabase
        .from('reports')
        .select(`
          *,
          generated_by_user:users!reports_generated_by_fkey(full_name, email),
          exports:report_exports(id, format, file_size, created_at)
        `)

      if (type) {
        query = query.eq('type', type)
      }

      query = query
        .order('generated_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      const { data: reports, error, count } = await query

      if (error) {
        console.error('Reports fetch error:', error)
        return apiResponse.error('Failed to fetch reports', error.message, 500)
      }

      return apiResponse.success({
        reports,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Reports API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/reports - Generate new report
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and finance officers can generate reports
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can generate reports')
    }

    // Validate request data
    const validation = await validateRequest(request, createReportSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { type, parameters } = validation.data

    try {
      // Generate report data based on type
      let reportData: any = {}

      switch (type) {
        case 'project':
          reportData = await generateProjectReport(ctx.supabase, parameters)
          break
        case 'academician':
          reportData = await generateAcademicianReport(ctx.supabase, parameters)
          break
        case 'company':
          reportData = await generateCompanyReport(ctx.supabase, parameters)
          break
        case 'payments':
          reportData = await generatePaymentsReport(ctx.supabase, parameters)
          break
        default:
          return apiResponse.error('Invalid report type', 'Unsupported report type', 400)
      }

      // Create report record
      const { data: report, error: reportError } = await ctx.supabase
        .from('reports')
        .insert({
          type,
          parameters,
          generated_by: ctx.user.id
        })
        .select(`
          *,
          generated_by_user:users!reports_generated_by_fkey(full_name, email)
        `)
        .single()

      if (reportError) {
        console.error('Report creation error:', reportError)
        return apiResponse.error('Failed to create report', reportError.message, 500)
      }

      return apiResponse.success({
        report: { ...report, data: reportData }
      }, 'Report generated successfully')
    } catch (error: any) {
      console.error('Report generation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// Helper functions for generating different types of reports
async function generateProjectReport(supabase: any, parameters: any) {
  let query = supabase
    .from('projects')
    .select(`
      *,
      created_by_user:users!projects_created_by_fkey(full_name),
      representatives:project_representatives(
        share_percentage,
        is_lead,
        user:users(full_name, email)
      ),
      incomes:incomes(
        id,
        gross_amount,
        net_amount,
        income_date,
        distributions:income_distributions(amount, user:users(full_name))
      )
    `)

  if (parameters.project_id) {
    query = query.eq('id', parameters.project_id)
  }

  const { data: projects, error } = await query

  if (error) {
    throw new Error(`Failed to fetch project data: ${error.message}`)
  }

  return {
    projects,
    summary: {
      totalProjects: projects?.length || 0,
      totalBudget: projects?.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) || 0,
      totalIncome: projects?.reduce((sum: number, p: any) =>
        sum + p.incomes?.reduce((iSum: number, i: any) => iSum + (i.gross_amount || 0), 0), 0) || 0
    }
  }
}

async function generateAcademicianReport(supabase: any, parameters: any) {
  // First get all academicians
  let userQuery = supabase
    .from('users')
    .select('*')
    .eq('role', 'academician')
    .eq('is_active', true)

  if (parameters.user_id) {
    userQuery = userQuery.eq('id', parameters.user_id)
  }

  const { data: users, error: usersError } = await userQuery

  if (usersError) {
    console.error('Users query error:', usersError)
    throw new Error(`Failed to fetch user data: ${usersError.message}`)
  }

  if (!users || users.length === 0) {
    return {
      academicians: [],
      summary: {
        totalAcademicians: 0,
        totalBalance: 0,
        totalEarnings: 0
      }
    }
  }

  // Now get their related data
  const academicians = []

  for (const user of users) {
    // Get current balance (should be only one record per user)
    const { data: balances, error: balanceError } = await supabase
      .from('balances')
      .select('available_amount, debt_amount, reserved_amount')
      .eq('user_id', user.id)
      .single()

    // If no balance record exists, it's normal for new users

    // Get income distributions
    const { data: distributions } = await supabase
      .from('income_distributions')
      .select(`
        amount,
        income:incomes(gross_amount, income_date, project:projects(name, code))
      `)
      .eq('user_id', user.id)

    // Get project representations
    const { data: representations } = await supabase
      .from('project_representatives')
      .select(`
        share_percentage,
        is_lead,
        project:projects(name, code, status)
      `)
      .eq('user_id', user.id)

    academicians.push({
      ...user,
      balances: balances ? [balances] : [],
      income_distributions: distributions || [],
      project_representatives: representations || []
    })
  }

  // Calculate summary
  let totalBalance = 0
  let totalEarnings = 0

  academicians.forEach((academician: any) => {
    // Sum current available balance (should be only one balance per user)
    if (academician.balances && academician.balances.length > 0) {
      totalBalance += academician.balances[0].available_amount || 0
    }

    // Sum all income distributions for total earnings
    if (academician.income_distributions && academician.income_distributions.length > 0) {
      academician.income_distributions.forEach((dist: any) => {
        totalEarnings += dist.amount || 0
      })
    }
  })

  return {
    academicians,
    summary: {
      totalAcademicians: academicians?.length || 0,
      totalBalance,
      totalEarnings
    }
  }
}

async function generateCompanyReport(supabase: any, parameters: any) {
  // Get income summary with project details
  let query = supabase
    .from('incomes')
    .select(`
      *,
      project:projects(name, code, company_rate),
      distributions:income_distributions(amount)
    `)

  // Apply date filter if provided
  if (parameters.start_date) {
    query = query.gte('income_date', parameters.start_date)
  }
  if (parameters.end_date) {
    query = query.lte('income_date', parameters.end_date)
  }

  const { data: incomes, error: incomesError } = await query

  if (incomesError) {
    throw new Error(`Failed to fetch income data: ${incomesError.message}`)
  }

  // Get payment summary
  const { data: payments, error: paymentsError } = await supabase
    .from('payment_instructions')
    .select('total_amount, status, created_at')

  if (paymentsError) {
    throw new Error(`Failed to fetch payment data: ${paymentsError.message}`)
  }

  // Calculate totals
  const totalGrossIncome = incomes?.reduce((sum: number, i: any) => sum + (i.gross_amount || 0), 0) || 0

  // Calculate commissions based on company_rate from project
  const totalCommissions = incomes?.reduce((sum: number, i: any) => {
    const grossAmount = i.gross_amount || 0
    const companyRate = i.project?.company_rate || 0
    const commission = grossAmount * (companyRate / 100)
    return sum + commission
  }, 0) || 0

  const totalDistributed = incomes?.reduce((sum: number, i: any) =>
    sum + (i.distributions?.reduce((dSum: number, d: any) => dSum + (d.amount || 0), 0) || 0), 0) || 0
  const totalPayments = payments?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0) || 0

  return {
    incomes,
    payments,
    summary: {
      totalGrossIncome,
      totalCommissions,
      totalDistributed,
      totalPayments,
      netCompanyIncome: totalCommissions, // Şirketin net geliri = komisyon tutarı
      pendingPayments: payments?.filter((p: any) => p.status === 'pending').length || 0,
      completedPayments: payments?.filter((p: any) => p.status === 'completed').length || 0
    }
  }
}

async function generatePaymentsReport(supabase: any, parameters: any) {
  let query = supabase
    .from('payment_instructions')
    .select(`
      *,
      user:users!payment_instructions_user_id_fkey(full_name, email, iban),
      created_by_user:users!payment_instructions_created_by_fkey(full_name),
      items:payment_instruction_items(
        amount,
        description,
        income_distribution:income_distributions(
          amount,
          income:incomes(description, project:projects(name, code))
        )
      )
    `)

  if (parameters.start_date) {
    query = query.gte('created_at', parameters.start_date)
  }

  if (parameters.end_date) {
    query = query.lte('created_at', parameters.end_date)
  }

  if (parameters.user_id) {
    query = query.eq('user_id', parameters.user_id)
  }

  const { data: paymentInstructions, error } = await query

  if (error) {
    throw new Error(`Failed to fetch payment instructions: ${error.message}`)
  }

  const statusSummary = paymentInstructions?.reduce((acc: any, p: any) => {
    acc[p.status] = (acc[p.status] || 0) + 1
    return acc
  }, {})

  return {
    paymentInstructions,
    summary: {
      totalPayments: paymentInstructions?.length || 0,
      totalAmount: paymentInstructions?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0) || 0,
      statusBreakdown: statusSummary || {},
      avgPaymentAmount: paymentInstructions?.length > 0 ?
        (paymentInstructions.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0) / paymentInstructions.length) : 0
    }
  }
}