import { z } from 'zod'
import { RESERVED_SLUGS, SLUG_PATTERN, normalizeWhatsapp } from '@/lib/format'
import { isValidBrazilianDocument, onlyDocumentDigits } from '@/lib/brazil-document'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : null))

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\//i.test(v), 'Informe um link começando com http:// ou https://')

export const whatsappSchema = z
  .string()
  .trim()
  .min(1, 'Informe o WhatsApp')
  .refine((v) => normalizeWhatsapp(v) !== null, 'Informe um WhatsApp válido com DDD')

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo').max(80),
  commercialName: z.string().trim().min(2, 'Informe o nome comercial').max(80),
  documentType: z.enum(['cpf', 'cnpj']),
  documentNumber: z.string().transform(onlyDocumentDigits),
  email: z.email('Informe um e-mail válido').max(120),
  password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres').max(128),
  whatsapp: whatsappSchema,
  termsAccepted: z.boolean(),
}).superRefine((values, context) => {
  if (!values.termsAccepted) {
    context.addIssue({ code: 'custom', path: ['termsAccepted'], message: 'Aceite os Termos de Uso e a Política de Privacidade para criar a conta' })
  }
  if (!isValidBrazilianDocument(values.documentType, values.documentNumber)) {
    context.addIssue({ code: 'custom', path: ['documentNumber'], message: values.documentType === 'cpf' ? 'Informe um CPF válido' : 'Informe um CNPJ válido' })
  }
})

export const signInSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
})

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => SLUG_PATTERN.test(v), 'Use de 3 a 40 letras minúsculas, números ou hífens')
  .refine((v) => !RESERVED_SLUGS.has(v), 'Este endereço é reservado, escolha outro')

export const profileSchema = z.object({
  ownerName: z.string().trim().min(2, 'Informe o nome do responsável').max(80),
  name: z.string().trim().min(2, 'Informe o nome comercial').max(80),
  slug: slugSchema,
  description: optionalText(400),
  whatsapp: whatsappSchema,
  phone: optionalText(30).refine((value) => value === null || normalizeWhatsapp(value) !== null, 'Informe um telefone válido com DDD'),
  contactEmail: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'Informe um e-mail válido'),
  address: optionalText(160),
  city: optionalText(80),
  state: optionalText(2),
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  website: optionalUrl,
})

export const heroSchema = z.object({
  heroType: z.enum(['banner', 'banner_avatar', 'avatar']),
  displayName: optionalText(80),
  heroDescription: optionalText(300),
  bannerUrl: optionalUrl,
  avatarUrl: optionalUrl,
  colorScheme: z.enum(['sage', 'plum', 'terracotta', 'olive', 'slate', 'berry', 'teal', 'cocoa', 'mauve', 'forest', 'copper', 'charcoal']).default('sage'),
})

export const variationOptionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
  colorValue: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(),
  imageUrl: z.string().nullable().optional(),
})

export const variationSchema = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(['color', 'size', 'custom']),
  selectorType: z.enum(['text', 'color', 'number', 'image']),
  displayOnCard: z.boolean(),
  position: z.number().int().min(0).max(2),
  options: z.array(variationOptionSchema).min(1).max(50),
})

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do produto').max(120),
  referenceCode: z.string().trim().max(80).optional().transform((value) => value || null),
  sku: z.string().trim().max(80).optional().transform((value) => value || null),
  galleryImages: z.array(z.string().trim().min(1).max(2048)).max(12).default([]),
  description: optionalText(600),
  price: z.number({ error: 'Informe um preço válido' }).min(0, 'O preço não pode ser negativo').max(9_999_999),
  offerPrice: z.number({ error: 'Informe um valor de oferta válido' }).min(0).max(9_999_999).nullable(),
  priceOnRequest: z.boolean().default(false),
  stockStatus: z.enum(['in_stock', 'made_to_order', 'out_of_stock']),
  stockQuantity: z.number().int().min(0).nullable(),
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v && v !== 'none' ? v : null))
    .refine((v) => v === null || z.uuid().safeParse(v).success, 'Categoria inválida'),
  imageUrl: optionalUrl,
  isActive: z.boolean(),
  isPublished: z.boolean(),
  variations: z.array(variationSchema).max(3),
}).refine((data) => data.offerPrice === null || data.offerPrice < data.price, {
  path: ['offerPrice'],
  message: 'A oferta deve ser menor que o preço original',
})

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Informe ao menos 2 caracteres').max(60),
})

export const orderSchema = z.object({
  slug: z.string().trim().min(1),
  customerName: z.string().trim().min(2, 'Informe seu nome').max(80),
  customerPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        quantity: z.number().int().min(1).max(99),
        variations: z.array(z.object({ variationId: z.uuid(), optionId: z.uuid(), optionLabel: z.string().max(120) })).max(3).optional(),
      }),
    )
    .min(1, 'O carrinho está vazio')
    .max(100),
})

export const mercadoPagoSettingsSchema = z.object({
  environment: z.enum(['test', 'production']),
  publicKey: z.string().trim().max(255, 'Chave pública muito longa'),
  accessToken: z.string().trim().max(2048, 'Access Token muito longo'),
  webhookSecret: z.string().trim().max(1024, 'Segredo de webhook muito longo'),
  clearAccessToken: z.boolean(),
  clearWebhookSecret: z.boolean(),
}).superRefine((value, context) => {
  if (value.clearAccessToken && value.accessToken) {
    context.addIssue({ code: 'custom', path: ['accessToken'], message: 'Remova o token ou informe um novo, não ambos.' })
  }
  if (value.clearWebhookSecret && value.webhookSecret) {
    context.addIssue({ code: 'custom', path: ['webhookSecret'], message: 'Remova o segredo ou informe um novo, não ambos.' })
  }
})

export const planUpdateSchema = z.object({
  planId: z.uuid(),
  name: z.string().trim().min(2).max(40),
  description: optionalText(200),
  productLimit: z.number().int().min(0).max(100000),
  trialDays: z.number().int().min(0).max(365),
  price: z.number().min(0).max(9_999_999),
  billingPeriod: z.enum(['monthly', 'quarterly', 'semiannual', 'yearly']),
  isActive: z.boolean(),
})

export type FieldErrors = Record<string, string[] | undefined>

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    ;(out[key] ??= []).push(issue.message)
  }
  return out
}
