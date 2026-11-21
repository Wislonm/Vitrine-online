import 'server-only'

import { Resolver } from 'node:dns/promises'
import { ACCEPTED_APEX_IPS } from '@/lib/domain-dns-records'

export type DnsHostCheck = {
  host: 'apex' | 'www'
  hostname: string
  ok: boolean
  found: string[]
}

const EMPTY_ANSWER_CODES = new Set(['ENODATA', 'ENOTFOUND', 'NODATA', 'NOTFOUND'])

function createResolver() {
  const resolver = new Resolver({ timeout: 4000, tries: 2 })
  resolver.setServers(['1.1.1.1', '8.8.8.8'])
  return resolver
}

async function lookup<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
    if (EMPTY_ANSWER_CODES.has(code)) return []
    throw error
  }
}

function normalizeTarget(value: string) {
  return value.toLowerCase().replace(/\.$/, '')
}

function pointsToVercel(target: string) {
  return target === 'cname.vercel-dns.com' || target.endsWith('.vercel-dns.com') || /(^|\.)vercel-dns-\d+\.com$/.test(target)
}

export async function checkDomainDns(domain: string): Promise<DnsHostCheck[]> {
  const resolver = createResolver()
  const www = `www.${domain}`

  const [apexIps, wwwCnames, wwwIps] = await Promise.all([
    lookup(resolver.resolve4(domain)),
    lookup(resolver.resolveCname(www)),
    lookup(resolver.resolve4(www)),
  ])

  const wwwTargets = wwwCnames.map(normalizeTarget)
  const apexOk = apexIps.some((ip) => ACCEPTED_APEX_IPS.includes(ip))
  const wwwOk = wwwTargets.some(pointsToVercel) || wwwIps.some((ip) => ACCEPTED_APEX_IPS.includes(ip))

  return [
    { host: 'apex', hostname: domain, ok: apexOk, found: apexIps },
    { host: 'www', hostname: www, ok: wwwOk, found: wwwTargets.length > 0 ? wwwTargets : wwwIps },
  ]
}
