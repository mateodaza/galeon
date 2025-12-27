import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Silent auth middleware attempts to authenticate the user
 * but does NOT throw if authentication fails.
 *
 * Use this for routes that work for both authenticated and
 * unauthenticated users (e.g., public endpoints that show
 * extra data for logged-in users).
 */
export default class SilentAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    try {
      await ctx.auth.authenticate()
    } catch {
      // Silently ignore authentication errors
      // The route handler can check ctx.auth.isAuthenticated
    }

    return next()
  }
}
