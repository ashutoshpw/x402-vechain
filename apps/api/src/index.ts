import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors())

const welcomeStrings = [
  'Hello Hono!',
  'To learn more about Hono on Vercel, visit https://vercel.com/docs/frameworks/backend/hono'
]

const routes = app.get('/', (c) => {
  return c.text(welcomeStrings.join('\n\n'))
})

export type AppType = typeof routes

export default app
