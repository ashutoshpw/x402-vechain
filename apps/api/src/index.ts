import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env, getVeChainRpcUrl } from './config/env'

const app = new Hono()

app.use('/*', cors())

const routes = app.get('/', (c) => {
  return c.json({ 
    message: 'Hello from Hono!',
    network: env.VECHAIN_NETWORK,
    rpcUrl: getVeChainRpcUrl()
  })
})

export type AppType = typeof routes

export default app
