import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { __pgPool?: Pool }

function getDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL
  if (!rawUrl) return rawUrl

  const url = new URL(rawUrl)
  // pg-connection-string v2 treats require/prefer as aliases; being explicit
  // keeps the current full certificate verification behavior across pg versions.
  url.searchParams.set('sslmode', 'verify-full')
  return url.toString()
}

export const pool =
  globalForDb.__pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
    max: 5,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__pgPool = pool

export const db = drizzle(pool, { schema })
export type Database = typeof db
