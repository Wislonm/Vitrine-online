import 'server-only'

import { VERCEL_PROJECT_ID, VERCEL_TEAM_ID } from '@/lib/vercel-project-config'

const API_BASE_URL = 'https://api.vercel.com'
const REQUEST_TIMEOUT_MS = 12_000

type VercelVerificationRecord = {
  type?: unknown
  domain?: unknown
  value?: unknown
  reason?: unknown
}

type VercelDomainInfo = {
  name?: unknown
  verified?: unknown
  verification?: unknown
}

type VercelRecommendation = { rank?: unknown; value?: unknown }

type VercelDomainConfig = {
  misconfigured?: unknown
  recommendedIPv4?: unknown
  recommendedCNAME?: unknown
  recommendedTXT?: unknown
}

export type DomainDnsRecord = {
  name: string
  type: string
  value: string
  reason?: string
}

export type DomainHostCheck = {
  hostname: string
  verified: boolean
  misconfigured: boolean
  dnsRecords: DomainDnsRecord[]
  error?: string
}

export class VercelDomainApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message)
    this.name = 'VercelDomainApiError'
  }
}

function getErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== 'object') return { message: 'A Vercel recusou a operação.', code: null }
  const error = 'error' in payload ? payload.error : null
  if (!error || typeof error !== 'object') return { message: 'A Vercel recusou a operação.', code: null }
  const record = error as Record<string, unknown>
  return {
    message: typeof record.message === 'string' ? record.message : 'A Vercel recusou a operação.',
    code: typeof record.code === 'string' ? record.code : null,
  }
}

async function requestVercel<T>(
  path: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown>; allowNotFound?: boolean } = {},
): Promise<T | null> {
  const token = process.env.VERCEL_API_TOKEN?.trim()
  if (!token) throw new VercelDomainApiError('O gerenciamento de domínios da Vercel não está configurado.', 503, 'missing_token')

  const url = new URL(path, API_BASE_URL)
  url.searchParams.set('teamId', VERCEL_TEAM_ID)
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const payload = await response.json().catch(() => null)

  if (options.allowNotFound && response.status === 404) return null
  if (!response.ok) {
    const details = getErrorDetails(payload)
    throw new VercelDomainApiError(details.message, response.status, details.code)
  }

  return payload as T
}

export function getDomainHosts(domain: string) {
  return [domain, `www.${domain}`] as const
}

export async function ensureProjectDomain(hostname: string) {
  const path = `/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(hostname)}`
  const existing = await requestVercel<VercelDomainInfo>(path, { allowNotFound: true })
  if (existing) return existing

  return requestVercel<VercelDomainInfo>(`/v10/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains`, {
    method: 'POST',
    body: { name: hostname },
  }) as Promise<VercelDomainInfo>
}

export async function verifyProjectDomain(hostname: string) {
  const path = `/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(hostname)}/verify`
  return requestVercel<VercelDomainInfo>(path, { method: 'POST', body: {} })
}

export async function removeProjectDomain(hostname: string) {
  const path = `/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(hostname)}`
  await requestVercel(path, { method: 'DELETE', allowNotFound: true })
}

function toRecommendations(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('value' in item)) return []
    const recommendation = item as VercelRecommendation
    if (typeof recommendation.value === 'string') return [recommendation.value]
    return Array.isArray(recommendation.value)
      ? recommendation.value.filter((entry): entry is string => typeof entry === 'string')
      : []
  })
}

export async function getProjectDomainCheck(hostname: string, apexDomain: string): Promise<DomainHostCheck> {
  const domainPath = `/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}/domains/${encodeURIComponent(hostname)}`
  const [domainInfo, config] = await Promise.all([
    requestVercel<VercelDomainInfo>(domainPath, { allowNotFound: true }),
    requestVercel<VercelDomainConfig>(`/v6/domains/${encodeURIComponent(hostname)}/config`),
  ])

  const dnsRecords: DomainDnsRecord[] = []
  const verificationRecords = domainInfo?.verification
  if (Array.isArray(verificationRecords)) {
    for (const item of verificationRecords as VercelVerificationRecord[]) {
      if (typeof item.type !== 'string' || typeof item.value !== 'string') continue
      dnsRecords.push({
        name: typeof item.domain === 'string' ? item.domain : hostname,
        type: item.type,
        value: item.value,
        ...(typeof item.reason === 'string' ? { reason: item.reason } : {}),
      })
    }
  }

  const recordName = hostname === apexDomain ? '@' : hostname.slice(0, -(apexDomain.length + 1))
  for (const value of toRecommendations(config?.recommendedIPv4)) {
    dnsRecords.push({ name: recordName, type: 'A', value, reason: 'Aponte este host para a Vercel.' })
  }
  for (const value of toRecommendations(config?.recommendedCNAME)) {
    dnsRecords.push({ name: recordName, type: 'CNAME', value, reason: 'Aponte este host para a Vercel.' })
  }
  for (const value of toRecommendations(config?.recommendedTXT)) {
    dnsRecords.push({ name: hostname, type: 'TXT', value, reason: 'Registro de verificação da Vercel.' })
  }

  const uniqueRecords = [...new Map(dnsRecords.map((record) => [`${record.type}:${record.name}:${record.value}`, record])).values()]
  return {
    hostname,
    verified: domainInfo?.verified === true,
    misconfigured: config?.misconfigured === true,
    dnsRecords: uniqueRecords,
  }
}
