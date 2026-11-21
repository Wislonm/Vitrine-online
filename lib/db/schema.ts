import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// --- Better Auth (nomes camelCase exigidos pela biblioteca) ----------------

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  whatsapp: text('whatsapp'),
  commercialName: text('commercialName'),
  documentType: text('documentType'),
  documentNumber: text('documentNumber'),
  termsAccepted: boolean('termsAccepted').notNull().default(false),
  termsAcceptedAt: timestamp('termsAcceptedAt'),
  termsVersion: text('termsVersion'),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- Domínio da plataforma --------------------------------------------------

const tz = { withTimezone: true } as const

export type PlanFeatures = {
  public_storefront?: boolean
  categories?: boolean
  side_cart?: boolean
  whatsapp_orders?: boolean
  hero_customization?: boolean
  seller_panel?: boolean
  custom_domain?: boolean
}

export type SocialLinks = {
  instagram?: string
  facebook?: string
  tiktok?: string
  website?: string
}

export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  productLimit: integer('product_limit').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull().default('0'),
  monthlyPrice: numeric('monthly_price', { precision: 12, scale: 2 }),
  semiannualPrice: numeric('semiannual_price', { precision: 12, scale: 2 }),
  annualPrice: numeric('annual_price', { precision: 12, scale: 2 }),
  trialDays: integer('trial_days').notNull().default(0),
  billingPeriod: text('billing_period', { enum: ['monthly', 'quarterly', 'semiannual', 'yearly'] }).notNull().default('monthly'),
  features: jsonb('features').$type<PlanFeatures>().notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
})

export const paymentSettings = pgTable('payment_settings', {
  id: integer('id').primaryKey().default(1),
  provider: text('provider').notNull().default('mercadopago'),
  environment: text('environment', { enum: ['test', 'production'] }).notNull().default('test'),
  publicKey: text('public_key'),
  accessTokenEncrypted: text('access_token_encrypted'),
  webhookSecretEncrypted: text('webhook_secret_encrypted'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
})

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: text('owner_user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  whatsapp: text('whatsapp'),
  documentType: text('document_type'),
  documentNumber: text('document_number'),
  phone: text('phone'),
  contactEmail: text('contact_email'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
})

export type DomainDnsRecord = {
  name: string
  type: string
  value: string
  reason?: string
}

export type DomainHostVerification = {
  hostname: string
  verified: boolean
  misconfigured: boolean
  dnsRecords: DomainDnsRecord[]
  error?: string
}

export type StoreDomainVerification = Partial<Record<'apex' | 'www', DomainHostVerification>>

export const storeDomains = pgTable('store_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().unique(),
  domain: text('domain').unique(),
  enabled: boolean('enabled').notNull().default(true),
  status: text('status', { enum: ['pending', 'active', 'error'] }).notNull().default('pending'),
  verification: jsonb('verification').$type<StoreDomainVerification>().notNull().default({}),
  lastCheckedAt: timestamp('last_checked_at', tz),
  verifiedAt: timestamp('verified_at', tz),
  lastError: text('last_error'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
})

export type StoreDomain = typeof storeDomains.$inferSelect

export const storeSettings = pgTable('store_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .unique()
    .references(() => stores.id, { onDelete: 'cascade' }),
  heroType: text('hero_type', { enum: ['banner', 'banner_avatar', 'avatar'] })
    .notNull()
    .default('banner_avatar'),
  bannerUrl: text('banner_url'),
  avatarUrl: text('avatar_url'),
  displayName: text('display_name'),
  heroDescription: text('hero_description'),
  colorScheme: text('color_scheme').notNull().default('sage'),
  socialLinks: jsonb('social_links').$type<SocialLinks>().notNull().default({}),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
})

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('categories_store_name_uq').on(t.storeId, sql`lower(${t.name})`)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    referenceCode: text('reference_code'),
    sku: text('sku'),
    galleryImages: text('gallery_images').array().notNull().default(sql`'{}'::text[]`),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    offerPrice: numeric('offer_price', { precision: 12, scale: 2 }),
    priceOnRequest: boolean('price_on_request').notNull().default(false),
    stockStatus: text('stock_status').notNull().default('in_stock'),
    stockQuantity: integer('stock_quantity'),
    sortOrder: integer('sort_order').notNull().default(0),
    imageUrl: text('image_url'),
    isActive: boolean('is_active').notNull().default(true),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  },
  (t) => [
    index('products_store_idx').on(t.storeId, t.isActive, t.isPublished),
    index('products_category_idx').on(t.categoryId),
  ],
)

