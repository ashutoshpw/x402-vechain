/**
 * Authentication Route Handlers
 * Implements wallet-based authentication with Sign-In-With-VeChain
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { setCookie, deleteCookie } from 'hono/cookie'
import {
  ChallengeRequestSchema,
  VerifyRequestSchema,
  type ChallengeResponse,
  type VerifyResponse,
  type UserProfile,
} from '../schemas/auth.js'
import {
  generateChallenge,
  verifySignature,
  generateToken,
} from '../services/AuthService.js'
import { requireAuth } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

const authRoutes = new Hono()

/**
 * POST /auth/challenge
 * Generate a nonce for wallet signature
 */
authRoutes.post(
  '/auth/challenge',
  zValidator('json', ChallengeRequestSchema),
  async (c) => {
    try {
      const { walletAddress } = c.req.valid('json')

      const { nonce, message, expiresAt } = await generateChallenge(walletAddress)

      const response: ChallengeResponse = {
        nonce,
        message,
        expiresAt: expiresAt.toISOString(),
      }

      return c.json(response, 200)
    } catch (error) {
      return c.json(
        {
          error: 'Failed to generate challenge',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  }
)

/**
 * POST /auth/verify
 * Verify wallet signature and issue JWT token
 */
authRoutes.post(
  '/auth/verify',
  zValidator('json', VerifyRequestSchema),
  async (c) => {
    try {
      const { walletAddress, signature, nonce } = c.req.valid('json')

      // Verify signature
      const result = await verifySignature(walletAddress, signature, nonce)

      if (!result.valid) {
        const response: VerifyResponse = {
          success: false,
          error: result.error || 'Signature verification failed',
        }
        return c.json(response, 401)
      }

      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, result.userId!))
        .limit(1)

      if (!user) {
        const response: VerifyResponse = {
          success: false,
          error: 'User not found',
        }
        return c.json(response, 404)
      }

      // Generate JWT token
      const token = generateToken(user.id, user.walletAddress)

      // Set httpOnly cookie with the token
      setCookie(c, 'auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      })

      const response: VerifyResponse = {
        success: true,
        token,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt.toISOString(),
          lastLogin: user.lastLogin?.toISOString(),
        },
      }

      return c.json(response, 200)
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        },
        500
      )
    }
  }
)

/**
 * POST /auth/logout
 * Clear authentication session
 */
authRoutes.post('/auth/logout', async (c) => {
  // Clear the auth cookie
  deleteCookie(c, 'auth_token', {
    path: '/',
  })

  return c.json({ success: true, message: 'Logged out successfully' }, 200)
})

/**
 * GET /auth/me
 * Get current authenticated user profile
 */
authRoutes.get('/auth/me', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ error: 'User not authenticated' }, 401)
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    const profile: UserProfile = {
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email || undefined,
      name: user.name || undefined,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin?.toISOString(),
    }

    return c.json(profile, 200)
  } catch (error) {
    return c.json(
      {
        error: 'Failed to fetch user profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})

export default authRoutes
