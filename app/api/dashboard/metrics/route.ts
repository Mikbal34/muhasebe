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

      // 1. Get total budget from ALL projects (not just active)
      const { data: allProjects, error: projectsError } = await ctx.supabase
        .from('projects')
        .select('budget, status')

      if (projectsError) {
        console.error('Projects fetch error:', projectsError)
        return apiResponse.error('Failed to fetch projects', projectsError.message, 500)
      }

      // Total budget includes all projects (active + completed)
      const totalBudget = allProjects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0

      // 2. Get active project count (only active ones)
      const activeProjectCount = allProjects?.filter(p => p.status === 'active').length || 0

      // 3. Get all incomes with income_date for year grouping
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

      // Calculate total invoiced (kesilen fatura)
      const totalInvoiced = incomes?.reduce((sum, i) => sum + (i.gross_amount || 0), 0) || 0

      // Calculate total collected (tahsil edilen)
      const totalCollected = incomes?.reduce((sum, i) => sum + (i.collected_amount || 0), 0) || 0

      // Calculate total outstanding (açık bakiye)
      const totalOutstanding = totalInvoiced - totalCollected

      // Calculate remaining to invoice (kesilecek fatura)
      const remainingToInvoice = totalBudget - totalInvoiced

      // 4. Get all commissions with income dates for year grouping
      const { data: commissions, error: commissionsError } = await ctx.supabase
        .from('commissions')
        .select('amount, income_id, incomes(income_date)')

      if (commissionsError) {
        console.error('Commissions fetch error:', commissionsError)
        return apiResponse.error('Failed to fetch commissions', commissionsError.message, 500)
      }

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

      // 5. Group data by year
      const yearData: Record<string, { invoiced: number; commission: number; remaining: number; planned: number }> = {}

      // Process incomes by year
      // Planlanan (gross_amount) ve tahsil edilen (collected_amount > 0) ayrımı yap
      incomes?.forEach((income) => {
        if (income.income_date) {
          const year = new Date(income.income_date).getFullYear().toString()
          if (!yearData[year]) {
            yearData[year] = { invoiced: 0, commission: 0, remaining: 0, planned: 0 }
          }
          // Planlanan tutar (tüm gelir kayıtları)
          yearData[year].planned += income.gross_amount || 0
          // Faturalanan tutar (sadece tahsil edilenler)
          if ((income as any).collected_amount > 0) {
            yearData[year].invoiced += income.gross_amount || 0
          }
        }
      })

      // Process commissions by year
      commissions?.forEach((commission: any) => {
        if (commission.incomes?.income_date) {
          const year = new Date(commission.incomes.income_date).getFullYear().toString()
          if (!yearData[year]) {
            yearData[year] = { invoiced: 0, commission: 0, remaining: 0, planned: 0 }
          }
          yearData[year].commission += commission.amount || 0
        }
      })

      // Calculate remaining for each year based on income_date
      // Kesilecek fatura = O yılda planlanan - O yılda tahsil edilen
      Object.keys(yearData).forEach((year) => {
        yearData[year].remaining = yearData[year].planned - yearData[year].invoiced
      })

      // 6. Format year breakdown for specific years (2024, 2025, 2026)
      const years = ['2024', '2025', '2026']
      const yearBreakdown = years.map((year) => ({
        year,
        invoiced: yearData[year]?.invoiced || 0,
        commission: yearData[year]?.commission || 0,
        remaining: yearData[year]?.remaining || 0,
      }))

      // 7. Create monthly breakdown for each year
      const monthlyBreakdown: Record<string, Array<{ month: number; income: number; expense: number; difference: number }>> = {}

      years.forEach((year) => {
        // Initialize 12 months with zero values
        const months = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1, // 1-12
          income: 0,
          expense: 0,
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
        total_commission: totalCommission,
        active_project_count: activeProjectCount,

        // Progress percentage
        progress_percentage: totalBudget > 0 ? (totalInvoiced / totalBudget) * 100 : 0,
        collection_percentage: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,

        // Year breakdown
        year_breakdown: yearBreakdown,

        // Monthly breakdown by year
        monthly_breakdown: monthlyBreakdown,

        // All available years (for future expansion)
        all_years: Object.keys(yearData).sort().reverse(),

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
