import { NextRequest, NextResponse } from 'next/server'
import { getRateLimitData, setRateLimitData, getRedis } from '@/lib/redis'

// In-memory store for rate limiting (fallback when Redis not available)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically (only for in-memory fallback)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    rateLimitStore.forEach((value, key) => {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    })
  }, 60000) // Clean every minute
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

// Pre-defined rate limit configurations
export const RATE_LIMITS = {
  // Strict limit for auth endpoints (5 requests per minute)
  auth: { windowMs: 60 * 1000, maxRequests: 5 },
  // Standard API limit (100 requests per minute)
  api: { windowMs: 60 * 1000, maxRequests: 100 },
  // Very strict for password reset (3 requests per 15 minutes)
  passwordReset: { windowMs: 15 * 60 * 1000, maxRequests: 3 },
} as const

/**
 * Get client identifier for rate limiting
 * Uses IP address, falls back to a generic key
 */
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }

  return 'unknown-client'
}

/**
 * Check rate limit using in-memory store (sync, fallback)
 */
function checkRateLimitInMemory(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    }
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: existing.resetTime - now
    }
  }

  existing.count++
  rateLimitStore.set(key, existing)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetIn: existing.resetTime - now
  }
}

/**
 * Check rate limit using Redis (async, production)
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const now = Date.now()
  const existing = await getRateLimitData(key)

  if (!existing || existing.resetTime < now) {
    const newData = {
      count: 1,
      resetTime: now + config.windowMs
    }
    const ttlSeconds = Math.ceil(config.windowMs / 1000)
    await setRateLimitData(key, newData, ttlSeconds)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs
    }
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: existing.resetTime - now
    }
  }

  existing.count++
  const ttlSeconds = Math.ceil((existing.resetTime - now) / 1000)
  await setRateLimitData(key, existing, ttlSeconds)

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetIn: existing.resetTime - now
  }
}

/**
 * Check if request should be rate limited
 * Uses Redis if available, falls back to in-memory
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  prefix: string = 'default'
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const clientId = getClientIdentifier(request)
  const key = `ratelimit:${prefix}:${clientId}`

  // Try Redis first
  const redis = getRedis()
  if (redis) {
    return checkRateLimitRedis(key, config)
  }

  // Fallback to in-memory
  return checkRateLimitInMemory(key, config)
}

/**
 * Sync version for backward compatibility (in-memory only)
 */
export function checkRateLimitSync(
  request: NextRequest,
  config: RateLimitConfig,
  prefix: string = 'default'
): { allowed: boolean; remaining: number; resetIn: number } {
  const clientId = getClientIdentifier(request)
  const key = `ratelimit:${prefix}:${clientId}`
  return checkRateLimitInMemory(key, config)
}

/**
 * Rate limit response helper
 */
export function rateLimitResponse(resetIn: number): NextResponse {
  const retryAfter = Math.ceil(resetIn / 1000)

  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests',
      message: `Çok fazla istek gönderdiniz. ${retryAfter} saniye sonra tekrar deneyin.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetIn / 1000)),
      },
    }
  )
}

/**
 * Rate limiting middleware wrapper (async, supports Redis)
 * Use this in API routes to apply rate limiting
 */
export function withRateLimit(
  config: RateLimitConfig,
  prefix: string = 'api'
) {
  return function<T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T {
    return (async (request: NextRequest, ...args: any[]) => {
      const result = await checkRateLimit(request, config, prefix)

      if (!result.allowed) {
        return rateLimitResponse(result.resetIn)
      }

      const response = await handler(request, ...args)

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)))

      return response
    }) as T
  }
}
