import { NextRequest } from 'next/server'
import { createReportSchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, withAuth } from '@/lib/middleware/auth'

// GET /api/reports - List generated reports
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can view reports
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can view reports')
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
    // Only admins and managers can create reports
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create reports')
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
        case 'company':
          reportData = await generateCompanyReport(ctx.supabase, parameters)
          break
        default:
          return apiResponse.error('Invalid report type', 'Unsupported report type', 400)
      }

      // Create report record
      const { data: report, error: reportError } = await (ctx.supabase as any)
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
        role,
        user:users(full_name, email)
      ),
      incomes:incomes(
        id,
        gross_amount,
        net_amount,
        income_date
      ),
      allocations:manual_balance_allocations(amount, personnel:personnel(full_name))
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

async function generateCompanyReport(supabase: any, parameters: any) {
  // Get income summary with project details
  let query = supabase
    .from('incomes')
    .select(`
      *,
      project:projects(name, code, company_rate)
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