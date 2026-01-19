import type { Config } from 'drizzle-kit'

// For migration generation, use the DATABASE_URL directly from env
const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/x402_testnet'

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
