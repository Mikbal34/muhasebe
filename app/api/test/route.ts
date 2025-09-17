import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // Test 1: Basic connectivity
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })

    // Test 2: Try manual insert to see if RLS blocks it
    const testUserId = '00000000-0000-0000-0000-000000000000'
    const { data: insertTest, error: insertError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@test.com',
        full_name: 'Test User',
        role: 'academician',
        is_active: true
      })
      .select()

    // Clean up test record
    if (!insertError) {
      await supabase.from('users').delete().eq('id', testUserId)
    }

    // Test 3: Check existing users table structure
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('*')
      .limit(3)

    return apiResponse.success({
      message: 'Database diagnostics',
      user_count: users,
      manual_insert_test: insertTest ? 'SUCCESS' : 'FAILED: ' + insertError?.message,
      existing_users: existingUsers || 'Error: ' + existingError?.message,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
  } catch (error: any) {
    console.error('Test error:', error)
    return apiResponse.error('Test failed', error.message, 500)
  }
}