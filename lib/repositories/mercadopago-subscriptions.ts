import 'server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, subscriptions } from '@/lib/db/schema'

async function getActiveProPlanId() {
  const [plan] = await db.select({ id: plans.id }).from(plans).where(and(eq(plans.slug, 'business'), eq(plans.isActive, true))).limit(1)
  return plan?.id ?? null
}

export async function getMercadoPagoSubscriptionState(storeId: string) {
  const [row] = await db
    .select({
      status: subscriptions.status,
      expiresAt: subscriptions.expiresAt,
      preapprovalId: subscriptions.mercadoPagoPreapprovalId,
      paymentId: subscriptions.mercadoPagoPaymentId,
      externalReference: subscriptions.mercadoPagoExternalReference,
      providerStatus: subscriptions.mercadoPagoStatus,
      paymentMethod: subscriptions.mercadoPagoPaymentMethod,
      checkoutMode: subscriptions.mercadoPagoCheckoutMode,
      checkoutStartedAt: subscriptions.mercadoPagoCheckoutStartedAt,
      amount: subscriptions.mercadoPagoAmount,
      billingPeriod: subscriptions.mercadoPagoBillingPeriod,
      pixQrCode: subscriptions.mercadoPagoPixQrCode,
      pixQrCodeBase64: subscriptions.mercadoPagoPixQrCodeBase64,
      pixExpiresAt: subscriptions.mercadoPagoPixExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.storeId, storeId))
    .limit(1)
  return row ?? null
}

export async function claimMercadoPagoCheckout(input: {
  storeId: string
  externalReference: string
  amount: string
  billingPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
  checkoutMode: 'recurring' | 'one_time'
  paymentMethod: 'card' | 'pix'
  consentVersion: string
}) {
  const [claim] = await db
    .update(subscriptions)
    .set({
      mercadoPagoExternalReference: input.externalReference,
      mercadoPagoCheckoutStartedAt: new Date(),
      mercadoPagoPreapprovalId: null,
      mercadoPagoPaymentId: null,
      mercadoPagoStatus: 'processing',
      mercadoPagoPaymentMethod: input.paymentMethod,
      mercadoPagoCheckoutMode: input.checkoutMode,
      mercadoPagoAmount: input.amount,
      mercadoPagoBillingPeriod: input.billingPeriod,
      mercadoPagoPixQrCode: null,
      mercadoPagoPixQrCodeBase64: null,
      mercadoPagoPixExpiresAt: null,
      mercadoPagoConsentAt: new Date(),
      mercadoPagoConsentVersion: input.consentVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.storeId, input.storeId), isNull(subscriptions.mercadoPagoCheckoutStartedAt)))
    .returning({ id: subscriptions.id })
  return Boolean(claim)
}

