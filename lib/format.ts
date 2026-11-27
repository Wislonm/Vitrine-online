const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatBRL(value: number | string) {
  return brl.format(typeof value === 'string' ? Number(value) : value)
}

/** Converte um valor decimal ("12.50") em centavos inteiros, evitando ponto flutuante nos totais. */
export function toCents(value: number | string) {
  return Math.round(Number(value) * 100)
}

export function centsToDecimalString(cents: number) {
  return (cents / 100).toFixed(2)
}

/** Aceita "1.234,56", "1234,56" ou "1234.56" e retorna um número, ou null se inválido. */
export function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/[R$\s]/g, '')
  if (!trimmed) return null
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/** Normaliza para o formato internacional usado pelo wa.me (somente dígitos, com DDI 55). */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits
  }
  return null
}

export function formatWhatsappDisplay(input: string | null | undefined) {
  if (!input) return ''
  const digits = input.replace(/\D/g, '')
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return input
}

export function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'painel',
  'login',
  'cadastro',
  'recuperar-senha',
  'redefinir-senha',
  'planos',
  'sobre',
  'termos',
  'privacidade',
  'suporte',
  'ajuda',
  'static',
  'public',
  '_next',
  'favicon',
  'robots',
  'sitemap',
])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatTrialDays(days: number) {
  if (days <= 0) return 'Sempre grátis'
  return `${days} ${days === 1 ? 'dia' : 'dias'} grátis`
}

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const
