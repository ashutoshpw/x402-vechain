/**
 * API Key Management Routes
 * Endpoints for managing API keys
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  createApiKey,
  listUserApiKeys,
  revokeApiKey,
  updateApiKey,
  maskApiKey,
} from '../services/ApiKeyService.js'
import { db } from '../db/index.js'
import { apiKeys, transactions } from '../db/schema.js'
import { eq, and, sql, desc } from 'drizzle-orm'

const apiKeyRoutes = new Hono()

// Validation schemas
const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  rateLimit: z.number().int().positive().optional().default(1000),
  allowedDomains: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
})

const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rateLimit: z.number().int().positive().optional(),
  allowedDomains: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
})

/**
 * Middleware to extract user ID from request
 * In a real implementation, this would validate JWT or session
 * For now, we'll use a header or create a mock user
 */
const requireAuth = async (c: any, next: any) => {
  // TODO: Implement proper authentication
  // For now, check for X-User-ID header (development only)
  const userId = c.req.header('X-User-ID')
  
  if (!userId) {
    return c.json({ error: 'Authentication required' }, 401)
  }
  
  c.set('userId', userId)
  await next()
}

// Apply auth middleware to all routes
apiKeyRoutes.use('/*', requireAuth)

/**
 * POST /api/keys
 * Create a new API key
 */
apiKeyRoutes.post('/', zValidator('json', CreateApiKeySchema), async (c) => {
  const userId = c.get('userId')
  const body = c.req.valid('json')
  
  try {
    const newKey = await createApiKey({
      userId,
      name: body.name,
      rateLimit: body.rateLimit,
      allowedDomains: body.allowedDomains,
      permissions: body.permissions,
    })
    
    // Return the full key only once (on creation)
    return c.json({
      id: newKey.id,
      name: newKey.name,
      key: newKey.fullKey, // Full key shown only once!
      keyPrefix: newKey.keyPrefix,
      maskedKey: maskApiKey(newKey.keyPrefix, newKey.fullKey),
      rateLimit: newKey.rateLimit,
      allowedDomains: newKey.allowedDomains,
      permissions: newKey.permissions,
      createdAt: newKey.createdAt,
    }, 201)
  } catch (error) {
    console.error('Error creating API key:', error)
    return c.json({ 
      error: 'Failed to create API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /api/keys
 * List all API keys for the authenticated user
 */
apiKeyRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  
  try {
    const keys = await listUserApiKeys(userId)
    
    // Transform keys to include masked display
    const keysWithMask = keys.map(key => ({
      id: key.id,
      name: key.name,
      maskedKey: maskApiKey(key.keyPrefix),
      keyPrefix: key.keyPrefix,
      rateLimit: key.rateLimit,
      allowedDomains: key.allowedDomains,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    }))
    
    return c.json({ keys: keysWithMask })
  } catch (error) {
    console.error('Error listing API keys:', error)
    return c.json({ 
      error: 'Failed to list API keys',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /api/keys/:id
 * Get details of a specific API key
 */
apiKeyRoutes.get('/:id', async (c) => {
  const userId = c.get('userId')
  const keyId = c.req.param('id')
  
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, userId)
        )
      )
      .limit(1)
    
    if (!key) {
      return c.json({ error: 'API key not found' }, 404)
    }
    
    return c.json({
      id: key.id,
      name: key.name,
      maskedKey: maskApiKey(key.keyPrefix),
      keyPrefix: key.keyPrefix,
      rateLimit: key.rateLimit,
      allowedDomains: key.allowedDomains,
      permissions: key.permissions,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    })
  } catch (error) {
    console.error('Error getting API key:', error)
    return c.json({ 
      error: 'Failed to get API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * PATCH /api/keys/:id
 * Update API key settings
 */
apiKeyRoutes.patch('/:id', zValidator('json', UpdateApiKeySchema), async (c) => {
  const userId = c.get('userId')
  const keyId = c.req.param('id')
  const updates = c.req.valid('json')
  
  try {
    const updatedKey = await updateApiKey(keyId, userId, updates)
    
    if (!updatedKey) {
      return c.json({ error: 'API key not found' }, 404)
    }
    
    return c.json({
      id: updatedKey.id,
      name: updatedKey.name,
      maskedKey: maskApiKey(updatedKey.keyPrefix),
      rateLimit: updatedKey.rateLimit,
      allowedDomains: updatedKey.allowedDomains,
      permissions: updatedKey.permissions,
      updatedAt: updatedKey.updatedAt,
    })
  } catch (error) {
    console.error('Error updating API key:', error)
    return c.json({ 
      error: 'Failed to update API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * DELETE /api/keys/:id
 * Revoke an API key
 */
apiKeyRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const keyId = c.req.param('id')
  
  try {
    const revokedKey = await revokeApiKey(keyId, userId)
    
    if (!revokedKey) {
      return c.json({ error: 'API key not found' }, 404)
    }
    
    return c.json({
      message: 'API key revoked successfully',
      id: revokedKey.id,
      revokedAt: revokedKey.revokedAt,
    })
  } catch (error) {
    console.error('Error revoking API key:', error)
    return c.json({ 
      error: 'Failed to revoke API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

/**
 * GET /api/keys/:id/stats
 * Get usage statistics for an API key
 */
apiKeyRoutes.get('/:id/stats', async (c) => {
  const userId = c.get('userId')
  const keyId = c.req.param('id')
  
  try {
    // Verify the key belongs to the user
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.userId, userId)
        )
      )
      .limit(1)
    
    if (!key) {
      return c.json({ error: 'API key not found' }, 404)
    }
    
    // Get transaction count for this API key
    const [stats] = await db
      .select({
        totalTransactions: sql<number>`count(*)::int`,
        successfulTransactions: sql<number>`count(case when status = 'confirmed' then 1 end)::int`,
        failedTransactions: sql<number>`count(case when status = 'failed' then 1 end)::int`,
        pendingTransactions: sql<number>`count(case when status = 'pending' then 1 end)::int`,
      })
      .from(transactions)
      .where(eq(transactions.apiKeyId, keyId))
    
    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: transactions.id,
        txHash: transactions.txHash,
        status: transactions.status,
        network: transactions.network,
        amount: transactions.amount,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.apiKeyId, keyId))
      .orderBy(desc(transactions.createdAt))
      .limit(10)
    
    return c.json({
      keyId: key.id,
      keyName: key.name,
      maskedKey: maskApiKey(key.keyPrefix),
      lastUsedAt: key.lastUsedAt,
      stats: {
        total: stats?.totalTransactions || 0,
        successful: stats?.successfulTransactions || 0,
        failed: stats?.failedTransactions || 0,
        pending: stats?.pendingTransactions || 0,
      },
      recentTransactions,
    })
  } catch (error) {
    console.error('Error getting API key stats:', error)
    return c.json({ 
      error: 'Failed to get API key statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

export default apiKeyRoutes
