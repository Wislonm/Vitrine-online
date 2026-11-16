import { RESERVED_SLUGS, SLUG_PATTERN, normalizeWhatsapp, slugify } from '@/lib/format'
import {
  createStoreWithDefaults,
  findStoreByOwner,
  isSlugTaken,
} from '@/lib/repositories/stores'

async function generateUniqueSlug(base: string) {
  let root = slugify(base)
  if (root.length < 3 || RESERVED_SLUGS.has(root) || !SLUG_PATTERN.test(root)) {
    root = `loja-${root}`.replace(/-+$/g, '')
  }
  if (root.length < 3) root = 'loja'

  let candidate = root
  for (let attempt = 0; attempt < 8; attempt++) {
    if (!RESERVED_SLUGS.has(candidate) && !(await isSlugTaken(candidate))) return candidate
    candidate = `${root.slice(0, 34)}-${Math.random().toString(36).slice(2, 6)}`
  }
  return `${root.slice(0, 28)}-${Date.now().toString(36)}`
}

export async function ensureStoreForUser(user: {
  id: string
  name: string
  email: string
  whatsapp?: string | null
  commercialName?: string | null
  documentType?: string | null
  documentNumber?: string | null
}) {
  const existing = await findStoreByOwner(user.id)
  if (existing) return existing

  const commercialName = user.commercialName?.trim() || user.name
  const slug = await generateUniqueSlug(commercialName)
  if ((user.documentType !== 'cpf' && user.documentType !== 'cnpj') || !user.documentNumber) {
    throw new Error('Documento comercial não informado ou inválido')
  }
  return createStoreWithDefaults({
    ownerUserId: user.id,
    name: commercialName,
    slug,
    whatsapp: normalizeWhatsapp(user.whatsapp),
    contactEmail: user.email,
    documentType: user.documentType,
    documentNumber: user.documentNumber.replace(/\D/g, ''),
  })
}
