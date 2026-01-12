import { NextRequest } from 'next/server'
import { createProjectSchema, projectQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'
import { createAutoExpenses } from '@/lib/utils/expense-helpers'

// GET /api/projects - List projects with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, projectQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { status, search, created_by, page = 1, limit = 10000, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name),
          representatives:project_representatives(
            id,
            role,
            user_id,
            personnel_id,
            user:users(id, full_name, email),
            personnel:personnel(id, full_name, email)
          )
        `, { count: 'exact' })

      // Apply filters based on user role
      // Manager and Admin have full access, so no specific filtering needed for them
      // If we had other roles, we would add logic here

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (search) {
        // Sanitize search parameter - escape special characters for PostgREST
        const sanitizedSearch = search.replace(/[%_\\(),.*]/g, '\\$&')

        // Search in project name, code, or representative names
        const { data: matchingUsers } = await ctx.supabase
          .from('users')
          .select('id')
          .ilike('full_name', `%${sanitizedSearch}%`)

        const userIds = (matchingUsers || []).map((u: any) => u.id)

        let projectIdsFromUsers: string[] = []
        if (userIds.length > 0) {
          const { data: userProjects } = await ctx.supabase
            .from('project_representatives')
            .select('project_id')
            .in('user_id', userIds)

          projectIdsFromUsers = userProjects?.map(up => (up as any).project_id) || []
        }

        if (projectIdsFromUsers.length > 0) {
          query = query.or(`name.ilike.%${sanitizedSearch}%,code.ilike.%${sanitizedSearch}%,id.in.(${projectIdsFromUsers.join(',')})`)
        } else {
          query = query.or(`name.ilike.%${sanitizedSearch}%,code.ilike.%${sanitizedSearch}%`)
        }
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
      }

      // Apply representative filter
      const { representative_id } = queryValidation.data
      if (representative_id) {
        const { data: repProjects } = await ctx.supabase
          .from('project_representatives')
          .select('project_id')
          .eq('user_id', representative_id)

        const projectIds = repProjects?.map(rp => (rp as any).project_id) || []

        if (projectIds.length > 0) {
          query = query.in('id', projectIds)
        } else {
          // If representative has no projects, ensure no results are returned
          // We can use a condition that is always false or an empty ID list
          query = query.in('id', [])
        }
      }

      // Apply sorting and pagination
      query = query
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1)

      const { data: projects, error, count } = await query

      if (error) {
        console.error('Projects fetch error:', error)
        return apiResponse.error('Failed to fetch projects', error.message, 500)
      }

      return apiResponse.success({
        projects,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error: any) {
      console.error('Projects API error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST /api/projects - Create new project
export async function POST(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Only admins and managers can create projects
    if (!['admin', 'manager'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and managers can create projects')
    }

    // Validate request data
    const validation = await validateRequest(request, createProjectSchema)
    if ('error' in validation) {
      // Read the error response body
      const errorClone = validation.error.clone()
      const errorBody = await errorClone.json()
      console.error('Validation error details:', errorBody)
      return validation.error
    }

    console.log('Project creation data:', validation.data)

    const {
      code,
      name,
      budget,
      start_date,
      end_date,
      status = 'active',
      representatives,
      company_rate = 15,
      vat_rate = 18,
      referee_payment = 0,
      referee_payer,
      stamp_duty_payer,
      stamp_duty_amount = 0,
      contract_path,
      has_assignment_permission = false,
      assignment_document_path,
      sent_to_referee = false,
      referee_approved = false,
      referee_approval_date,
      has_withholding_tax = false,
      withholding_tax_rate = 0,
      payment_plan
    } = validation.data

    try {
      // Start transaction
      const { data: project, error: projectError } = await (ctx.supabase as any)
        .from('projects')
        .insert({
          code,
          name,
          budget,
          start_date,
          end_date,
          status,
          company_rate,
          vat_rate,
          referee_payment,
          referee_payer,
          stamp_duty_payer,
          stamp_duty_amount,
          contract_path,
          has_assignment_permission,
          assignment_document_path: assignment_document_path || null,
          sent_to_referee,
          referee_approved,
          referee_approval_date: referee_approval_date || null,
          has_withholding_tax,
          withholding_tax_rate: has_withholding_tax ? withholding_tax_rate : 0,
          created_by: ctx.user.id
        })
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
        return apiResponse.error('Failed to create project', projectError.message, 500)
      }

      // Insert representatives (can be users or personnel)
      const representativeData = representatives.map(rep => ({
        project_id: project.id,
        user_id: rep.user_id || null,
        personnel_id: rep.personnel_id || null,
        role: rep.role
      }))

      const { error: repError } = await (ctx.supabase as any)
        .from('project_representatives')
        .insert(representativeData)

      if (repError) {
        // Rollback: delete the created project
        await ctx.supabase.from('projects').delete().eq('id', project.id)
        console.error('Representatives creation error:', repError)
        return apiResponse.error('Failed to create project representatives', repError.message, 500)
      }

      // Create payment plan installments if enabled (planned_payments tablosuna)
      if (payment_plan?.enabled && payment_plan?.installments && payment_plan.installments.length > 0) {
        // Validate total does not exceed budget (can be less for partial planning)
        const installmentTotal = payment_plan.installments.reduce(
          (sum: number, inst: any) => sum + inst.planned_amount, 0
        )

        if (installmentTotal > budget + 0.01) {
          // Rollback: delete representatives and project
          await ctx.supabase.from('project_representatives').delete().eq('project_id', project.id)
          await ctx.supabase.from('projects').delete().eq('id', project.id)
          return apiResponse.error('Taksit toplamı proje bütçesini aşamaz', '', 400)
        }

        // Create planned payment records (NOT incomes - these are just for tracking)
        const plannedPayments = payment_plan.installments.map((inst: any) => ({
          project_id: project.id,
          installment_number: inst.installment_number,
          planned_amount: inst.planned_amount,
          planned_date: inst.planned_date,
          description: inst.description || `Taksit ${inst.installment_number}`,
          created_by: ctx.user.id
        }))

        const { error: planError } = await (ctx.supabase as any)
          .from('planned_payments')
          .insert(plannedPayments)

        if (planError) {
          // Rollback: delete representatives and project
          await ctx.supabase.from('project_representatives').delete().eq('project_id', project.id)
          await ctx.supabase.from('projects').delete().eq('id', project.id)
          console.error('Payment plan creation error:', planError)
          return apiResponse.error('Ödeme planı oluşturulamadı', planError.message, 500)
        }

        console.log(`Created ${plannedPayments.length} planned payments for project ${project.id}`)
      }

      // Create auto expenses for referee payment and stamp duty
      await createAutoExpenses({
        supabase: ctx.supabase,
        project_id: project.id,
        referee_payment,
        referee_payer: referee_payer || null,
        stamp_duty_amount,
        stamp_duty_payer: stamp_duty_payer || null,
        start_date,
        created_by: ctx.user.id
      })

      // Fetch complete project data
      const { data: completeProject, error: fetchError } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name),
          representatives:project_representatives(
            id,
            role,
            user_id,
            personnel_id,
            user:users(id, full_name, email),
            personnel:personnel(id, full_name, email)
          )
        `)
        .eq('id', project.id)
        .single()

      if (fetchError) {
        console.error('Project fetch error:', fetchError)
        return apiResponse.error('Project created but failed to fetch details', fetchError.message, 500)
      }

      // Create notifications for user representatives only (personnel can't login)
      for (const rep of representatives) {
        // Only send notification if representative is a user (has user_id)
        if (rep.user_id) {
          await (ctx.supabase as any).rpc('create_notification', {
            p_user_id: rep.user_id,
            p_type: 'success',
            p_title: 'Yeni Proje',
            p_message: `${(project as any).code} - ${name} projesine temsilci olarak atandınız.`,
            p_auto_hide: true,
            p_duration: 8000,
            p_action_label: 'Görüntüle',
            p_action_url: '/dashboard/projects',
            p_reference_type: 'project',
            p_reference_id: (project as any).id
          })
        }
      }

      // Also notify the creator (admin/finance officer) if not already a representative
      const creatorIsRepresentative = representatives.some(rep => rep.user_id === ctx.user.id)
      if (!creatorIsRepresentative) {
        await (ctx.supabase as any).rpc('create_notification', {
          p_user_id: ctx.user.id,
          p_type: 'success',
          p_title: 'Proje Oluşturuldu',
          p_message: `${(project as any).code} - ${name} projesi başarıyla oluşturuldu.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/projects',
          p_reference_type: 'project',
          p_reference_id: (project as any).id
        })
      }

      return apiResponse.success(
        { project: completeProject },
        'Project created successfully'
      )
    } catch (error: any) {
      console.error('Project creation error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}