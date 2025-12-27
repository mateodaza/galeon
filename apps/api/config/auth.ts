import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import { jwtGuard } from '@maximemrf/adonisjs-jwt/jwt_config'
import type { JwtGuardUser, BaseJwtContent } from '@maximemrf/adonisjs-jwt/types'
import type { InferAuthenticators, InferAuthEvents } from '@adonisjs/auth/types'
import env from '#start/env'

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

const authConfig = defineConfig({
  default: 'jwt',
  guards: {
    jwt: jwtGuard({
      tokenExpiresIn: '7d',
      useCookies: false,
      secret: env.get('APP_KEY'),
      provider: userProvider,
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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
declare module '@adonisjs/core/types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EventsList extends InferAuthEvents<InferAuthenticators<typeof authConfig>> {}
}
