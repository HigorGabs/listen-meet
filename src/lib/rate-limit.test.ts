import { afterEach, describe, expect, it } from 'vitest'
import { createRateLimiter, getClientIp } from './rate-limit'

describe('rate limit', () => {
  afterEach(() => {
    delete process.env.LISTEN_MEET_TRUST_PROXY_HEADERS
  })

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

  it('trusts forwarded IP headers by default unless proxy trust is explicitly disabled', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('does not trust forwarded IP headers if proxy trust is explicitly disabled', () => {
    process.env.LISTEN_MEET_TRUST_PROXY_HEADERS = 'false'
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
      },
    })

    expect(getClientIp(request)).toBe('unknown')
  })

  it('uses a platform-provided request IP before considering proxy headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
      },
    })
    Object.defineProperty(request, 'ip', {
      configurable: true,
      value: '198.51.100.10',
    })

    expect(getClientIp(request)).toBe('198.51.100.10')
  })

  it('extracts the first forwarded IP address only behind a trusted proxy', () => {
    process.env.LISTEN_MEET_TRUST_PROXY_HEADERS = 'true'
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 198.51.100.2',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })
})
