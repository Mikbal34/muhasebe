import { NextRequest } from 'next/server'
import { withManager, apiResponse } from '@/lib/middleware/auth'
import { z } from 'zod'

const personnelSchema = z.object({
  full_name: z.string().min(1, 'Ad soyad gereklidir'),
  email: z.string().email('Geçerli bir email adresi giriniz'),
  phone: z.string().nullable().optional(),
  iban: z.string().length(26, 'IBAN 26 karakter olmalıdır').nullable().optional(),
  tc_no: z.string().length(11, 'TC Kimlik No 11 karakter olmalıdır').nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
})

// GET: List all personnel
export async function GET(request: NextRequest) {
  return withManager(request, async (req, ctx) => {
    try {
      const { searchParams } = new URL(request.url)
      const search = searchParams.get('search')
      const includeInactive = searchParams.get('include_inactive') === 'true'
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100)
      const offset = parseInt(searchParams.get('offset') || '0')

      const { supabase } = ctx

      let query = supabase
        .from('personnel')
        .select('*', { count: 'exact' })
        .order('full_name', { ascending: true })
        .range(offset, offset + limit - 1)

      // Filter by active status
      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      // Search by name or email
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      }

      const { data: personnel, error, count } = await query

      if (error) {
        return apiResponse.error('Failed to fetch personnel', error.message, 500)
      }

      return apiResponse.success({
        personnel: personnel || [],
        total: count || 0,
        limit,
        offset,
      })
    } catch (error: any) {
      console.error('GET /api/personnel error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

// POST: Create new personnel
export async function POST(request: NextRequest) {
  return withManager(request, async (req, ctx) => {
    try {
      const body = await request.json()
      const validation = personnelSchema.safeParse(body)

      if (!validation.success) {
        return apiResponse.validationError(
          validation.error.errors.map(e => e.message)
        )
      }

      const {
        full_name,
        email,
        phone,
        iban,
        tc_no,
        notes,
        is_active,
      } = validation.data

      const { supabase, user } = ctx

      // Check if email already exists in personnel
      const { data: existingPersonnel } = await supabase
        .from('personnel')
        .select('id')
        .eq('email', email)
        .single()

      if (existingPersonnel) {
        return apiResponse.error(
          'Email already exists',
          'Bu email adresi zaten kayıtlı',
          400
        )
      }

      // Check if email exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        return apiResponse.error(
          'Email already exists',
          'Bu email adresi sistem kullanıcıları arasında zaten kayıtlı',
          400
        )
      }

      // Create personnel
      const { data: personnel, error: personnelError } = await (supabase as any)
        .from('personnel')
        .insert({
          full_name,
          email,
          phone: phone || null,
          iban: iban || null,
          tc_no: tc_no || null,
          notes: notes || null,
          is_active,
        })
        .select()
        .single()

      if (personnelError) {
        return apiResponse.error('Failed to create personnel', personnelError.message, 500)
      }

      // Create audit log
      await (supabase as any).rpc('create_audit_log', {
        p_user_id: user.id,
        p_action: 'CREATE',
        p_entity_type: 'personnel',
        p_entity_id: personnel.id,
        p_new_values: {
          full_name,
          email,
          phone,
          iban,
          tc_no,
          notes,
          is_active,
        },
      })

      return apiResponse.success(
        { personnel },
        `Personel ${full_name} başarıyla oluşturuldu`
      )
    } catch (error: any) {
      console.error('POST /api/personnel error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
