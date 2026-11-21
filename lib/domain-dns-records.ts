export const VERCEL_APEX_IP = '216.198.79.1'
export const VERCEL_CNAME_TARGET = 'cname.vercel-dns.com'
export const ACCEPTED_APEX_IPS: readonly string[] = [VERCEL_APEX_IP, '76.76.21.21']

const PLATFORM_DOMAINS = ['minhavitrine.shop', 'vercel.app']
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export type ExpectedDnsRecord = {
  host: 'apex' | 'www'
  type: 'A' | 'CNAME'
  name: string
  value: string
  description: string
}

/** Normalização leve para o navegador; o servidor revalida com `normalizeCustomDomain`. */
export function previewCustomDomain(input: string) {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '').replace(/^www\./, '')
  if (!value || value.length > 253 || /[\s:@?#]/.test(value)) return null

  const labels = value.split('.')
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || !LABEL_PATTERN.test(label))) return null
  if (/^\d+$/.test(labels[labels.length - 1])) return null
  if (PLATFORM_DOMAINS.some((platform) => value === platform || value.endsWith(`.${platform}`))) return null
  return value
}

export function getExpectedDnsRecords(domain: string): ExpectedDnsRecord[] {
  return [
    {
      host: 'apex',
      type: 'A',
      name: '@',
      value: VERCEL_APEX_IP,
      description: domain,
    },
    {
      host: 'www',
      type: 'CNAME',
      name: 'www',
      value: VERCEL_CNAME_TARGET,
      description: `www.${domain}`,
    },
  ]
}
