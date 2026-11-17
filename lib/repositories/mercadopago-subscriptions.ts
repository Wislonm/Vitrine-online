import 'server-only'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { plans, stores, subscriptions } from '@/lib/db/schema'
import { addBillingPeriod } from '@/lib/billing-period'

const paymentReversalStatuses = ['refunded', 'charged_back', 'chargeback']

function isPaymentReversal(status: string) {
  return paymentReversalStatuses.includes(status.toLowerCase())
}

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
      nextPaymentAt: subscriptions.mercadoPagoNextPaymentAt,
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
      mercadoPagoNextPaymentAt: null,
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
      mercadoPagoNextPaymentAt: null,
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
      nextPaymentAt: subscriptions.mercadoPagoNextPaymentAt,
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
  nextPaymentAt?: Date | null
}) {
  const providerStatus = input.status.toLowerCase()
  const retainsAccess = providerStatus === 'cancelled' && Boolean(input.currentPeriodEndsAt && input.currentPeriodEndsAt.getTime() > Date.now())
  const terminalStatus = isPaymentReversal(providerStatus) ? 'past_due'
    : providerStatus === 'cancelled' ? retainsAccess ? 'active' : 'cancelled'
      : providerStatus === 'paused' ? 'paused'
        : providerStatus === 'rejected' ? 'past_due'
          : providerStatus === 'authorized' ? 'active' : 'pending'
  const active = terminalStatus === 'active'
  const proPlanId = active ? await getActiveProPlanId() : null
  const statusGuard = ['pending', 'in_process'].includes(providerStatus)
    ? sql`${subscriptions.mercadoPagoStatus} NOT IN ('authorized', 'cancelled', 'paused', 'refunded', 'charged_back', 'chargeback')`
    : providerStatus === 'authorized'
      ? sql`${subscriptions.mercadoPagoStatus} NOT IN ('cancelled', 'paused', 'refunded', 'charged_back', 'chargeback')`
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
      mercadoPagoNextPaymentAt: providerStatus === 'cancelled' ? null : input.nextPaymentAt ?? null,
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

  if (updated?.storeId && isPaymentReversal(providerStatus)) {
    await db.update(stores).set({ status: 'suspended', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'active')))
  } else if (updated?.storeId && providerStatus === 'authorized') {
    await db.update(stores).set({ status: 'active', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'suspended')))
  }

  return updated ?? null
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
  const statusGuard = isPaymentReversal(providerStatus)
    ? sql`true`
    : sql`COALESCE(${subscriptions.mercadoPagoStatus}, '') NOT IN ('approved', 'refunded', 'charged_back', 'chargeback')`
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
      mercadoPagoNextPaymentAt: null,
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

  if (updated?.storeId && isPaymentReversal(providerStatus)) {
    await db.update(stores).set({ status: 'suspended', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'active')))
  } else if (updated?.storeId && approved) {
    await db.update(stores).set({ status: 'active', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'suspended')))
  }

  return updated ?? null
}

export async function applyMercadoPagoChargeback(input: {
  paymentId: string
  externalReference?: string | null
  preapprovalId?: string | null
}) {
  const conditions = [eq(subscriptions.mercadoPagoPaymentId, input.paymentId)]
  if (input.externalReference) conditions.push(eq(subscriptions.mercadoPagoExternalReference, input.externalReference))
  if (input.preapprovalId) conditions.push(eq(subscriptions.mercadoPagoPreapprovalId, input.preapprovalId))

  const [updated] = await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      mercadoPagoStatus: 'charged_back',
      mercadoPagoNextPaymentAt: null,
      expiresAt: new Date(),
      updatedAt: new Date(),
    })
    .where(or(...conditions))
    .returning({ storeId: subscriptions.storeId })

  if (updated?.storeId) {
    await db.update(stores).set({ status: 'suspended', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'active')))
  }

  return updated ?? null
}

export async function markMercadoPagoSubscriptionCancelled(input: { storeId: string; preapprovalId: string; accessUntil: Date | null }) {
  const keepAccess = Boolean(input.accessUntil && input.accessUntil.getTime() > Date.now())
  await db
    .update(subscriptions)
    .set({
      mercadoPagoStatus: 'cancelled',
      mercadoPagoNextPaymentAt: null,
      status: keepAccess ? 'active' : 'cancelled',
      expiresAt: keepAccess ? input.accessUntil : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.storeId, input.storeId), eq(subscriptions.mercadoPagoPreapprovalId, input.preapprovalId)))
}

export async function applyMercadoPagoAuthorizedPayment(input: { preapprovalId: string; status: string; nextPaymentAt?: Date | null }) {
  const providerStatus = input.status.toLowerCase()
  if (providerStatus === 'pending' || providerStatus === 'in_process') return null
  const approved = providerStatus === 'approved'
  const proPlanId = approved ? await getActiveProPlanId() : null
  const reversed = isPaymentReversal(providerStatus)
  const failed = ['rejected', 'cancelled', 'charged_back', 'chargeback', 'refunded'].includes(providerStatus)
  if (!approved && !failed) return null

  const update = await db
    .update(subscriptions)
    .set({
      status: approved ? 'active' : 'past_due',
      ...(reversed ? { mercadoPagoStatus: providerStatus, mercadoPagoNextPaymentAt: null } : {}),
      ...(proPlanId ? { planId: proPlanId } : {}),
      ...(approved ? { startedAt: new Date(), expiresAt: null, mercadoPagoNextPaymentAt: input.nextPaymentAt ?? null } : {}),
      updatedAt: new Date(),
    })
    .where(and(
      eq(subscriptions.mercadoPagoPreapprovalId, input.preapprovalId),
      sql`${subscriptions.mercadoPagoStatus} NOT IN ('cancelled', 'paused', 'refunded', 'charged_back', 'chargeback')`,
    ))
    .returning({ storeId: subscriptions.storeId })
  const updated = update[0]
  if (updated?.storeId && reversed) {
    await db.update(stores).set({ status: 'suspended', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'active')))
  } else if (updated?.storeId && approved) {
    await db.update(stores).set({ status: 'active', updatedAt: new Date() }).where(and(eq(stores.id, updated.storeId), eq(stores.status, 'suspended')))
  }
  return updated ?? null
}
