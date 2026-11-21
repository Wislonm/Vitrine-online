import type { StoreDomain } from '@/lib/db/schema'

export type CustomDomainActionResult =
  | { ok: true; domain: StoreDomain | null; message: string }
  | { ok: false; error: string; domain?: StoreDomain | null }

export type DnsTestHostResult = {
  host: 'apex' | 'www'
  hostname: string
  ok: boolean
  found: string[]
}

export type DnsTestResult =
  | { ok: true; domain: string; allOk: boolean; results: DnsTestHostResult[] }
  | { ok: false; error: string }
