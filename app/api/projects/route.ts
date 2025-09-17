import { NextRequest } from 'next/server'
import { createProjectSchema, projectQuerySchema } from '@/lib/schemas/validation'
import { apiResponse, validateRequest, validateQuery, withAuth } from '@/lib/middleware/auth'

// GET /api/projects - List projects with filtering
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    // Validate query parameters
    const queryValidation = validateQuery(request, projectQuerySchema)
    if ('error' in queryValidation) {
      return queryValidation.error
    }

    const { status, search, created_by, page = 1, limit = 20, sort = 'created_at', order = 'desc' } = queryValidation.data

    try {
      let query = ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name),
          representatives:project_representatives(
            id,
            share_percentage,
            is_lead,
            user:users(id, full_name, email)
          )
        `)

      // Apply filters based on user role
      if (ctx.user.role === 'academician') {
        // Academicians can only see projects they're representatives of
        const { data: userProjects } = await ctx.supabase
          .from('project_representatives')
          .select('project_id')
          .eq('user_id', ctx.user.id)

        const projectIds = userProjects?.map(up => up.project_id) || []
        if (projectIds.length === 0) {
          // If user has no projects, return empty result
          return apiResponse.success({
            projects: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              pages: 0
            }
          })
        }

        query = query.in('id', projectIds)
      }

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
      }

      if (created_by) {
        query = query.eq('created_by', created_by)
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
    // Only admins and finance officers can create projects
    if (!['admin', 'finance_officer'].includes(ctx.user.role)) {
      return apiResponse.forbidden('Only admins and finance officers can create projects')
    }

    // Validate request data
    const validation = await validateRequest(request, createProjectSchema)
    if ('error' in validation) {
      return validation.error
    }

    const { name, budget, start_date, end_date, status = 'active', representatives, company_rate = 15, vat_rate = 18 } = validation.data

    try {
      // Start transaction
      const { data: project, error: projectError } = await ctx.supabase
        .from('projects')
        .insert({
          name,
          budget,
          start_date,
          end_date,
          status,
          company_rate,
          vat_rate,
          created_by: ctx.user.id
        })
        .select()
        .single()

      if (projectError) {
        console.error('Project creation error:', projectError)
        return apiResponse.error('Failed to create project', projectError.message, 500)
      }

      // Insert representatives
      const representativeData = representatives.map(rep => ({
        project_id: project.id,
        user_id: rep.user_id,
        share_percentage: rep.share_percentage,
        is_lead: rep.is_lead
      }))

      const { error: repError } = await ctx.supabase
        .from('project_representatives')
        .insert(representativeData)

      if (repError) {
        // Rollback: delete the created project
        await ctx.supabase.from('projects').delete().eq('id', project.id)
        console.error('Representatives creation error:', repError)
        return apiResponse.error('Failed to create project representatives', repError.message, 500)
      }

      // Fetch complete project data
      const { data: completeProject, error: fetchError } = await ctx.supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(full_name),
          representatives:project_representatives(
            id,
            share_percentage,
            is_lead,
            user:users(id, full_name, email)
          )
        `)
        .eq('id', project.id)
        .single()

      if (fetchError) {
        console.error('Project fetch error:', fetchError)
        return apiResponse.error('Project created but failed to fetch details', fetchError.message, 500)
      }

      // Create notifications for all project representatives
      for (const rep of representatives) {
        await ctx.supabase.rpc('create_notification', {
          p_user_id: rep.user_id,
          p_type: 'success',
          p_title: 'Yeni Proje',
          p_message: `${project.code} - ${name} projesine temsilci olarak atandınız.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/projects',
          p_reference_type: 'project',
          p_reference_id: project.id
        })
      }

      // Also notify the creator (admin/finance officer) if not already a representative
      const creatorIsRepresentative = representatives.some(rep => rep.user_id === ctx.user.id)
      if (!creatorIsRepresentative) {
        await ctx.supabase.rpc('create_notification', {
          p_user_id: ctx.user.id,
          p_type: 'success',
          p_title: 'Proje Oluşturuldu',
          p_message: `${project.code} - ${name} projesi başarıyla oluşturuldu.`,
          p_auto_hide: true,
          p_duration: 8000,
          p_action_label: 'Görüntüle',
          p_action_url: '/dashboard/projects',
          p_reference_type: 'project',
          p_reference_id: project.id
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