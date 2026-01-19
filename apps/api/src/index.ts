import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { errorHandler } from './middleware/errorHandler.js'
import { rateLimiter } from './middleware/rateLimiter.js'
import x402Routes from './routes/x402.js'
import authRoutes from './routes/auth.js'
import feeDelegationRoutes from './routes/feeDelegation.js'
import transactionsRoutes from './routes/transactions.js'

const app = new Hono()

// CORS configuration - Allow specific origins or all origins
// In production, replace '*' with specific allowed origins
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
  credentials: true, // Allow cookies
}))

// Apply rate limiting to all routes
app.use('/*', rateLimiter())

// Root endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'x402 VeChain Facilitator API',
    version: '1.0.0',
    endpoints: [
      'POST /auth/challenge',
      'POST /auth/verify',
      'POST /auth/logout',
      'GET /auth/me',
      'POST /verify',
      'POST /settle',
      'GET /supported',
      'GET /fee-delegation/status',
      'GET /fee-delegation/stats/:address',
      'GET /fee-delegation/total-spent',
      'GET /transactions'
    ]
  })
})

// Mount authentication routes
app.route('/', authRoutes)

// Mount x402 routes
app.route('/', x402Routes)

// Mount fee delegation routes
app.route('/fee-delegation', feeDelegationRoutes)

// Mount transactions routes
app.route('/', transactionsRoutes)

// Error handling
app.onError(errorHandler)

export type AppType = typeof app

export default app
