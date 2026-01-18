import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// Load environment variables
config()

// Get database URL from environment
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
