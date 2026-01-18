/**
 * JWT Authentication Middleware
 * Protects routes and validates JWT tokens
 */

import type { Context, Next, MiddlewareHandler } from 'hono'
import { verifyToken } from '../services/AuthService.js'
import { getCookie } from 'hono/cookie'

// Define the type for authenticated context variables
export type AuthVariables = {
  userId: string
  walletAddress: string
}

/**
 * Middleware to require authentication
 * Checks for JWT in Authorization header or auth_token cookie
 */
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  try {
    // Try to get token from Authorization header
    let token = c.req.header('Authorization')?.replace('Bearer ', '')

    // If not in header, try cookie
    if (!token) {
      token = getCookie(c, 'auth_token')
    }

    if (!token) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Authentication token required',
        },
        401
      )
    }

    // Verify token
    const result = verifyToken(token)

    if (!result.valid || !result.userId || !result.walletAddress) {
      return c.json(
        {
          error: 'Unauthorized',
          message: result.error || 'Invalid or expired token',
        },
        401
      )
    }

    // Set user info in context
    c.set('userId', result.userId)
    c.set('walletAddress', result.walletAddress)

    await next()
  } catch (error) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Authentication failed',
      },
      401
    )
  }
}

/**
 * Optional authentication middleware
 * Sets user info if token is present but doesn't require it
 */
export const optionalAuth: MiddlewareHandler<{ Variables: Partial<AuthVariables> }> = async (c, next) => {
  try {
    // Try to get token from Authorization header
    let token = c.req.header('Authorization')?.replace('Bearer ', '')

    // If not in header, try cookie
    if (!token) {
      token = getCookie(c, 'auth_token')
    }

    if (token) {
      const result = verifyToken(token)

      if (result.valid && result.userId && result.walletAddress) {
        c.set('userId', result.userId)
        c.set('walletAddress', result.walletAddress)
      }
    }

    await next()
  } catch (error) {
    // Continue without authentication
    await next()
  }
}
