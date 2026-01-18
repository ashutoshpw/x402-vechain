import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema.js'
import { getDatabaseUrl } from '../config/env.js'

/**
 * Create PostgreSQL connection with pooling
 */
const connectionString = getDatabaseUrl()

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
