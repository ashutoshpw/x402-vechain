import type { Config } from 'drizzle-kit'

// For migration generation, use the DATABASE_URL directly from env
// SECURITY NOTE: The fallback connection string is only used for migration generation
// in development environments. Never use default credentials in production.
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
