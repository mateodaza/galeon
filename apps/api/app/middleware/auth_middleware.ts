import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import redis from '@adonisjs/redis/services/main'

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 *
 * Also checks if the JWT token has been blacklisted (logged out).
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    // Check if token is blacklisted before authentication
    const authHeader = ctx.request.header('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const isBlacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`)

      if (isBlacklisted) {
        return ctx.response.unauthorized({
          error: 'Token has been revoked',
        })
      }
    }

    // Proceed with normal JWT authentication
    await ctx.auth.authenticateUsing(options.guards)
    return next()
  }
}