export async function releaseMercadoPagoCheckout(storeId: string, externalReference: string) {
  await db
    .update(subscriptions)
    .set({
      mercadoPagoExternalReference: null,
      mercadoPagoCheckoutStartedAt: null,
      mercadoPagoStatus: null,
      mercadoPagoPaymentId: null,
      mercadoPagoPaymentMethod: null,
      mercadoPagoCheckoutMode: null,
      mercadoPagoAmount: null,
      mercadoPagoBillingPeriod: null,
      mercadoPagoPixQrCode: null,
      mercadoPagoPixQrCodeBase64: null,
      mercadoPagoPixExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(and(
      eq(subscriptions.storeId, storeId),
      eq(subscriptions.mercadoPagoExternalReference, externalReference),
      isNull(subscriptions.mercadoPagoPreapprovalId),
    ))
}

export async function getMercadoPagoCheckoutByExternalReference(externalReference: string) {
  const [row] = await db
    .select({
      storeId: subscriptions.storeId,
      preapprovalId: subscriptions.mercadoPagoPreapprovalId,
      amount: subscriptions.mercadoPagoAmount,
      billingPeriod: subscriptions.mercadoPagoBillingPeriod,
      checkoutMode: subscriptions.mercadoPagoCheckoutMode,
      paymentMethod: subscriptions.mercadoPagoPaymentMethod,
      paymentId: subscriptions.mercadoPagoPaymentId,
      pixQrCode: subscriptions.mercadoPagoPixQrCode,
      pixQrCodeBase64: subscriptions.mercadoPagoPixQrCodeBase64,
      pixExpiresAt: subscriptions.mercadoPagoPixExpiresAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.mercadoPagoExternalReference, externalReference))
    .limit(1)
  return row ?? null
}

export async function saveMercadoPagoPreapproval(input: {
  preapprovalId: string
  externalReference: string
  status: string
  amount: string
  billingPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
  currentPeriodEndsAt?: Date | null
}) {
  const providerStatus = input.status.toLowerCase()
  const retainsAccess = providerStatus === 'cancelled' && Boolean(input.currentPeriodEndsAt && input.currentPeriodEndsAt.getTime() > Date.now())
  const terminalStatus = providerStatus === 'cancelled' ? retainsAccess ? 'active' : 'cancelled'
    : providerStatus === 'paused' ? 'paused'
      : providerStatus === 'rejected' ? 'past_due'
        : providerStatus === 'authorized' ? 'active' : 'pending'
  const active = terminalStatus === 'active'
  const proPlanId = active ? await getActiveProPlanId() : null
  const statusGuard = ['pending', 'in_process'].includes(providerStatus)
    ? sql`${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'authorized' AND ${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'cancelled' AND ${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'paused'`
    : providerStatus === 'authorized'
      ? sql`${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'cancelled' AND ${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'paused'`
      : sql`true`

  const [updated] = await db
    .update(subscriptions)
    .set({
      mercadoPagoPreapprovalId: input.preapprovalId,
      mercadoPagoPaymentId: null,
      mercadoPagoExternalReference: input.externalReference,
      mercadoPagoStatus: providerStatus,
      mercadoPagoPaymentMethod: 'card',
      mercadoPagoCheckoutMode: 'recurring',
      mercadoPagoCheckoutStartedAt: null,
      mercadoPagoAmount: input.amount,
      mercadoPagoBillingPeriod: input.billingPeriod,
      mercadoPagoPixQrCode: null,
      mercadoPagoPixQrCodeBase64: null,
      mercadoPagoPixExpiresAt: null,
      status: terminalStatus,
      ...(proPlanId ? { planId: proPlanId } : {}),
      ...(active ? { startedAt: new Date(), expiresAt: retainsAccess ? input.currentPeriodEndsAt ?? null : null } : providerStatus === 'cancelled' ? { expiresAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.mercadoPagoExternalReference, input.externalReference), statusGuard))
    .returning({ storeId: subscriptions.storeId })
  return updated ?? null
}

const billingPeriodMonths = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12 } as const

function addBillingPeriod(start: Date, period: keyof typeof billingPeriodMonths) {
  const result = new Date(start)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + billingPeriodMonths[period])
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

export async function saveMercadoPagoOneTimePayment(input: {
  paymentId: string
  externalReference: string
  status: string
  paymentMethod: 'card' | 'pix'
  amount: string
  billingPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  pixExpiresAt?: Date | null
  approvedAt?: Date | null
}) {
  const providerStatus = input.status.toLowerCase()
  const approved = providerStatus === 'approved'
  const pending = providerStatus === 'pending' || providerStatus === 'in_process'
  const startedAt = input.approvedAt && !Number.isNaN(input.approvedAt.getTime()) ? input.approvedAt : new Date()
  const expiresAt = approved ? addBillingPeriod(startedAt, input.billingPeriod) : undefined
  const proPlanId = approved ? await getActiveProPlanId() : null
  const statusGuard = approved ? sql`true` : sql`${subscriptions.mercadoPagoStatus} IS DISTINCT FROM 'approved'`
  const [updated] = await db
    .update(subscriptions)
    .set({
      mercadoPagoPaymentId: input.paymentId,
      mercadoPagoPreapprovalId: null,
      mercadoPagoExternalReference: input.externalReference,
      mercadoPagoStatus: providerStatus,
      mercadoPagoPaymentMethod: input.paymentMethod,
      mercadoPagoCheckoutMode: 'one_time',
      mercadoPagoCheckoutStartedAt: null,
      mercadoPagoAmount: input.amount,
      mercadoPagoBillingPeriod: input.billingPeriod,
      mercadoPagoPixQrCode: input.pixQrCode ?? null,
      mercadoPagoPixQrCodeBase64: input.pixQrCodeBase64 ?? null,
      mercadoPagoPixExpiresAt: input.pixExpiresAt ?? null,
      status: approved ? 'active' : pending ? 'pending' : 'past_due',
      ...(proPlanId ? { planId: proPlanId } : {}),
      ...(approved ? { startedAt, expiresAt } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.mercadoPagoExternalReference, input.externalReference), statusGuard))
    .returning({ storeId: subscriptions.storeId })
  return updated ?? null
}

export async function markMercadoPagoSubscriptionCancelled(input: { storeId: string; preapprovalId: string; accessUntil: Date | null }) {
  const keepAccess = Boolean(input.accessUntil && input.accessUntil.getTime() > Date.now())
  await db
    .update(subscriptions)
    .set({
      mercadoPagoStatus: 'cancelled',
      status: keepAccess ? 'active' : 'cancelled',
      expiresAt: keepAccess ? input.accessUntil : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.storeId, input.storeId), eq(subscriptions.mercadoPagoPreapprovalId, input.preapprovalId)))
}

export async function applyMercadoPagoAuthorizedPayment(input: { preapprovalId: string; status: string }) {
  const providerStatus = input.status.toLowerCase()
  if (providerStatus === 'pending' || providerStatus === 'in_process') return null
  const approved = providerStatus === 'approved'
  const proPlanId = approved ? await getActiveProPlanId() : null
  const failed = ['rejected', 'cancelled', 'charged_back'].includes(providerStatus)
  if (!approved && !failed) return null

  const update = await db
    .update(subscriptions)
    .set({
      status: approved ? 'active' : 'past_due',
      ...(proPlanId ? { planId: proPlanId } : {}),
      ...(approved ? { startedAt: new Date(), expiresAt: null } : {}),
      updatedAt: new Date(),
    })
    .where(and(
      eq(subscriptions.mercadoPagoPreapprovalId, input.preapprovalId),
      sql`${subscriptions.mercadoPagoStatus} NOT IN ('cancelled', 'paused')`,
    ))
    .returning({ storeId: subscriptions.storeId })
  return update[0] ?? null
}
