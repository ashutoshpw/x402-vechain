import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config()

const network = process.env.VECHAIN_NETWORK || 'testnet'
const connectionString = network === 'mainnet'
  ? process.env.DATABASE_URL_MAINNET || process.env.DATABASE_URL
  : process.env.DATABASE_URL_TESTNET || process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Database URL not configured')
}

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
