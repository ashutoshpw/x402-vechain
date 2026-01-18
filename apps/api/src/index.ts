import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middleware/errorHandler.js'
import { rateLimiter } from './middleware/rateLimiter.js'
import x402Routes from './routes/x402.js'

const app = new Hono()

// CORS configuration - Allow specific origins or all origins
// In production, replace '*' with specific allowed origins
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}))

// Apply rate limiting to all routes
app.use('/*', rateLimiter())

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'x402 VeChain Facilitator API',
    version: '1.0.0',
    endpoints: [
      'POST /verify',
      'POST /settle',
      'GET /supported'
    ]
  })
})

// Mount x402 routes
app.route('/', x402Routes)

// Error handling
app.onError(errorHandler)

export type AppType = typeof app

export default app
