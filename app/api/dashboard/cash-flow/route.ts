import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import {
  EXPENSE_CATEGORIES,
  FLOW_COLORS,
  CashFlowData,
  CashFlowNode,
  CashFlowLink,
  CashFlowPeriod,
  ExpenseCategoryId
} from '@/components/charts/cash-flow-types'

// Gider description'ından kategori belirle
function categorizeExpense(description: string): ExpenseCategoryId {
  const lowerDesc = description.toLowerCase()

  for (const category of EXPENSE_CATEGORIES) {
    if (category.id === 'diger') continue // Diğer en sonda kontrol edilecek

    for (const keyword of category.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category.id
      }
    }
  }

  return 'diger'
}

// Dönem için tarih aralığı hesapla
function getPeriodDateRange(period: CashFlowPeriod): { start: Date; end: Date } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const quarter = Math.floor(month / 3)

  switch (period) {
    case 'month':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59)
      }
    case 'quarter':
      return {
        start: new Date(year, quarter * 3, 1),
        end: new Date(year, quarter * 3 + 3, 0, 23, 59, 59)
      }
    case 'year':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59)
      }
    default:
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59)
      }
  }
}

// GET /api/dashboard/cash-flow - Nakit akış diyagramı verisi
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      // Sadece admin ve manager erişebilir
      if (!['admin', 'manager'].includes(ctx.user.role)) {
        return apiResponse.error('Unauthorized', 'Only admins and managers can access cash flow data', 403)
      }

      // Query params'dan dönem al
      const searchParams = request.nextUrl.searchParams
      const period = (searchParams.get('period') || 'month') as CashFlowPeriod

      // Tarih aralığını hesapla
      const { start, end } = getPeriodDateRange(period)
      const startStr = start.toISOString().split('T')[0]
      const endStr = end.toISOString().split('T')[0]

      // 1. Gelirleri çek (seçili dönem için)
      const { data: incomes, error: incomesError } = await ctx.supabase
        .from('incomes')
        .select('gross_amount, collected_amount, income_date')
        .gte('income_date', startStr)
        .lte('income_date', endStr)

      if (incomesError) {
        console.error('Incomes fetch error:', incomesError)
        return apiResponse.error('Failed to fetch incomes', incomesError.message, 500)
      }

      // 2. Giderleri çek (seçili dönem için)
      const { data: expenses, error: expensesError } = await ctx.supabase
        .from('expenses')
        .select('amount, description, expense_date')
        .gte('expense_date', startStr)
        .lte('expense_date', endStr)

      if (expensesError) {
        console.error('Expenses fetch error:', expensesError)
        return apiResponse.error('Failed to fetch expenses', expensesError.message, 500)
      }

      // 3. Toplam geliri hesapla (tahsil edilen)
      const totalIncome = incomes?.reduce((sum, i) => sum + (i.collected_amount || 0), 0) || 0

      // 4. Giderleri kategorilere ayır
      const categoryTotals: Record<ExpenseCategoryId, { total: number; items: { description: string; amount: number }[] }> = {
        operasyonel: { total: 0, items: [] },
        personel: { total: 0, items: [] },
        vergiler: { total: 0, items: [] },
        pazarlama: { total: 0, items: [] },
        diger: { total: 0, items: [] }
      }

      expenses?.forEach((expense) => {
        const categoryId = categorizeExpense(expense.description || '')
        categoryTotals[categoryId].total += expense.amount || 0
        categoryTotals[categoryId].items.push({
          description: expense.description || 'Belirtilmemiş',
          amount: expense.amount || 0
        })
      })

      // 5. Toplam gider ve net kalan hesapla
      const totalExpenses = Object.values(categoryTotals).reduce((sum, cat) => sum + cat.total, 0)
      const netRemaining = totalIncome - totalExpenses

      // 6. Node'ları oluştur
      const nodes: CashFlowNode[] = []
      const links: CashFlowLink[] = []

      // Gelir node'u (depth 0)
      nodes.push({
        id: 'income',
        label: 'Toplam Gelir',
        value: totalIncome,
        color: FLOW_COLORS.income,
        depth: 0
      })

      // Kategori node'ları (depth 1)
      EXPENSE_CATEGORIES.forEach((category) => {
        const categoryData = categoryTotals[category.id]
        if (categoryData.total > 0) {
          nodes.push({
            id: category.id,
            label: category.label,
            value: categoryData.total,
            color: category.color,
            depth: 1
          })

          // Gelirden kategoriye link
          links.push({
            source: 'income',
            target: category.id,
            value: categoryData.total,
            color: category.color
          })

          // Alt kategori node'ları (depth 2) - en büyük 3 gider
          const topItems = categoryData.items
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3)

          topItems.forEach((item, index) => {
            const subId = `${category.id}-sub-${index}`
            nodes.push({
              id: subId,
              label: item.description.length > 20
                ? item.description.substring(0, 17) + '...'
                : item.description,
              value: item.amount,
              color: category.color,
              depth: 2
            })

            links.push({
              source: category.id,
              target: subId,
              value: item.amount,
              color: category.color
            })
          })
        }
      })

      // Net kalan node'u (depth 1, en altta)
      if (netRemaining !== 0) {
        nodes.push({
          id: 'net',
          label: netRemaining >= 0 ? 'Net Kalan' : 'Net Açık',
          value: Math.abs(netRemaining),
          color: netRemaining >= 0 ? FLOW_COLORS.netRemaining : '#EF4444',
          depth: 1
        })

        // Gelirden net kalana link
        if (netRemaining > 0) {
          links.push({
            source: 'income',
            target: 'net',
            value: netRemaining,
            color: FLOW_COLORS.netRemaining
          })
        }
      }

      // 7. Response
      const cashFlowData: CashFlowData = {
        totalIncome,
        totalExpenses,
        netRemaining,
        nodes,
        links
      }

      return apiResponse.success({
        data: cashFlowData,
        period: {
          type: period,
          start: startStr,
          end: endStr
        },
        categoryBreakdown: Object.entries(categoryTotals).map(([id, data]) => ({
          id,
          label: EXPENSE_CATEGORIES.find(c => c.id === id)?.label || id,
          total: data.total,
          itemCount: data.items.length
        }))
      })

    } catch (error: any) {
      console.error('Cash flow API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
