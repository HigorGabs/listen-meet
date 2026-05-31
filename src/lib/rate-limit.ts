interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function createRateLimiter({ windowMs, maxRequests }: RateLimitOptions) {
  const entries = new Map<string, RateLimitEntry>()

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      for (const [entryKey, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(entryKey)
      }

      const existing = entries.get(key)

      if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs
        entries.set(key, { count: 1, resetAt })
        return {
          allowed: true,
          remaining: maxRequests - 1,
          resetAt,
        }
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: existing.resetAt,
        }
      }

      existing.count += 1
      return {
        allowed: true,
        remaining: maxRequests - existing.count,
        resetAt: existing.resetAt,
      }
    },
  }
}

function getPlatformClientIp(request: Request): string {
  const platformRequest = request as Request & { ip?: unknown }
  return typeof platformRequest.ip === 'string' ? platformRequest.ip.trim() : ''
}

export function getClientIp(request: Request): string {
  const platformIp = getPlatformClientIp(request)
  if (platformIp) return platformIp

  const trustProxyHeaders = process.env.LISTEN_MEET_TRUST_PROXY_HEADERS === 'true'
  if (!trustProxyHeaders) return 'unknown'

  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  return forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
}

export const processAudioLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 8,
})

export const modelsLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 60,
})
