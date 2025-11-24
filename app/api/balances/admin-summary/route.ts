import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'

// GET /api/balances/admin-summary - Get TTO (admin) financial summary
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Get admin user
      const { data: admin, error: adminError } = await ctx.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .single()

      if (adminError || !admin) {
        console.error('Admin user not found:', adminError)
        return apiResponse.error('Admin user not found', adminError?.message || 'No admin user exists', 404)
      }

      // Get admin balance
      const { data: balance, error: balanceError } = await ctx.supabase
        .from('balances')
        .select('id, available_amount, debt_amount')
        .eq('user_id', admin.id)
        .single()

      if (balanceError) {
        console.error('Admin balance fetch error:', balanceError)
        return apiResponse.error('Failed to fetch admin balance', balanceError.message, 500)
      }

      // Get total commissions (sum from balance_transactions where reference_type = 'commission')
      const { data: commissionTransactions, error: commissionsError } = await ctx.supabase
        .from('balance_transactions')
        .select('amount')
        .eq('balance_id', balance.id)
        .eq('reference_type', 'commission')

      if (commissionsError) {
        console.error('Commissions fetch error:', commissionsError)
        return apiResponse.error('Failed to fetch commissions', commissionsError.message, 500)
      }

      const totalCommission = commissionTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0

      // Get total expenses (sum from expenses table)
      const { data: expenses, error: expensesError } = await ctx.supabase
        .from('expenses')
        .select('amount')

      if (expensesError) {
        console.error('Expenses fetch error:', expensesError)
        return apiResponse.error('Failed to fetch expenses', expensesError.message, 500)
      }

      const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0

      // Calculate net balance (should match balance.available_amount if triggers are working correctly)
      const netBalance = balance?.available_amount || 0

      return apiResponse.success({
        total_commission: totalCommission,
        total_expenses: totalExpenses,
        net_balance: netBalance,
        debt_amount: balance?.debt_amount || 0,
        // Include breakdown for transparency
        breakdown: {
          commission_income: totalCommission,
          expense_deductions: totalExpenses,
          current_balance: netBalance
        }
      })
    } catch (error: any) {
      console.error('Admin summary API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
