import { SupabaseClient } from '@supabase/supabase-js'
import { Database, ExpenseSource } from '@/lib/types/database'

type PayerType = 'company' | 'academic' | 'client'

/**
 * Payer tipine göre expense alanlarını belirler
 */
export function mapPayerToExpenseFields(payer: PayerType): {
  is_tto_expense: boolean
  expense_share_type: 'shared' | 'client' | null
} {
  switch (payer) {
    case 'company':
      // TTO ödeyecek
      return {
        is_tto_expense: true,
        expense_share_type: null
      }
    case 'academic':
      // Akademisyen ödeyecek (ortak gider gibi davran)
      return {
        is_tto_expense: false,
        expense_share_type: 'shared'
      }
    case 'client':
      // Karşı taraf ödeyecek
      return {
        is_tto_expense: false,
        expense_share_type: 'client'
      }
  }
}

interface SyncAutoExpenseParams {
  supabase: SupabaseClient<Database>
  project_id: string
  expense_source: 'referee_payment' | 'stamp_duty'
  amount: number
  payer: PayerType | null
  start_date: string
  created_by: string
}

/**
 * Otomatik gideri senkronize eder (oluştur/güncelle/sil)
 */
export async function syncAutoExpense(params: SyncAutoExpenseParams): Promise<void> {
  const { supabase, project_id, expense_source, amount, payer, start_date, created_by } = params

  // Mevcut gideri bul
  const { data: existingExpenses } = await (supabase as any)
    .from('expenses')
    .select('id')
    .eq('project_id', project_id)
    .eq('expense_source', expense_source)
    .limit(1)

  const existing = existingExpenses && existingExpenses.length > 0 ? existingExpenses[0] : null

  // Tutar 0 veya payer null ise gideri sil
  if (amount <= 0 || !payer) {
    if (existing) {
      await (supabase as any).from('expenses').delete().eq('id', existing.id)
    }
    return
  }

  const payerFields = mapPayerToExpenseFields(payer)
  const description = expense_source === 'referee_payment'
    ? 'Hakem Heyeti Ödemesi'
    : 'Damga Vergisi'

  const expenseData = {
    expense_type: 'proje' as const,
    project_id,
    amount,
    description,
    expense_date: start_date,
    expense_source,
    is_tto_expense: payerFields.is_tto_expense,
  }

  if (existing) {
    // Güncelle
    await (supabase as any).from('expenses').update(expenseData).eq('id', existing.id)
  } else {
    // Oluştur
    await (supabase as any).from('expenses').insert({
      ...expenseData,
      created_by
    })
  }
}

interface CreateAutoExpensesParams {
  supabase: SupabaseClient<Database>
  project_id: string
  referee_payment: number
  referee_payer: PayerType | null
  stamp_duty_amount: number
  stamp_duty_payer: PayerType | null
  start_date: string
  created_by: string
}

/**
 * Proje oluşturulduğunda otomatik giderleri oluşturur
 */
export async function createAutoExpenses(params: CreateAutoExpensesParams): Promise<void> {
  const {
    supabase,
    project_id,
    referee_payment,
    referee_payer,
    stamp_duty_amount,
    stamp_duty_payer,
    start_date,
    created_by
  } = params

  const expenses: Array<{
    expense_type: 'proje'
    project_id: string
    amount: number
    description: string
    expense_date: string
    expense_source: ExpenseSource
    is_tto_expense: boolean
    created_by: string
  }> = []

  // Hakem Heyeti gideri
  if (referee_payment > 0 && referee_payer) {
    const payerFields = mapPayerToExpenseFields(referee_payer)
    expenses.push({
      expense_type: 'proje',
      project_id,
      amount: referee_payment,
      description: 'Hakem Heyeti Ödemesi',
      expense_date: start_date,
      expense_source: 'referee_payment',
      is_tto_expense: payerFields.is_tto_expense,
      created_by
    })
  }

  // Damga Vergisi gideri
  if (stamp_duty_amount > 0 && stamp_duty_payer) {
    const payerFields = mapPayerToExpenseFields(stamp_duty_payer)
    expenses.push({
      expense_type: 'proje',
      project_id,
      amount: stamp_duty_amount,
      description: 'Damga Vergisi',
      expense_date: start_date,
      expense_source: 'stamp_duty',
      is_tto_expense: payerFields.is_tto_expense,
      created_by
    })
  }

  // Giderleri toplu ekle
  if (expenses.length > 0) {
    const { error } = await (supabase as any).from('expenses').insert(expenses)
    if (error) {
      console.error('Auto expense creation error:', error)
      // Proje oluşturuldu ama gider oluşturulamadı - kritik değil, loglama yeterli
    }
  }
}
