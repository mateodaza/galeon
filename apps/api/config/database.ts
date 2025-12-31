import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    // Ponder indexer database (read-only)
    ponder: {
      client: 'pg',
      connection: {
        host: env.get('PONDER_DB_HOST'),
        port: env.get('PONDER_DB_PORT'),
        user: env.get('PONDER_DB_USER'),
        password: env.get('PONDER_DB_PASSWORD'),
        database: env.get('PONDER_DB_DATABASE'),
      },
    },
  },
})

export default dbConfig
