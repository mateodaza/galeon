import env from '#start/env'
import { defineConfig } from '@adonisjs/redis'
import type { InferConnections } from '@adonisjs/redis/types'

const redisConfig = defineConfig({
  connection: 'main',
  connections: {
    main: {
      host: env.get('REDIS_HOST'),
      port: env.get('REDIS_PORT'),
      password: env.get('REDIS_PASSWORD', ''),
      db: 0,
      keyPrefix: 'galeon:',
    },
  },
})

export default redisConfig

declare module '@adonisjs/redis/types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RedisConnections extends InferConnections<typeof redisConfig> {}
}
