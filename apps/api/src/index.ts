import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors())

const routes = app.get('/', (c) => {
  return c.json({ message: 'Hello from Hono!' })
})

export type AppType = typeof routes

export default app
