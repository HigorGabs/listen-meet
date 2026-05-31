import { describe, expect, it } from 'vitest'
import { createRateLimiter, getClientIp } from './rate-limit'

describe('rate limit', () => {
  it('blocks requests after the configured limit until the window resets', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      maxRequests: 2,
    })

    expect(limiter.check('client', 0).allowed).toBe(true)
    expect(limiter.check('client', 100).allowed).toBe(true)
    expect(limiter.check('client', 200).allowed).toBe(false)
    expect(limiter.check('client', 1001).allowed).toBe(true)
  })

  it('extracts the first forwarded IP address', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })
})
