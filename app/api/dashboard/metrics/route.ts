import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/dashboard/metrics - Get comprehensive dashboard metrics for TTO
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Only admins and managers can access dashboard metrics
      if (!['admin', 'manager'].includes(ctx.user.role)) {
        return apiResponse.error('Unauthorized', 'Only admins and managers can access dashboard metrics', 403)
      }

      // Get date range filters from query params
      const url = new URL(request.url)
      const startDate = url.searchParams.get('startDate')
      const endDate = url.searchParams.get('endDate')

      console.log('Dashboard metrics - Date filters:', { startDate, endDate })

      // 1. Get all projects (filtered by start_date if provided)
      // Ana metrikler (bütçe, tahsilat, kalan) projects tablosundan okunur
      let projectsQuery = ctx.supabase
        .from('projects')
        .select('budget, total_received, status, start_date, total_commission_due')

      // Filter projects by start_date
      if (startDate) {
        projectsQuery = projectsQuery.gte('start_date', startDate)
      }
      if (endDate) {
        projectsQuery = projectsQuery.lte('start_date', endDate)
      }

      const { data: allProjects, error: projectsError } = await projectsQuery

      if (projectsError) {
        console.error('Projects fetch error:', projectsError)
        return apiResponse.error('Failed to fetch projects', projectsError.message, 500)
      }

      console.log('Filtered projects count:', allProjects?.length || 0)

      // Ana metrikler projects tablosundan
      const totalBudget = allProjects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0
      const totalCollected = allProjects?.reduce((sum, p) => sum + (p.total_received || 0), 0) || 0
      const totalCommissionDue = allProjects?.reduce((sum, p) => sum + (p.total_commission_due || 0), 0) || 0

      // 2. Get active project count (only active ones from filtered)
      const activeProjectCount = allProjects?.filter(p => p.status === 'active').length || 0

      // Türetilmiş metrikler
      const totalInvoiced = totalCollected // Tahsil edilen = faturalanan (projects bazlı)
      const totalOutstanding = 0 // Projects bazlı açık bakiye yok
      const remainingToInvoice = totalBudget - totalCollected

      // 3. Get all incomes with income_date for year/month breakdowns
      let incomesQuery = ctx.supabase
        .from('incomes')
        .select('gross_amount, collected_amount, income_date')

      // Apply date filters if provided
      if (startDate) {
        incomesQuery = incomesQuery.gte('income_date', startDate)
      }
      if (endDate) {
        incomesQuery = incomesQuery.lte('income_date', endDate)
      }

      const { data: incomes, error: incomesError } = await incomesQuery

      if (incomesError) {
        console.error('Incomes fetch error:', incomesError)
        return apiResponse.error('Failed to fetch incomes', incomesError.message, 500)
      }

      console.log('Filtered incomes count:', incomes?.length || 0)

      // 4. Get all commissions with created_at for year grouping
      let commissionsQuery = ctx.supabase
        .from('commissions')
        .select('amount, created_at')

      // Apply date filters to commissions using created_at
      if (startDate) {
        commissionsQuery = commissionsQuery.gte('created_at', startDate)
      }
      if (endDate) {
        commissionsQuery = commissionsQuery.lte('created_at', endDate + 'T23:59:59')
      }

      const { data: commissions, error: commissionsError } = await commissionsQuery

      if (commissionsError) {
        console.error('Commissions fetch error:', commissionsError)
        return apiResponse.error('Failed to fetch commissions', commissionsError.message, 500)
      }

      console.log('Filtered commissions count:', commissions?.length || 0)

      // Calculate total TTO commission
      const totalCommission = commissions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0

      // 4b. Get all expenses with expense_date for monthly grouping
      let expensesQuery = ctx.supabase
        .from('expenses')
        .select('amount, expense_date')

      // Apply date filters if provided
      if (startDate) {
        expensesQuery = expensesQuery.gte('expense_date', startDate)
      }
      if (endDate) {
        expensesQuery = expensesQuery.lte('expense_date', endDate)
      }

      const { data: expenses, error: expensesError } = await expensesQuery

      if (expensesError) {
        console.error('Expenses fetch error:', expensesError)
        return apiResponse.error('Failed to fetch expenses', expensesError.message, 500)
      }

      console.log('Filtered expenses count:', expenses?.length || 0)

      // 4c. Get all payment instructions with created_at for monthly grouping
      let paymentsQuery = ctx.supabase
        .from('payment_instructions')
        .select('total_amount, created_at, status')
        .eq('status', 'completed') // Sadece tamamlanan ödemeler

      // Apply date filters if provided
      if (startDate) {
        paymentsQuery = paymentsQuery.gte('created_at', startDate)
      }
      if (endDate) {
        paymentsQuery = paymentsQuery.lte('created_at', endDate + 'T23:59:59')
      }

      const { data: payments, error: paymentsError } = await paymentsQuery

      if (paymentsError) {
        console.error('Payments fetch error:', paymentsError)
        return apiResponse.error('Failed to fetch payments', paymentsError.message, 500)
      }

      console.log('Filtered payments count:', payments?.length || 0)

      // Calculate total payments
      const totalPayments = payments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0

      // 5. Group data by year — projects tablosundan (start_date yılına göre)
      const yearData: Record<string, { budget: number; received: number; commission: number; remaining: number }> = {}

      // Projeleri start_date yılına göre grupla
      allProjects?.forEach((project: any) => {
        if (project.start_date) {
          const year = new Date(project.start_date).getFullYear().toString()
          if (!yearData[year]) {
            yearData[year] = { budget: 0, received: 0, commission: 0, remaining: 0 }
          }
          yearData[year].budget += project.budget || 0
          yearData[year].received += project.total_received || 0
          yearData[year].commission += project.total_commission_due || 0
        }
      })

      // Her yıl için kalan bütçeyi hesapla
      Object.keys(yearData).forEach((year) => {
        yearData[year].remaining = yearData[year].budget - yearData[year].received
      })

      // 6. Format year breakdown — son 3 yıl + veri olan yıllar
      const currentYear = new Date().getFullYear()
      const defaultYears = [currentYear, currentYear - 1, currentYear - 2].map(String)
      const allDataYears = Object.keys(yearData).sort().reverse()

      // Varsayılan yıllar + veri olan yılları birleştir, sırala
      const yearsSet = new Set([...defaultYears, ...allDataYears])
      const years = Array.from(yearsSet).sort().reverse()

      const yearBreakdown = years.map((year) => ({
        year,
        invoiced: yearData[year]?.received || 0,
        commission: yearData[year]?.commission || 0,
        remaining: yearData[year]?.remaining || 0,
      }))

      // 7. Create monthly breakdown for each year
      const monthlyBreakdown: Record<string, Array<{ month: number; income: number; expense: number; payment: number; difference: number }>> = {}

      years.forEach((year) => {
        // Initialize 12 months with zero values
        const months = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1, // 1-12
          income: 0,
          expense: 0,
          payment: 0,
          difference: 0,
        }))

        // Add income data by month
        incomes?.forEach((income) => {
          if (income.income_date) {
            const date = new Date(income.income_date)
            if (date.getFullYear().toString() === year) {
              const monthIndex = date.getMonth() // 0-11
              months[monthIndex].income += income.gross_amount || 0
            }
          }
        })

        // Add expense data by month
        expenses?.forEach((expense) => {
          if (expense.expense_date) {
            const date = new Date(expense.expense_date)
            if (date.getFullYear().toString() === year) {
              const monthIndex = date.getMonth() // 0-11
              months[monthIndex].expense += expense.amount || 0
            }
          }
        })

        // Add payment data by month
        payments?.forEach((payment: any) => {
          if (payment.created_at) {
            const date = new Date(payment.created_at)
            if (date.getFullYear().toString() === year) {
              const monthIndex = date.getMonth() // 0-11
              months[monthIndex].payment += payment.total_amount || 0
            }
          }
        })

        // Calculate difference for each month
        months.forEach((month) => {
          month.difference = month.income - month.expense
        })

        monthlyBreakdown[year] = months
      })

      // 8. Return comprehensive metrics
      return apiResponse.success({
        // Main metrics
        total_budget: totalBudget,
        total_invoiced: totalInvoiced,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        remaining_to_invoice: remainingToInvoice,
        total_commission: totalCommissionDue, // Excel'den gelen alınması gereken komisyon
        total_commission_collected: totalCommission, // Gerçekleşen (tahsil edilen) komisyon
        total_payments: totalPayments,
        active_project_count: activeProjectCount,

        // Progress percentage (projects bazlı)
        progress_percentage: totalBudget > 0 ? (totalCollected / totalBudget) * 100 : 0,
        collection_percentage: totalBudget > 0 ? (totalCollected / totalBudget) * 100 : 0,

        // Year breakdown
        year_breakdown: yearBreakdown,

        // Monthly breakdown by year
        monthly_breakdown: monthlyBreakdown,

        // All available years
        all_years: years,

        // Applied filters
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      })
    } catch (error: any) {
      console.error('Dashboard metrics API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
