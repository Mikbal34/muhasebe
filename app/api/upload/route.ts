import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Allowed buckets - whitelist to prevent arbitrary bucket access
const ALLOWED_BUCKETS = ['contracts', 'documents'] as const
type AllowedBucket = typeof ALLOWED_BUCKETS[number]

// Allowed file types per bucket with magic number signatures
const BUCKET_CONFIG: Record<AllowedBucket, {
  allowedTypes: string[]
  maxSize: number
  magicNumbers?: { bytes: number[], offset: number }[]
}> = {
  contracts: {
    allowedTypes: ['application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    // PDF magic number: %PDF- (0x25 0x50 0x44 0x46 0x2D)
    magicNumbers: [{ bytes: [0x25, 0x50, 0x44, 0x46, 0x2D], offset: 0 }]
  },
  documents: {
    allowedTypes: ['application/pdf', 'image/png', 'image/jpeg'],
    maxSize: 10 * 1024 * 1024, // 10MB
    magicNumbers: [
      { bytes: [0x25, 0x50, 0x44, 0x46, 0x2D], offset: 0 }, // PDF
      { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0 }, // PNG
      { bytes: [0xFF, 0xD8, 0xFF], offset: 0 } // JPEG
    ]
  }
}

// Validate file by checking magic numbers
async function validateFileMagicNumber(buffer: Buffer, bucket: AllowedBucket): Promise<boolean> {
  const config = BUCKET_CONFIG[bucket]
  if (!config.magicNumbers || config.magicNumbers.length === 0) return true

  for (const magic of config.magicNumbers) {
    const slice = buffer.slice(magic.offset, magic.offset + magic.bytes.length)
    if (magic.bytes.every((byte, i) => slice[i] === byte)) {
      return true
    }
  }
  return false
}

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
    const bucketParam = formData.get('bucket') as string || 'contracts'
    const projectId = formData.get('project_id') as string | null
    const category = formData.get('category') as string | null

    // Validate bucket against whitelist
    if (!ALLOWED_BUCKETS.includes(bucketParam as AllowedBucket)) {
      return NextResponse.json(
        { success: false, error: 'Invalid storage bucket' },
        { status: 400 }
      )
    }
    const bucket = bucketParam as AllowedBucket
    const config = BUCKET_CONFIG[bucket]

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate MIME type against bucket's allowed types
    if (!config.allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Bu depolama alanına yalnızca ${config.allowedTypes.join(', ')} dosyaları yüklenebilir` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > config.maxSize) {
      return NextResponse.json(
        { success: false, error: `Dosya boyutu ${config.maxSize / (1024 * 1024)}MB'dan küçük olmalıdır` },
        { status: 400 }
      )
    }

    // Convert File to ArrayBuffer then to Buffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate file content by checking magic numbers (prevents MIME type spoofing)
    const isValidMagic = await validateFileMagicNumber(buffer, bucket)
    if (!isValidMagic) {
      return NextResponse.json(
        { success: false, error: 'Dosya içeriği belirtilen türle eşleşmiyor' },
        { status: 400 }
      )
    }

    // Generate unique filename with sanitized extension
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const sanitizedOriginalName = file.name
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u0400-\u04FF\u00E0-\u00FC]/g, '_') // keep alphanumeric + accented chars
      .substring(0, 100) // limit length

    // If project_id and category provided, use structured path
    const allowedCategories = ['sozlesme', 'gorevlendirme', 'hakem_onay', 'ek_sozlesme']
    let fileName: string
    if (projectId && category && allowedCategories.includes(category)) {
      fileName = `${projectId}/${category}/${Date.now()}_${sanitizedOriginalName}.${fileExt}`
    } else {
      fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
    }

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
