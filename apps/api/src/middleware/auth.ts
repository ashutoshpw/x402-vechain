/**
 * JWT Authentication Middleware
 * Protects routes and validates JWT tokens
 */

import type { Context, Next } from 'hono'
import { verifyToken } from '../services/AuthService.js'
import { getCookie } from 'hono/cookie'

/**
 * Middleware to require authentication
 * Checks for JWT in Authorization header or auth_token cookie
 */
export async function requireAuth(c: Context, next: Next) {
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

    if (!result.valid) {
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
export async function optionalAuth(c: Context, next: Next) {
  try {
    // Try to get token from Authorization header
    let token = c.req.header('Authorization')?.replace('Bearer ', '')

    // If not in header, try cookie
    if (!token) {
      token = getCookie(c, 'auth_token')
    }

    if (token) {
      const result = verifyToken(token)

      if (result.valid) {
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
