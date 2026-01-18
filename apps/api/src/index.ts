import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors())

const supportedTokens = [
  { symbol: 'VET', name: 'VeChain Token' },
  { symbol: 'VTHO', name: 'VeThor Token' },
  { symbol: 'VEUSD', name: 'VeUSD' },
  { symbol: 'B3TR', name: 'B3TR' }
]

const supportedNetworks = [
  {
    name: 'VeChain Mainnet',
    caip2: 'vechain:100010',
    tokens: supportedTokens
  }
]

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

const parseJsonBody = async (
  c: Context
): Promise<{ error?: string; value?: JsonValue }> => {
  try {
    const value = await c.req.json()
    return { value }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid JSON body'
    }
  }
}

const validateJsonObjectBody = async (c: Context): Promise<Response | null> => {
  const { error, value } = await parseJsonBody(c)
  if (error) {
    return c.json({ error }, 400)
  }
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return c.json({ error: 'Expected a JSON object body' }, 400)
  }
  return null
}

app.get('/supported', (c) => {
  return c.json({ networks: supportedNetworks })
})

app.post('/verify', async (c) => {
  const validationResponse = await validateJsonObjectBody(c)
  if (validationResponse) {
    return validationResponse
  }
  return c.json({
    verified: false,
    reason: 'x402 verification is not implemented yet'
  }, 501)
})

app.post('/settle', async (c) => {
  const validationResponse = await validateJsonObjectBody(c)
  if (validationResponse) {
    return validationResponse
  }
  return c.json({
    settled: false,
    reason: 'x402 settlement is not implemented yet'
  }, 501)
})

const routes = app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' })
})

export type AppType = typeof routes

export default app
