import { z } from 'zod'

const schema = z
  .object({
    VITE_API_BASE_URL: z.string().optional(),
    VITE_API_URL: z.string().optional(),
    VITE_PROXY_API: z.string().optional(),
    VITE_ANALYTICS_API_URL: z.string().optional(),
  })
  .passthrough()

export const env = schema.parse(import.meta.env)

/** Empty string = same-origin requests (use Vite dev proxy to FastAPI). */
export const apiBaseUrl = env.VITE_API_BASE_URL ?? env.VITE_API_URL ?? ''
export const proxyApiTarget = env.VITE_PROXY_API ?? apiBaseUrl ?? 'http://localhost:8000'
