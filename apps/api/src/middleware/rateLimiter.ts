/**
 * Rate limiting middleware for x402 API
 * Simple in-memory rate limiter based on IP address
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Default: 100 requests per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 100;

/**
 * Rate limiter middleware
 * Tracks requests per IP address and enforces rate limits
 */
export const rateLimiter = () => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(ip);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + RATE_LIMIT_WINDOW,
      };
      rateLimitStore.set(ip, entry);
    }

    // Increment request count
    entry.count++;

    // Check if rate limit exceeded
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HTTPException(429, {
        message: 'Too many requests',
        res: new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
            },
          }
        ),
      });
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    c.header('X-RateLimit-Remaining', (RATE_LIMIT_MAX_REQUESTS - entry.count).toString());
    c.header('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

    await next();
  };
};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 60 * 1000); // Clean up every minute
