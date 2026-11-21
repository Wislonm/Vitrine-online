import { isIP } from 'node:net'
import { domainToASCII } from 'node:url'

const PLATFORM_DOMAINS = ['minhavitrine.shop', 'vercel.app']

export function normalizeCustomDomain(input: string) {
  let value = input.trim().toLowerCase().replace(/^https?:\/\//, '')
  if (!value || /[\/?#@:\s]/.test(value)) return null
  value = value.replace(/\.$/, '').replace(/^www\./, '')

  const domain = domainToASCII(value)
  if (!domain || domain.length > 253 || isIP(domain)) return null

  const labels = domain.split('.')
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    return null
  }
  if (PLATFORM_DOMAINS.some((platformDomain) => domain === platformDomain || domain.endsWith(`.${platformDomain}`))) {
    return null
  }

  return domain
}
