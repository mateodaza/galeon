import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import { tokensUserProvider } from '@adonisjs/auth/access_tokens'
import { jwtGuard } from '@maximemrf/adonisjs-jwt/jwt_config'
import type { JwtGuardUser, BaseJwtContent } from '@maximemrf/adonisjs-jwt/types'
import type { InferAuthenticators, InferAuthEvents } from '@adonisjs/auth/types'
import env from '#start/env'

/**
 * JWT access token expiry configuration
 * Single source of truth for token lifetime
 */
export const JWT_ACCESS_TOKEN_EXPIRY = '15m'
export const JWT_ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60

/**
 * JWT token payload content
 */
interface JwtContent extends BaseJwtContent {
  userId: number
  walletAddress: string
}

const userProvider = sessionUserProvider({
  model: () => import('#models/user'),
})

const refreshTokenProvider = tokensUserProvider({
  tokens: 'refreshTokens',
  model: () => import('#models/user'),
})

const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      tokenExpiresIn: JWT_ACCESS_TOKEN_EXPIRY,
      useCookies: false,
      secret: env.get('APP_KEY'),
      provider: userProvider,
      refreshTokenUserProvider: refreshTokenProvider,
      content: <T>(user: JwtGuardUser<T>): JwtContent => ({
        userId: user.getId() as number,
        walletAddress: (user.getOriginal() as { walletAddress: string }).walletAddress,
      }),
    }),
  },
})

export default authConfig

/**
 * Inferring types from the configured auth guards.
 */
declare module '@adonisjs/auth/types' {
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  interface EventsList extends InferAuthEvents<InferAuthenticators<typeof authConfig>> {}
}
