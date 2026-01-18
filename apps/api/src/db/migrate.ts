import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sql, closeDatabase } from './index.js'

/**
 * Run all pending migrations
 */
async function runMigrations() {
  console.log('⏳ Running migrations...')

  try {
    await migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await closeDatabase()
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration process failed:', error)
      process.exit(1)
    })
}

export { runMigrations }
