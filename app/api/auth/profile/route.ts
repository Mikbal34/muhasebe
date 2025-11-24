import { NextRequest } from 'next/server'
import { withAuth, apiResponse } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const { supabase, user } = ctx

      // Get full user profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Profile fetch error:', error)
        return apiResponse.error('Profile not found', error.message, 404)
      }

      return apiResponse.success({ profile })
    } catch (error: any) {
      console.error('GET /api/auth/profile error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, ctx) => {
    try {
      const { supabase, user } = ctx
      const body = await request.json()

      const { full_name, email, phone, iban } = body

      // Validate required fields
      if (!full_name || !email) {
        return apiResponse.error('Validation failed', 'Full name and email are required', 400)
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return apiResponse.error('Validation failed', 'Invalid email format', 400)
      }

      // Phone validation (optional)
      if (phone) {
        const phoneRegex = /^(\+90|0)?[1-9]\d{9}$/
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
          return apiResponse.error('Validation failed', 'Invalid phone number format', 400)
        }
      }

      // IBAN validation (optional)
      if (iban) {
        const ibanRegex = /^TR\d{24}$/
        if (!ibanRegex.test(iban.replace(/\s/g, ''))) {
          return apiResponse.error('Validation failed', 'Invalid IBAN format', 400)
        }
      }

      // Update user profile
      const { data: updatedProfile, error } = await (supabase as any)
        .from('users')
        .update({
          full_name: full_name.trim(),
          email: email.trim(),
          phone: phone ? phone.trim() : null,
          iban: iban ? iban.replace(/\s/g, '') : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Profile update error:', error)
        return apiResponse.error('Profile update failed', error.message, 500)
      }

      // Also update auth email if changed
      if (email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: email.trim()
        })

        if (authError) {
          console.error('Auth email update error:', authError)
          // Don't fail the request, just log the error
        }
      }

      return apiResponse.success(
        { profile: updatedProfile },
        'Profile updated successfully'
      )
    } catch (error: any) {
      console.error('PUT /api/auth/profile error:', error)
      return apiResponse.error('Internal server error', error.message, 500)
    }
  })
}
