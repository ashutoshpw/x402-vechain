/**
 * Analytics Route Handlers
 * Provides aggregated statistics for payments and API usage
 */

import { Hono } from 'hono'
import { requireAuth, type AuthVariables } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { transactions } from '../db/schema.js'
import { eq, and, gte, sql, desc } from 'drizzle-orm'

const analyticsRoutes = new Hono<{ Variables: AuthVariables }>()

/**
 * GET /analytics/stats
 * Get analytics statistics with time range filtering
 */
analyticsRoutes.get('/analytics/stats', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const timeRange = c.req.query('range') || '24h' // 24h, 7d, 30d

    // Calculate time threshold
    const now = new Date()
    let startDate: Date
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get total payment count and volume
    const totalStats = await db
      .select({
        totalCount: sql<number>`count(*)`,
        totalVolume: sql<string>`sum(CAST(${transactions.amount} AS NUMERIC))`,
        confirmedCount: sql<number>`count(*) filter (where ${transactions.status} = 'confirmed')`,
        failedCount: sql<number>`count(*) filter (where ${transactions.status} = 'failed')`,
        pendingCount: sql<number>`count(*) filter (where ${transactions.status} = 'pending')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, startDate)
        )
      )

    // Get payments by token
    const paymentsByToken = await db
      .select({
        tokenAddress: transactions.tokenAddress,
        count: sql<number>`count(*)`,
        volume: sql<string>`sum(CAST(${transactions.amount} AS NUMERIC))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, startDate)
        )
      )
      .groupBy(transactions.tokenAddress)

    // Get daily volume for line chart
    const dailyVolume = await db
      .select({
        date: sql<string>`DATE(${transactions.createdAt})`,
        count: sql<number>`count(*)`,
        volume: sql<string>`sum(CAST(${transactions.amount} AS NUMERIC))`,
        confirmedCount: sql<number>`count(*) filter (where ${transactions.status} = 'confirmed')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, startDate)
        )
      )
      .groupBy(sql`DATE(${transactions.createdAt})`)
      .orderBy(sql`DATE(${transactions.createdAt})`)

    // Get hourly API calls (approximation using transaction timestamps)
    const hourlyActivity = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${transactions.createdAt})`,
        count: sql<number>`count(*)`,
        verifyCount: sql<number>`count(*) filter (where ${transactions.status} = 'pending')`,
        settleCount: sql<number>`count(*) filter (where ${transactions.status} = 'confirmed' or ${transactions.status} = 'failed')`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.createdAt, startDate)
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${transactions.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${transactions.createdAt})`)

    // Calculate success rate
    const stats = totalStats[0] || {
      totalCount: 0,
      totalVolume: '0',
      confirmedCount: 0,
      failedCount: 0,
      pendingCount: 0,
    }

    const successRate = stats.totalCount > 0
      ? ((stats.confirmedCount / stats.totalCount) * 100).toFixed(2)
      : '0'

    return c.json({
      timeRange,
      summary: {
        totalPayments: stats.totalCount,
        totalVolume: stats.totalVolume || '0',
        confirmedPayments: stats.confirmedCount,
        failedPayments: stats.failedCount,
        pendingPayments: stats.pendingCount,
        successRate: parseFloat(successRate),
      },
      paymentsByToken: paymentsByToken.map(item => ({
        token: item.tokenAddress || 'VET',
        count: item.count,
        volume: item.volume || '0',
      })),
      dailyVolume: dailyVolume.map(item => ({
        date: item.date,
        count: item.count,
        volume: item.volume || '0',
        confirmedCount: item.confirmedCount,
      })),
      hourlyActivity: Array.from({ length: 24 }, (_, i) => {
        const hourData = hourlyActivity.find(h => h.hour === i)
        return {
          hour: i,
          total: hourData?.count || 0,
          verify: hourData?.verifyCount || 0,
          settle: hourData?.settleCount || 0,
        }
      }),
    }, 200)
  } catch (error) {
    console.error('Failed to fetch analytics:', error)
    return c.json(
      {
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default analyticsRoutes
