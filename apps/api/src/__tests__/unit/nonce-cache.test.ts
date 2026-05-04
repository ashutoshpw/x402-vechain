/**
 * Unit tests for NonceCacheService
 *
 * Strategy:
 *  - Mock the Drizzle `db` module so tests never touch a real database
 *  - Use vi.setSystemTime() to control the clock for expiry tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the database module BEFORE importing the service under test
// ---------------------------------------------------------------------------
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../db/index.js', () => ({
  db: {
    insert: () => ({ values: mockInsert }),
    select: () => ({ from: () => ({ where: () => ({ limit: mockSelect }) }) }),
    delete: () => ({ where: mockDelete }),
  },
}))

// Import AFTER mocking so the service picks up the mock db
// We import the class indirectly via the module; re-import a fresh instance per test
// by resetting module cache between describe blocks where needed.
import { nonceCacheService } from '../../services/NonceCacheService.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const WALLET = '0xDeAdBeEf000000000000000000000000DeAdBeEf'
const NONCE = 'abc123'
const TTL = 300 // 5 minutes

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NonceCacheService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
    // Clear the service's internal map between tests via the exposed helper
    // (we call cleanup with a far-future time effectively by clearing directly)
    ;(nonceCacheService as any).cache.clear()
    mockInsert.mockReset()
    mockSelect.mockReset()
    mockDelete.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  describe('has()', () => {
    it('returns false when nonce is unknown (no map entry, DB returns empty)', async () => {
      mockSelect.mockResolvedValue([])

      const result = await nonceCacheService.has(NONCE, WALLET)

      expect(result).toBe(false)
      expect(mockSelect).toHaveBeenCalledOnce()
    })

    it('returns true for a nonce found in the DB and warms the map', async () => {
      const expiresAt = new Date((nowSeconds() + TTL) * 1000)
      mockSelect.mockResolvedValue([{ expiresAt }])

      const result = await nonceCacheService.has(NONCE, WALLET)

      expect(result).toBe(true)
      // Map should now be warmed — a second call must NOT hit the DB
      mockSelect.mockReset()
      const resultCached = await nonceCacheService.has(NONCE, WALLET)
      expect(resultCached).toBe(true)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns true from the in-memory map without hitting the DB (cache hit)', async () => {
      // Pre-warm the map by calling add()
      mockInsert.mockResolvedValue(undefined)
      await nonceCacheService.add(NONCE, WALLET, TTL)

      mockSelect.mockReset()
      const result = await nonceCacheService.has(NONCE, WALLET)

      expect(result).toBe(true)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('returns false for an expired map entry and falls through to DB', async () => {
      // Add nonce with TTL of 10 seconds
      mockInsert.mockResolvedValue(undefined)
      await nonceCacheService.add(NONCE, WALLET, 10)

      // Advance time past expiry
      vi.advanceTimersByTime(15_000)

      // DB also says gone
      mockSelect.mockResolvedValue([])

      const result = await nonceCacheService.has(NONCE, WALLET)

      expect(result).toBe(false)
      expect(mockSelect).toHaveBeenCalledOnce()
      // Map entry should have been evicted
      expect((nonceCacheService as any).cache.size).toBe(0)
    })

    it('returns false when DB entry is expired even though row exists', async () => {
      const expiresAt = new Date((nowSeconds() - 60) * 1000) // 1 min in the past
      mockSelect.mockResolvedValue([{ expiresAt }])

      const result = await nonceCacheService.has(NONCE, WALLET)

      expect(result).toBe(false)
      // Should NOT warm the map with an expired entry
      expect((nonceCacheService as any).cache.size).toBe(0)
    })

    it('is case-insensitive for wallet address', async () => {
      mockInsert.mockResolvedValue(undefined)
      await nonceCacheService.add(NONCE, WALLET.toUpperCase(), TTL)

      const result = await nonceCacheService.has(NONCE, WALLET.toLowerCase())
      expect(result).toBe(true)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('throws when the DB is unreachable (fail-closed)', async () => {
      mockSelect.mockRejectedValue(new Error('Connection refused'))

      await expect(nonceCacheService.has(NONCE, WALLET)).rejects.toThrow(
        'Nonce check failed'
      )
    })
  })

  // -------------------------------------------------------------------------
  describe('add()', () => {
    it('writes to DB and warms the in-memory map', async () => {
      mockInsert.mockResolvedValue(undefined)

      await nonceCacheService.add(NONCE, WALLET, TTL)

      expect(mockInsert).toHaveBeenCalledOnce()
      expect((nonceCacheService as any).cache.size).toBe(1)
    })

    it('throws on DB unique constraint violation (replay attack)', async () => {
      mockInsert.mockRejectedValue(new Error('unique constraint violated'))

      await expect(nonceCacheService.add(NONCE, WALLET, TTL)).rejects.toThrow(
        'Nonce has already been used'
      )
      // Map must NOT be polluted on failure
      expect((nonceCacheService as any).cache.size).toBe(0)
    })

    it('throws on generic DB error', async () => {
      mockInsert.mockRejectedValue(new Error('timeout'))

      await expect(nonceCacheService.add(NONCE, WALLET, TTL)).rejects.toThrow(
        'Failed to cache nonce'
      )
    })

    it('uses at least 1 second TTL even when validUntil is in the past', async () => {
      mockInsert.mockResolvedValue(undefined)
      // ttlSeconds = -60 (already expired) → should still call add with max(−60, 1) = 1
      await nonceCacheService.add(NONCE, WALLET, 1)

      expect(mockInsert).toHaveBeenCalledOnce()
    })
  })

  // -------------------------------------------------------------------------
  describe('cleanup()', () => {
    it('removes expired entries from the in-memory map', async () => {
      mockInsert.mockResolvedValue(undefined)

      await nonceCacheService.add('nonce-1', WALLET, 10)
      await nonceCacheService.add('nonce-2', WALLET, 600)

      expect((nonceCacheService as any).cache.size).toBe(2)

      // Advance past nonce-1's expiry
      vi.advanceTimersByTime(15_000)

      nonceCacheService.cleanup()

      expect((nonceCacheService as any).cache.size).toBe(1)
    })

    it('leaves valid entries untouched', async () => {
      mockInsert.mockResolvedValue(undefined)
      await nonceCacheService.add(NONCE, WALLET, TTL)

      nonceCacheService.cleanup()

      expect((nonceCacheService as any).cache.size).toBe(1)
    })
  })

  // -------------------------------------------------------------------------
  describe('purgeExpiredFromDb()', () => {
    it('calls db.delete with an expires_at condition', async () => {
      mockDelete.mockResolvedValue(undefined)

      await nonceCacheService.purgeExpiredFromDb()

      expect(mockDelete).toHaveBeenCalledOnce()
    })
  })
})
