import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/upload - Upload file to storage
export async function POST(request: NextRequest) {
  try {
    // Check for Authorization header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const adminSupabase = await createAdminClient()

    // Verify the token
    const { data: { user: authUser }, error: authError } = await adminSupabase.auth.getUser(token)
    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is active
    const { data: user, error: profileError } = await adminSupabase
      .from('users')
      .select('id, is_active')
      .eq('id', authUser.id)
      .single()

    if (profileError || !user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 403 }
      )
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = formData.get('bucket') as string || 'contracts'

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type (only PDF allowed for contracts)
    if (bucket === 'contracts' && file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        path: fileName,
        bucket: bucket
      }
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