export type VariationKind = 'color' | 'size' | 'custom'
export type VariationSelector = 'text' | 'color' | 'number' | 'image'

export const productVariations = pgTable(
  'product_variations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    selectorType: text('selector_type').notNull(),
    displayOnCard: boolean('display_on_card').notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('product_variations_product_position_uq').on(t.productId, t.position)],
)

export const productVariationOptions = pgTable(
  'product_variation_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    variationId: uuid('variation_id').notNull().references(() => productVariations.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    value: text('value').notNull(),
    colorValue: text('color_value'),
    imageUrl: text('image_url'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('product_variation_options_position_uq').on(t.variationId, t.position)],
)

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .unique()
    .references(() => stores.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  status: text('status').notNull().default('active'),
  startedAt: timestamp('started_at', tz).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', tz),
  mercadoPagoPreapprovalId: text('mercadopago_preapproval_id'),
  mercadoPagoPaymentId: text('mercadopago_payment_id'),
  mercadoPagoExternalReference: text('mercadopago_external_reference'),
  mercadoPagoStatus: text('mercadopago_status'),
  mercadoPagoPaymentMethod: text('mercadopago_payment_method', { enum: ['card', 'pix'] }),
  mercadoPagoCheckoutMode: text('mercadopago_checkout_mode', { enum: ['recurring', 'one_time'] }),
  mercadoPagoCheckoutStartedAt: timestamp('mercadopago_checkout_started_at', tz),
  mercadoPagoAmount: numeric('mercadopago_amount', { precision: 12, scale: 2 }),
  mercadoPagoBillingPeriod: text('mercadopago_billing_period', { enum: ['monthly', 'quarterly', 'semiannual', 'yearly'] }),
  mercadoPagoNextPaymentAt: timestamp('mercadopago_next_payment_at', tz),
  mercadoPagoPixQrCode: text('mercadopago_pix_qr_code'),
  mercadoPagoPixQrCodeBase64: text('mercadopago_pix_qr_code_base64'),
  mercadoPagoPixExpiresAt: timestamp('mercadopago_pix_expires_at', tz),
  mercadoPagoConsentAt: timestamp('mercadopago_consent_at', tz),
  mercadoPagoConsentVersion: text('mercadopago_consent_version'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('subscriptions_mercadopago_preapproval_uq').on(t.mercadoPagoPreapprovalId).where(sql`${t.mercadoPagoPreapprovalId} IS NOT NULL`),
  uniqueIndex('subscriptions_mercadopago_payment_uq').on(t.mercadoPagoPaymentId).where(sql`${t.mercadoPagoPaymentId} IS NOT NULL`),
  uniqueIndex('subscriptions_mercadopago_external_reference_uq').on(t.mercadoPagoExternalReference).where(sql`${t.mercadoPagoExternalReference} IS NOT NULL`),
])

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone'),
    notes: text('notes'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').notNull().default('sent_to_whatsapp'),
    createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  },
  (t) => [index('orders_store_idx').on(t.storeId, t.createdAt)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    productName: text('product_name').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
)

export const adminAuditLog = pgTable('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminUserId: text('admin_user_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  targetStoreId: uuid('target_store_id').references(() => stores.id, {
    onDelete: 'set null',
  }),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
})
