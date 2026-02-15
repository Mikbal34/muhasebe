import { NextRequest } from 'next/server'
import { withManager, withAdmin, apiResponse } from '@/lib/middleware/auth'
import { z } from 'zod'

const updatePersonnelSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  iban: z.string().length(26).nullable().optional(),
  tc_no: z.string().length(11).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  title: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  university: z.string().nullable().optional(),
})

// GET: Get single personnel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManager(request, async (req, ctx) => {
    try {
      const { id } = params
      const { supabase } = ctx

      const { data: personnel, error } = await supabase
        .from('personnel')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !personnel) {
        return apiResponse.error('Personnel not found', 'Personel bulunamadı', 404)
      }

      // Get personnel's balance
      const { data: balance } = await supabase
        .from('balances')
        .select('*')
        .eq('personnel_id', id)
        .single()

      // Get personnel's projects
      const { data: projects } = await supabase
        .from('project_representatives')
        .select(`
          id,
          role,
          created_at,
          projects (
            id,
            code,
            name,
            status,
            is_active
          )
        `)
        .eq('personnel_id', id)
        .order('created_at', { ascending: false })

      return apiResponse.success({
        personnel,
        balance: balance || null,
        projects: projects || [],
      })
    } catch (error: any) {
      console.error(`GET /api/personnel/${params.id} error:`, error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// PUT: Update personnel
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withManager(request, async (req, ctx) => {
    try {
      const { id } = params
      const body = await request.json()
      const validation = updatePersonnelSchema.safeParse(body)

      if (!validation.success) {
        return apiResponse.validationError(
          validation.error.errors.map(e => e.message)
        )
      }

      const { supabase, user } = ctx

      // Get current personnel data for audit
      const { data: oldPersonnel, error: fetchError } = await supabase
        .from('personnel')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !oldPersonnel) {
        return apiResponse.error('Personnel not found', 'Personel bulunamadı', 404)
      }

      // If email is changing, check if new email exists
      if (body.email && body.email !== oldPersonnel.email) {
        const { data: existingPersonnel } = await supabase
          .from('personnel')
          .select('id')
          .eq('email', body.email)
          .neq('id', id)
          .single()

        if (existingPersonnel) {
          return apiResponse.error(
            'Email already exists',
            'Bu email adresi zaten kullanılıyor',
            400
          )
        }

        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', body.email)
          .single()

        if (existingUser) {
          return apiResponse.error(
            'Email already exists',
            'Bu email adresi sistem kullanıcıları arasında kayıtlı',
            400
          )
        }
      }

      // Build update data
      const updateData: any = {}
      if (body.full_name !== undefined) updateData.full_name = body.full_name
      if (body.email !== undefined) updateData.email = body.email
      if (body.phone !== undefined) updateData.phone = body.phone || null
      if (body.iban !== undefined) updateData.iban = body.iban || null
      if (body.tc_no !== undefined) updateData.tc_no = body.tc_no || null
      if (body.notes !== undefined) updateData.notes = body.notes || null
      if (body.is_active !== undefined) updateData.is_active = body.is_active
      if (body.title !== undefined) updateData.title = body.title || null
      if (body.gender !== undefined) updateData.gender = body.gender || null
      if (body.start_date !== undefined) updateData.start_date = body.start_date || null
      if (body.faculty !== undefined) updateData.faculty = body.faculty || null
      if (body.department !== undefined) updateData.department = body.department || null
      if (body.university !== undefined) updateData.university = body.university || null

      if (Object.keys(updateData).length === 0) {
        return apiResponse.error('No updates provided', 'Güncellenecek alan yok', 400)
      }

      // Update personnel
      const { data: personnel, error: updateError } = await (supabase as any)
        .from('personnel')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return apiResponse.error('Failed to update personnel', updateError.message, 500)
      }

      // Create audit log
      await (supabase as any).rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: 'UPDATE',
        p_entity_type: 'personnel',
        p_entity_id: id,
        p_old_values: oldPersonnel,
        p_new_values: updateData,
      })

      return apiResponse.success(
        { personnel },
        `Personel bilgileri güncellendi`
      )
    } catch (error: any) {
      console.error(`PUT /api/personnel/${params.id} error:`, error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// DELETE: Delete personnel (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAdmin(request, async (req, ctx) => {
    try {
      const { id } = params
      const { supabase, user } = ctx

      // Get personnel data for audit
      const { data: personnel, error: fetchError } = await supabase
        .from('personnel')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !personnel) {
        return apiResponse.error('Personnel not found', 'Personel bulunamadı', 404)
      }

      // Check if personnel has any projects
      const { data: projects, count } = await supabase
        .from('project_representatives')
        .select('id', { count: 'exact' })
        .eq('personnel_id', id)

      if (count && count > 0) {
        return apiResponse.error(
          'Cannot delete personnel',
          `Personel ${count} projede yer aldığı için silinemez. Önce projelerden çıkarın.`,
          400
        )
      }

      // Check if personnel has balance
      const { data: balance } = await supabase
        .from('balances')
        .select('available_amount, debt_amount')
        .eq('personnel_id', id)
        .single()

      if (balance && (balance.available_amount !== 0 || balance.debt_amount !== 0)) {
        return apiResponse.error(
          'Cannot delete personnel',
          'Personelin bakiyesi veya borcu olduğu için silinemez. Önce bakiyeyi sıfırlayın.',
          400
        )
      }

      // Delete personnel (will cascade delete balance)
      const { error: deleteError } = await supabase
        .from('personnel')
        .delete()
        .eq('id', id)

      if (deleteError) {
        return apiResponse.error('Failed to delete personnel', deleteError.message, 500)
      }

      // Create audit log
      await (supabase as any).rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: 'DELETE',
        p_entity_type: 'personnel',
        p_entity_id: id,
        p_old_values: personnel,
      })

      return apiResponse.success(
        null,
        `Personel ${personnel.full_name} silindi`
      )
    } catch (error: any) {
      console.error(`DELETE /api/personnel/${params.id} error:`, error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
