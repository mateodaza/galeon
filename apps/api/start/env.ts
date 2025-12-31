/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Redis connection
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string.optional(),
  REDIS_PORT: Env.schema.number.optional(),
  REDIS_PASSWORD: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for SIWE authentication
  |----------------------------------------------------------
  */
  SIWE_DOMAIN: Env.schema.string.optional(),
  SIWE_URI: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for chain configuration
  |----------------------------------------------------------
  */
  CHAIN_ID: Env.schema.number.optional(),
  ALLOWED_CHAIN_IDS: Env.schema.string.optional(),
  RPC_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for relayer configuration
  |----------------------------------------------------------
  */
  RELAYER_PRIVATE_KEY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for Ponder webhook
  |----------------------------------------------------------
  */
  PONDER_WEBHOOK_SECRET: Env.schema.string.optional(),
  REDIS_QUEUE: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for Ponder indexer database (read-only)
  |----------------------------------------------------------
  */
  PONDER_DB_HOST: Env.schema.string.optional(),
  PONDER_DB_PORT: Env.schema.number.optional(),
  PONDER_DB_USER: Env.schema.string.optional(),
  PONDER_DB_PASSWORD: Env.schema.string.optional(),
  PONDER_DB_DATABASE: Env.schema.string.optional(),
})
