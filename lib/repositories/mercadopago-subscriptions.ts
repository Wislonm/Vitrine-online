import 'server-only'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'

export async function getMercadoPagoSubscriptionState(storeId: string) {
  const [row] = await db
    .select({
      status: subscriptions.status,
      expiresAt: subscriptions.expiresAt,
      preapprovalId: subscriptions.mercadoPagoPreapprovalId,
      externalReference: subscriptions.mercadoPagoExternalReference,
      providerStatus: subscriptions.mercadoPagoStatus,
      checkoutStartedAt: subscriptions.mercadoPagoCheckoutStartedAt,
      amount: subscriptions.mercadoPagoAmount,
      billingPeriod: subscriptions.mercadoPagoBillingPeriod,
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
}) {
  const [claim] = await db
    .update(subscriptions)
    .set({
      mercadoPagoExternalReference: input.externalReference,
      mercadoPagoCheckoutStartedAt: new Date(),
      mercadoPagoPreapprovalId: null,
      mercadoPagoStatus: 'processing',
      mercadoPagoAmount: input.amount,
      mercadoPagoBillingPeriod: input.billingPeriod,
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
      mercadoPagoAmount: null,
      mercadoPagoBillingPeriod: null,
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
}) {
  const providerStatus = input.status.toLowerCase()
  const terminalStatus = providerStatus === 'cancelled' ? 'cancelled'
    : providerStatus === 'paused' ? 'paused'
      : providerStatus === 'rejected' ? 'past_due'
        : providerStatus === 'authorized' ? 'active' : 'pending'
  const active = terminalStatus === 'active'

  const [updated] = await db
    .update(subscriptions)
    .set({
      mercadoPagoPreapprovalId: input.preapprovalId,
      mercadoPagoExternalReference: input.externalReference,
      mercadoPagoStatus: providerStatus,
      mercadoPagoCheckoutStartedAt: null,
      mercadoPagoAmount: input.amount,
      mercadoPagoBillingPeriod: input.billingPeriod,
      status: terminalStatus,
      ...(active ? { startedAt: new Date(), expiresAt: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.mercadoPagoExternalReference, input.externalReference))
    .returning({ storeId: subscriptions.storeId })
  return updated ?? null
}

export async function applyMercadoPagoAuthorizedPayment(input: { preapprovalId: string; status: string }) {
  const approved = input.status.toLowerCase() === 'approved'
  const update = await db
    .update(subscriptions)
    .set({
      status: approved ? 'active' : 'past_due',
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
