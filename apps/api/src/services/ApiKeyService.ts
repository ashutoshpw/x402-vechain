/**
 * API Key Service
 * Handles API key generation, validation, and management
 */

import crypto from 'crypto'
import { db } from '../db/index.js'
import { apiKeys } from '../db/schema.js'
import { eq, and, isNull } from 'drizzle-orm'

const API_KEY_PREFIX = 'xv_'
const API_KEY_LENGTH = 32 // Length of the random part (will be 32 bytes = 64 hex chars)
const KEY_PREFIX_DISPLAY_LENGTH = 5 // Number of characters to show after prefix for display

/**
 * Generate a new API key with xv_ prefix
 * @returns Object containing the full key (to be shown once) and key prefix for storage
 */
export function generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
  // Generate random bytes for the key
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH)
  const randomPart = randomBytes.toString('hex')
  
  // Combine prefix with random part
  const fullKey = `${API_KEY_PREFIX}${randomPart}`
  
  // Create prefix for display (first characters after xv_)
  const keyPrefix = `${API_KEY_PREFIX}${randomPart.substring(0, KEY_PREFIX_DISPLAY_LENGTH)}`
  
  // Hash the full key for storage
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')
  
  return {
    fullKey,
    keyPrefix,
    keyHash,
  }
}

/**
 * Hash an API key for comparison
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Validate an API key format
 */
export function validateApiKeyFormat(key: string): boolean {
  // Check if key starts with xv_ and has the correct length
  const expectedLength = API_KEY_PREFIX.length + (API_KEY_LENGTH * 2) // prefix + 64 hex chars
  return key.startsWith(API_KEY_PREFIX) && key.length === expectedLength
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(params: {
  userId: string
  name: string
  rateLimit?: number
  allowedDomains?: string[]
  permissions?: string[]
}) {
  const { fullKey, keyPrefix, keyHash } = generateApiKey()
  
  const [newKey] = await db.insert(apiKeys).values({
    userId: params.userId,
    name: params.name,
    keyHash,
    keyPrefix,
    rateLimit: params.rateLimit ?? 1000,
    allowedDomains: params.allowedDomains ?? [],
    permissions: params.permissions ?? [],
  }).returning()
  
  return {
    ...newKey,
    fullKey, // Only returned on creation
  }
}

/**
 * Verify an API key and return the key record if valid
 */
export async function verifyApiKey(key: string) {
  if (!validateApiKeyFormat(key)) {
    return null
  }
  
  const keyHash = hashApiKey(key)
  
  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.isActive, true),
        isNull(apiKeys.revokedAt)
      )
    )
    .limit(1)
  
  if (!keyRecord) {
    return null
  }
  
  // Check if key has expired
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    return null
  }
  
  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ 
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(apiKeys.id, keyRecord.id))
  
  return keyRecord
}

/**
 * List API keys for a user (excluding sensitive data)
 */
export async function listUserApiKeys(userId: string) {
  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      rateLimit: apiKeys.rateLimit,
      allowedDomains: apiKeys.allowedDomains,
      permissions: apiKeys.permissions,
      isActive: apiKeys.isActive,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt)
  
  return keys
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, userId: string) {
  const [revokedKey] = await db
    .update(apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, userId)
      )
    )
    .returning()
  
  return revokedKey
}

/**
 * Update API key settings
 */
export async function updateApiKey(
  keyId: string,
  userId: string,
  updates: {
    name?: string
    rateLimit?: number
    allowedDomains?: string[]
    permissions?: string[]
  }
) {
  const [updatedKey] = await db
    .update(apiKeys)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, userId)
      )
    )
    .returning()
  
  return updatedKey
}

/**
 * Mask an API key for display
 */
export function maskApiKey(keyPrefix: string, fullKey?: string): string {
  if (fullKey) {
    // Show first 8 chars (xv_xxxxx) and last 4 chars
    const last4 = fullKey.slice(-4)
    return `${keyPrefix}****...${last4}`
  }
  
  // If we only have prefix, show that
  return `${keyPrefix}****...****`
}
