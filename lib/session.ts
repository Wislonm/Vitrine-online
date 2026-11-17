import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user as userTable } from '@/lib/db/schema'
import { getPlanForStore } from '@/lib/repositories/plans'
import { ensureStoreForUser } from '@/lib/services/store-service'

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() })
})

/** Lê usuário (papel e status) direto do banco: a autorização nunca depende só do cookie. */
const getAccount = cache(async (userId: string) => {
  const [row] = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
  return row ?? null
})

export class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message)
  }
}

export const TRIAL_EXPIRED_MESSAGE = 'Seu período de teste terminou. Contrate o plano para continuar usando o painel.'

export class SubscriptionExpiredError extends Error {
  constructor() {
    super(TRIAL_EXPIRED_MESSAGE)
  }
}

async function hasExpiredSubscription(storeId: string) {
  const plan = await getPlanForStore(storeId)
  const subscription = plan?.subscription
  if (!subscription) return false
  const terminalStatuses = ['expired', 'past_due', 'pending', 'paused', 'cancelled', 'suspended']
  return Boolean((subscription.expiresAt && subscription.expiresAt.getTime() <= Date.now()) || terminalStatuses.includes(subscription.status))
}

/** Para páginas: redireciona ao login quando não autenticado ou bloqueado. */
export async function requireUser() {
  const session = await getSession()
  if (!session?.user) redirect('/login')
  const account = await getAccount(session.user.id)
  if (!account || account.status === 'blocked') redirect('/login?bloqueado=1')
  return account
}

/** Para páginas do painel do vendedor: usuário + loja de sua propriedade. */
export async function requireSellerContext(options: { allowExpiredPlan?: boolean } = {}) {
  const account = await requireUser()
  const store = await ensureStoreForUser(account)
  const subscriptionExpired = account.role !== 'admin' && await hasExpiredSubscription(store.id)
  if (subscriptionExpired && !options.allowExpiredPlan) redirect('/painel/plano')
  return { user: account, store, subscriptionExpired }
}

export async function requireAdmin() {
  const account = await requireUser()
  if (account.role !== 'admin') redirect('/painel')
  return account
}

/** Para server actions e route handlers: lança em vez de redirecionar. */
export async function getSellerContextOrThrow(options: { allowExpiredPlan?: boolean } = {}) {
  const session = await getSession()
  if (!session?.user) throw new UnauthorizedError()
  const account = await getAccount(session.user.id)
  if (!account || account.status === 'blocked') throw new UnauthorizedError()
  const store = await ensureStoreForUser(account)
  const subscriptionExpired = account.role !== 'admin' && await hasExpiredSubscription(store.id)
  if (subscriptionExpired && !options.allowExpiredPlan) throw new SubscriptionExpiredError()
  return { user: account, store, subscriptionExpired }
}

export async function getAdminOrThrow() {
  const session = await getSession()
  if (!session?.user) throw new UnauthorizedError()
  const account = await getAccount(session.user.id)
  if (!account || account.status === 'blocked' || account.role !== 'admin') {
    throw new UnauthorizedError()
  }
  return account
}
