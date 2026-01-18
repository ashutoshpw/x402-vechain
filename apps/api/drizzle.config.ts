import type { Config } from 'drizzle-kit'
import { getDatabaseUrl } from './src/config/env.js'

const connectionString = getDatabaseUrl()

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
} satisfies Config
