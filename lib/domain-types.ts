import type { StoreDomain } from '@/lib/db/schema'

export type CustomDomainActionResult =
  | { ok: true; domain: StoreDomain | null; message: string }
  | { ok: false; error: string; domain?: StoreDomain | null }
