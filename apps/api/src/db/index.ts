import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import { config } from 'dotenv'

// Load environment variables
config()

/**
 * Database configuration based on environment
 */
const getDatabaseUrl = (): string => {
  const network = process.env.VECHAIN_NETWORK || 'testnet'
  
  if (network === 'mainnet') {
    return process.env.DATABASE_URL_MAINNET || process.env.DATABASE_URL || ''
  }
  
  return process.env.DATABASE_URL_TESTNET || process.env.DATABASE_URL || ''
}

/**
 * Create PostgreSQL connection with pooling
 */
const connectionString = getDatabaseUrl()

if (!connectionString) {
  throw new Error(
    'Database URL not found. Please set DATABASE_URL, DATABASE_URL_TESTNET, or DATABASE_URL_MAINNET environment variable.'
  )
}

// Connection pool configuration
const sql = postgres(connectionString, {
  max: 10, // Maximum number of connections in the pool
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better compatibility with pgBouncer
})

/**
 * Drizzle ORM instance with schema
 */
export const db = drizzle(sql, { schema })

/**
 * Export the postgres client for direct access if needed
 */
export { sql }

/**
 * Close database connections gracefully
 */
export const closeDatabase = async () => {
  await sql.end()
}
