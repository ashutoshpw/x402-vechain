/**
 * NonceCacheService
 *
 * Two-layer nonce cache for replay attack prevention:
 *   Layer 1 — In-process Map (zero DB cost for hot lookups)
 *   Layer 2 — Postgres (authoritative, race-condition safe via unique constraint)
 *
 * The in-memory map is a performance optimisation only. Correctness is always
 * guaranteed by the DB unique constraint even when multiple Vercel function
 * instances are running concurrently.
 */

import { db } from '../db/index.js'
import { nonces } from '../db/schema.js'
import { and, eq, lt } from 'drizzle-orm'

export interface NonceCache {
  has(nonce: string, walletAddress: string): Promise<boolean>
  add(nonce: string, walletAddress: string, ttlSeconds: number): Promise<void>
  cleanup(): void
}

// Map key → expiry unix timestamp (seconds)
type CacheKey = string // `${walletAddress.toLowerCase()}:${nonce}`

function makeKey(walletAddress: string, nonce: string): CacheKey {
  return `${walletAddress.toLowerCase()}:${nonce}`
}

class NonceCacheService implements NonceCache {
  private readonly cache = new Map<CacheKey, number>()

  /**
   * Check whether a nonce has already been used.
   *
   * Lookup order:
   *  1. In-memory map  — return true/false immediately if entry is present and fresh
   *  2. Postgres       — on cache miss, query the DB and warm the map on hit
   */
  async has(nonce: string, walletAddress: string): Promise<boolean> {
    const key = makeKey(walletAddress, nonce)
    const nowSeconds = Math.floor(Date.now() / 1000)

    // Layer 1: in-memory map
    const cachedExpiry = this.cache.get(key)
    if (cachedExpiry !== undefined) {
      if (cachedExpiry > nowSeconds) {
        return true
      }
      // Expired — evict and fall through to DB
      this.cache.delete(key)
    }

    // Layer 2: Postgres
    try {
      const rows = await db
        .select({ expiresAt: nonces.expiresAt })
        .from(nonces)
        .where(
          and(
            eq(nonces.walletAddress, walletAddress.toLowerCase()),
            eq(nonces.nonce, nonce)
          )
        )
        .limit(1)

      if (rows.length === 0) return false

      // Warm the in-memory cache with the expiry from DB
      const expirySeconds = Math.floor(rows[0].expiresAt.getTime() / 1000)
      if (expirySeconds > nowSeconds) {
        this.cache.set(key, expirySeconds)
        return true
      }

      // Row exists but has expired — treat as unused
      return false
    } catch (error) {
      // Fail closed: if the DB is unreachable we must reject to prevent replay attacks
      throw new Error(
        `Nonce check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Record a nonce as used.
   *
   * Writes to Postgres first (atomic, unique constraint prevents duplicates), then
   * warms the in-memory map. Throws if the nonce is already present (replay attack
   * or concurrent request race condition).
   */
  async add(nonce: string, walletAddress: string, ttlSeconds: number): Promise<void> {
    const key = makeKey(walletAddress, nonce)
    const expiresAt = new Date((Math.floor(Date.now() / 1000) + ttlSeconds) * 1000)

    try {
      await db.insert(nonces).values({
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        expiresAt,
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ''
      if (msg.includes('unique') || msg.includes('duplicate')) {
        throw new Error('Nonce has already been used (replay attack or concurrent request detected)')
      }
      throw new Error(`Failed to cache nonce: ${msg || 'Unknown error'}`)
    }

    // Warm the map only after a successful DB write
    this.cache.set(key, Math.floor(expiresAt.getTime() / 1000))
  }

  /**
   * Prune expired entries from the in-memory map.
   * Call this periodically (e.g. every 5 minutes) to prevent unbounded map growth.
   */
  cleanup(): void {
    const nowSeconds = Math.floor(Date.now() / 1000)
    for (const [key, expiry] of this.cache.entries()) {
      if (expiry <= nowSeconds) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Delete all expired nonce rows from Postgres.
   * Intended to be called alongside cleanup() in the periodic maintenance job.
   */
  async purgeExpiredFromDb(): Promise<void> {
    await db.delete(nonces).where(lt(nonces.expiresAt, new Date()))
  }

  /** Exposed for testing only */
  get _cacheSize(): number {
    return this.cache.size
  }
}

export const nonceCacheService = new NonceCacheService()
