import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { createHmac } from 'node:crypto'
import env from '#start/env'

/**
 * Webhook authentication middleware
 * Verifies Alchemy webhook signatures
 */
export default class WebhookAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    const signature = ctx.request.header('x-alchemy-signature')

    if (!signature) {
      return ctx.response.unauthorized({
        error: 'Missing webhook signature',
      })
    }

    const webhookSecret = env.get('ALCHEMY_WEBHOOK_SECRET')
    if (!webhookSecret) {
      return ctx.response.internalServerError({
        error: 'Webhook secret not configured',
      })
    }

    // Get raw body for signature verification
    const rawBody = ctx.request.raw()
    if (!rawBody) {
      return ctx.response.badRequest({
        error: 'Missing request body',
      })
    }

    // Verify HMAC signature
    const expectedSignature = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

    if (signature !== expectedSignature) {
      return ctx.response.unauthorized({
        error: 'Invalid webhook signature',
      })
    }

    return next()
  }
}
