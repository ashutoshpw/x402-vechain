/**
 * Authentication Service
 * Handles wallet signature verification and JWT token generation
 */

import { randomBytes } from 'crypto'
import { Certificate, secp256k1 } from '@vechain/sdk-core'
import { env } from '../config/env.js'
import { db } from '../db/index.js'
import { users, nonces } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'

/**
 * Nonce expiration time (15 minutes)
 */
const NONCE_EXPIRATION_MS = 15 * 60 * 1000

/**
 * JWT expiration time (7 days)
 */
const JWT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Generate a challenge message for wallet signature
 */
export async function generateChallenge(walletAddress: string): Promise<{
  nonce: string
  message: string
  expiresAt: Date
}> {
  // Generate a random nonce
  const nonce = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + NONCE_EXPIRATION_MS)

  // Create the message to be signed
  const message = `Sign this message to authenticate with x402 VeChain Dashboard\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}`

  // Store nonce in database
  await db.insert(nonces).values({
    walletAddress: walletAddress.toLowerCase(),
    nonce,
    expiresAt,
  })

  return { nonce, message, expiresAt }
}

/**
 * Verify wallet signature and create or update user
 */
export async function verifySignature(
  walletAddress: string,
  signature: string,
  nonce: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase()

    // Find the nonce in database
    const [nonceRecord] = await db
      .select()
      .from(nonces)
      .where(
        and(
          eq(nonces.walletAddress, normalizedAddress),
          eq(nonces.nonce, nonce),
          gt(nonces.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!nonceRecord) {
      return { valid: false, error: 'Invalid or expired nonce' }
    }

    // Reconstruct the message that was signed
    const message = `Sign this message to authenticate with x402 VeChain Dashboard\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nExpires: ${nonceRecord.expiresAt.toISOString()}`

    // Verify the signature
    const messageHash = Certificate.signatureHash(Buffer.from(message, 'utf-8'))
    const signatureBuffer = Buffer.from(signature.replace('0x', ''), 'hex')

    // Recover public key from signature
    const recoveredPublicKey = secp256k1.recover(messageHash, signatureBuffer)
    const recoveredAddress = Certificate.recoverAddress(messageHash, signatureBuffer)

    // Check if recovered address matches the provided wallet address
    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return { valid: false, error: 'Signature verification failed' }
    }

    // Delete used nonce to prevent replay attacks
    await db
      .delete(nonces)
      .where(
        and(
          eq(nonces.walletAddress, normalizedAddress),
          eq(nonces.nonce, nonce)
        )
      )

    // Create or update user
    const now = new Date()
    const [user] = await db
      .insert(users)
      .values({
        walletAddress: normalizedAddress,
        lastLogin: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.walletAddress,
        set: {
          lastLogin: now,
          updatedAt: now,
        },
      })
      .returning()

    return { valid: true, userId: user.id }
  } catch (error) {
    console.error('Signature verification error:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(userId: string, walletAddress: string): string {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }

  // Create a simple JWT payload
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const payload = {
    userId,
    walletAddress: walletAddress.toLowerCase(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + JWT_EXPIRATION_MS) / 1000),
  }

  // Base64 encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')

  // Create signature using HMAC SHA256
  const crypto = require('crypto')
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): {
  valid: boolean
  userId?: string
  walletAddress?: string
  error?: string
} {
  try {
    if (!env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured')
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [encodedHeader, encodedPayload, signature] = parts

    // Verify signature
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url')

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' }
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    )

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' }
    }

    return {
      valid: true,
      userId: payload.userId,
      walletAddress: payload.walletAddress,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    }
  }
}

/**
 * Clean up expired nonces (should be called periodically)
 */
export async function cleanupExpiredNonces(): Promise<void> {
  await db.delete(nonces).where(gt(new Date(), nonces.expiresAt))
}
