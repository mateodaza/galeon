import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import redis from '@adonisjs/redis/services/main'

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  requests: number
  /** Time window in seconds */
  window: number
  /** Key prefix for Redis */
  keyPrefix?: string
}

/**
 * Rate limit middleware using Redis sliding window
 */
export default class RateLimitMiddleware {
  private static readonly DEFAULT_OPTIONS: RateLimitOptions = {
    requests: 100,
    window: 60,
    keyPrefix: 'ratelimit',
  }

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: Partial<RateLimitOptions> = {}
  ): Promise<void> {
    const config = { ...RateLimitMiddleware.DEFAULT_OPTIONS, ...options }
    const identifier = this.getIdentifier(ctx)
    const key = `${config.keyPrefix}:${identifier}`

    const current = await redis.incr(key)

    // Set expiry on first request
    if (current === 1) {
      await redis.expire(key, config.window)
    }

    // Get TTL for headers
    const ttl = await redis.ttl(key)

    // Set rate limit headers
    ctx.response.header('X-RateLimit-Limit', config.requests.toString())
    ctx.response.header('X-RateLimit-Remaining', Math.max(0, config.requests - current).toString())
    ctx.response.header('X-RateLimit-Reset', (Math.floor(Date.now() / 1000) + ttl).toString())

    if (current > config.requests) {
      ctx.response.header('Retry-After', ttl.toString())
      return ctx.response.tooManyRequests({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
        retryAfter: ttl,
      })
    }

    return next()
  }

  /**
   * Get unique identifier for rate limiting
   * Uses authenticated user ID if available, otherwise IP address
   */
  private getIdentifier(ctx: HttpContext): string {
    // Try to get authenticated user
    try {
      const user = ctx.auth?.user
      if (user?.id) {
        return `user:${user.id}`
      }
    } catch {
      // Not authenticated, use IP
    }

    // Fall back to IP address
    const ip = ctx.request.ip()
    return `ip:${ip}`
  }
}
