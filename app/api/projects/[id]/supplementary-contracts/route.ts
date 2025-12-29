import { NextRequest } from 'next/server'
import { apiResponse, withAuth } from '@/lib/middleware/auth'
import { createSupplementaryContractSchema } from '@/lib/schemas/validation'

interface RouteParams {
  params: { id: string }
}

// GET /api/projects/[id]/supplementary-contracts - List all supplementary contracts
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = params

  return withAuth(request, async (req, ctx) => {
    try {
      const { data: contracts, error } = await ctx.supabase
        .from('supplementary_contracts')
        .select(`
          *,
          created_by_user:users!supplementary_contracts_created_by_fkey(full_name, email)
        `)
        .eq('project_id', projectId)
        .order('amendment_number', { ascending: true })

      if (error) {
        console.error('Supplementary contracts fetch error:', error)
        return apiResponse.error('Ek sözleşmeler getirilemedi', error.message, 500)
      }

      return apiResponse.success({ contracts: contracts || [] })
    } catch (error: any) {
      console.error('Supplementary contracts API error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}

// POST /api/projects/[id]/supplementary-contracts - Create new supplementary contract
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = params

  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can add supplementary contracts
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Yalnızca yöneticiler ek sözleşme ekleyebilir')
    }

    try {
      // Check if project exists and get current values
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .select('id, status, end_date, budget')
        .eq('id', projectId)
        .single()

      if (projectError) {
        if (projectError.code === 'PGRST116') {
          return apiResponse.notFound('Proje bulunamadı')
        }
        return apiResponse.error('Proje kontrol edilemedi', projectError.message, 500)
      }

      // Check if project is cancelled
      if (project.status === 'cancelled') {
        return apiResponse.error('İptal edilmiş projelere ek sözleşme eklenemez', '', 400)
      }

      const body = await request.json()

      // Validate input
      const parseResult = createSupplementaryContractSchema.safeParse(body)
      if (!parseResult.success) {
        return apiResponse.error('Geçersiz veri', parseResult.error.errors[0].message, 400)
      }

      const { new_end_date, budget_increase, description, contract_document_path } = parseResult.data

      // Validate new_end_date is after current end_date
      if (new_end_date && project.end_date) {
        if (new Date(new_end_date) <= new Date(project.end_date)) {
          return apiResponse.error('Geçersiz tarih', 'Yeni bitiş tarihi mevcut bitiş tarihinden sonra olmalıdır', 400)
        }
      }

      // Get next amendment number
      const { data: lastContract, error: countError } = await ctx.supabase
        .from('supplementary_contracts')
        .select('amendment_number')
        .eq('project_id', projectId)
        .order('amendment_number', { ascending: false })
        .limit(1)
        .single()

      const nextAmendmentNumber = countError ? 1 : (lastContract?.amendment_number || 0) + 1

      // Calculate new budget
      const currentBudget = Number(project.budget) || 0
      const increase = Number(budget_increase) || 0
      const newBudget = currentBudget + increase

      // Create supplementary contract
      const { data: newContract, error: insertError } = await ctx.supabase
        .from('supplementary_contracts')
        .insert({
          project_id: projectId,
          amendment_number: nextAmendmentNumber,
          amendment_date: new Date().toISOString().split('T')[0],
          previous_end_date: project.end_date,
          new_end_date: new_end_date || null,
          previous_budget: currentBudget,
          budget_increase: increase,
          new_budget: newBudget,
          description: description || null,
          contract_document_path: contract_document_path || null,
          created_by: ctx.user.id,
        })
        .select(`
          *,
          created_by_user:users!supplementary_contracts_created_by_fkey(full_name, email)
        `)
        .single()

      if (insertError) {
        console.error('Supplementary contract insert error:', insertError)
        return apiResponse.error('Ek sözleşme oluşturulamadı', insertError.message, 500)
      }

      return apiResponse.success(
        { contract: newContract },
        `${nextAmendmentNumber}. Ek Sözleşme başarıyla eklendi`
      )
    } catch (error: any) {
      console.error('Supplementary contract create error:', error)
      return apiResponse.error('Sunucu hatası', error.message, 500)
    }
  })
}
