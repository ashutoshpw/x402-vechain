import { serve } from '@hono/node-server'
import app from './index.js'
import { env } from './config/env.js'

const port = env.PORT

console.log(`Starting server on port ${port}...`)
console.log(`Environment: ${env.NODE_ENV}`)
console.log(`VeChain Network: ${env.VECHAIN_NETWORK}`)

serve({
  fetch: app.fetch,
  port
})