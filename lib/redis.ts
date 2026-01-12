import { Redis } from '@upstash/redis'

// Upstash Redis client
// Ücretsiz tier: 10,000 istek/gün
// Kurulum: https://upstash.com/

// .env.local'a ekle:
// UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
// UPSTASH_REDIS_REST_TOKEN=xxx

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    // Redis config yoksa null döner, fallback to in-memory
    console.warn('[Redis] UPSTASH_REDIS_REST_URL veya UPSTASH_REDIS_REST_TOKEN tanımlı değil. In-memory rate limiting kullanılıyor.')
    return null
  }

  redis = new Redis({
    url,
    token,
  })

  return redis
}

// Rate limiting için helper
export async function getRateLimitData(key: string): Promise<{ count: number; resetTime: number } | null> {
  const client = getRedis()
  if (!client) return null

  try {
    const data = await client.get<{ count: number; resetTime: number }>(key)
    return data
  } catch (error) {
    console.error('[Redis] getRateLimitData error:', error)
    return null
  }
}

export async function setRateLimitData(key: string, data: { count: number; resetTime: number }, ttlSeconds: number): Promise<boolean> {
  const client = getRedis()
  if (!client) return false

  try {
    await client.set(key, data, { ex: ttlSeconds })
    return true
  } catch (error) {
    console.error('[Redis] setRateLimitData error:', error)
    return false
  }
}
