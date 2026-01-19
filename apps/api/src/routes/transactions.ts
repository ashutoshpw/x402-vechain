/**
 * Transaction History Route Handlers
 * Provides endpoints for fetching settlement history
 */

import { Hono } from 'hono'
import { requireAuth, type AuthVariables } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { transactions } from '../db/schema.js'
import { eq, and, gte, lte, desc, sql, or, like } from 'drizzle-orm'

const transactionsRoutes = new Hono<{ Variables: AuthVariables }>()

/**
 * GET /transactions
 * Fetch transaction history with optional filtering
 */
transactionsRoutes.get('/transactions', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    
    // Parse query parameters
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit
    
    // Filter parameters
    const status = c.req.query('status')
    const token = c.req.query('token')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')
    const minAmount = c.req.query('minAmount')
    const maxAmount = c.req.query('maxAmount')
    const search = c.req.query('search') // For tx hash or recipient search
    
    // Build where conditions
    const conditions = [eq(transactions.userId, userId)]
    
    if (status) {
      conditions.push(eq(transactions.status, status))
    }
    
    if (token) {
      // Handle native VET (null token address)
      if (token.toLowerCase() === 'vet') {
        conditions.push(sql`${transactions.tokenAddress} IS NULL`)
      } else {
        conditions.push(eq(transactions.tokenAddress, token))
      }
    }
    
    if (startDate) {
      conditions.push(gte(transactions.createdAt, new Date(startDate)))
    }
    
    if (endDate) {
      conditions.push(lte(transactions.createdAt, new Date(endDate)))
    }
    
    // Amount filtering is complex with string storage, skip for now
    // Can be implemented with SQL casting if needed
    
    if (search) {
      const searchCondition = or(
        like(transactions.txHash, `%${search}%`),
        like(transactions.toAddress, `%${search}%`)
      )
      if (searchCondition) {
        conditions.push(searchCondition)
      }
    }
    
    // Fetch transactions
    const results = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset)
    
    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(and(...conditions))
    
    return c.json({
      transactions: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    }, 200)
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return c.json(
      {
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default transactionsRoutes
