import { hc } from 'hono/client'
import type { AppType } from 'api' // Shared type from your Hono workspace

// Use environment variable for flexibilit
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const client = hc<AppType>(API_URL)