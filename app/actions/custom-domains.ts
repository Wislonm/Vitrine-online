'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSellerContextOrThrow, SubscriptionExpiredError, UnauthorizedError } from '@/lib/session'
import { hasCustomDomainFeature } from '@/lib/services/custom-domains'
import { normalizeCustomDomain } from '@/lib/domain-utils'
import { getStoreDomainForStore, removeStoreDomain, reserveStoreDomain, updateStoreDomain } from '@/lib/repositories/store-domains'
import { getDomainHosts, ensureProjectDomain, getProjectDomainCheck, removeProjectDomain, verifyProjectDomain, VercelDomainApiError } from '@/lib/vercel-domains'
import type { StoreDomainVerification } from '@/lib/db/schema'
import type { CustomDomainActionResult } from '@/lib/domain-types'

const DOMAIN_INPUT_ERROR = 'Informe um domínio válido, por exemplo minhaloja.com.br.'

function isProductionDomainManagementEnabled() {
  return process.env.VERCEL_ENV === 'production' && Boolean(process.env.VERCEL_API_TOKEN?.trim())
}

function toSafeError(error: unknown) {
  if (error instanceof VercelDomainApiError) {
    if (error.code === 'missing_token') return 'O gerenciamento de domínios está temporariamente indisponível.'
    if (error.status === 401 || error.status === 403) return 'A Vercel recusou a credencial de domínio. Fale com o suporte.'
    if (error.status === 409 || error.code === 'domain_already_in_use') return 'Esse domínio já está associado a outro projeto Vercel.'
    if (error.status === 429) return 'Muitas verificações. Aguarde alguns instantes e tente novamente.'
  }
  if (error instanceof Error && error.message.includes('temporariamente indisponível')) return error.message
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
    return 'Esse domínio já está conectado a outra loja.'
  }
  return 'Não foi possível concluir a operação de domínio. Tente novamente.'
}

function isPendingDnsError(error: unknown) {
  return error instanceof VercelDomainApiError && (error.status === 400 || error.status === 409)
}

async function refreshDomain(domain: string, storeId: string, shouldVerify: boolean) {
  const hosts = getDomainHosts(domain)
  await Promise.all(hosts.map(ensureProjectDomain))

  if (shouldVerify) {
    await Promise.all(hosts.map(async (hostname) => {
      try {
        await verifyProjectDomain(hostname)
      } catch (error) {
        if (!isPendingDnsError(error)) throw error
      }
    }))
  }

  const [apex, www] = await Promise.all(hosts.map((hostname) => getProjectDomainCheck(hostname, domain)))
  const active = apex.verified && www.verified && !apex.misconfigured && !www.misconfigured
  const verification: StoreDomainVerification = { apex, www }
  const saved = await updateStoreDomain(storeId, {
    status: active ? 'active' : 'pending',
    verification,
    lastCheckedAt: new Date(),
    verifiedAt: active ? new Date() : null,
    lastError: null,
  })
  return { saved, active }
}

async function requireEligibleSeller() {
  const context = await getSellerContextOrThrow()
  if (!(await hasCustomDomainFeature(context.store.id))) {
    throw new Error('O domínio personalizado está disponível somente no plano Pro/Business.')
  }
  if (!isProductionDomainManagementEnabled()) {
    throw new Error(process.env.VERCEL_ENV === 'production'
      ? 'O gerenciamento de domínios está temporariamente indisponível.'
      : 'A conexão de domínios só pode ser concluída no ambiente de produção.')
  }
  return context
}

function errorResult(error: unknown, domain?: CustomDomainActionResult['domain']): CustomDomainActionResult {
  if (error instanceof UnauthorizedError) return { ok: false, error: 'Faça login para gerenciar seu domínio.' }
  if (error instanceof SubscriptionExpiredError) return { ok: false, error: error.message }
  if (error instanceof Error && error.message.includes('disponível somente no plano Pro/Business')) {
    return { ok: false, error: error.message }
  }
  if (error instanceof Error && error.message.includes('ambiente de produção')) {
    return { ok: false, error: error.message }
  }
  return { ok: false, error: toSafeError(error), domain }
}

export async function connectCustomDomainAction(rawDomain: unknown): Promise<CustomDomainActionResult> {
  let storeId: string | undefined
  let savedDomain: CustomDomainActionResult['domain']

  try {
    const { store } = await requireEligibleSeller()
    storeId = store.id
    const parsed = z.string().trim().min(1).max(253).safeParse(rawDomain)
    if (!parsed.success) return { ok: false, error: DOMAIN_INPUT_ERROR }
    const domain = normalizeCustomDomain(parsed.data)
    if (!domain) return { ok: false, error: DOMAIN_INPUT_ERROR }

    const existing = await getStoreDomainForStore(store.id)
    if (existing?.domain && existing.domain !== domain) {
      return { ok: false, error: `Desconecte ${existing.domain} antes de cadastrar outro domínio.`, domain: existing }
    }
    savedDomain = existing
      ? existing.domain
        ? await updateStoreDomain(store.id, { enabled: true }) ?? existing
        : await updateStoreDomain(store.id, { domain, enabled: true, status: 'pending', verification: {}, verifiedAt: null, lastError: null }) ?? existing
      : await reserveStoreDomain(store.id, domain)
    const { saved, active } = await refreshDomain(domain, store.id, false)
    revalidatePath('/painel/dominio')
    revalidatePath('/painel', 'layout')
    return {
      ok: true,
      domain: saved,
      message: active ? 'Domínio conectado e verificado.' : 'Domínio adicionado. Configure os registros DNS abaixo para ativá-lo.',
    }
  } catch (error) {
    if (storeId && savedDomain) {
      const updated = await updateStoreDomain(storeId, {
        status: savedDomain.status === 'active' ? 'active' : 'error',
        lastError: toSafeError(error),
        lastCheckedAt: new Date(),
      }).catch(() => null)
      savedDomain = updated ?? savedDomain
    }
    return errorResult(error, savedDomain)
  }
}

export async function verifyCustomDomainAction(): Promise<CustomDomainActionResult> {
  let storeId: string | undefined
  let savedDomain: CustomDomainActionResult['domain']

  try {
    const { store } = await requireEligibleSeller()
    storeId = store.id
    const existing = await getStoreDomainForStore(store.id)
    if (!existing?.domain) return { ok: false, error: 'Informe e conecte um domínio antes de verificar.' }
    savedDomain = existing

    const { saved, active } = await refreshDomain(existing.domain, store.id, true)
    revalidatePath('/painel/dominio')
    revalidatePath('/painel', 'layout')
    return {
      ok: true,
      domain: saved,
      message: active ? 'Domínio verificado e ativo.' : 'Ainda não foi possível verificar os registros DNS. Confira os valores e tente novamente após a propagação.',
    }
  } catch (error) {
    if (storeId && savedDomain) {
      const updated = await updateStoreDomain(storeId, {
        status: savedDomain.status === 'active' ? 'active' : 'pending',
        lastError: toSafeError(error),
        lastCheckedAt: new Date(),
      }).catch(() => null)
      savedDomain = updated ?? savedDomain
    }
    return errorResult(error, savedDomain)
  }
}

export async function setCustomDomainEnabledAction(rawEnabled: unknown): Promise<CustomDomainActionResult> {
  const parsed = z.boolean().safeParse(rawEnabled)
  if (!parsed.success) return { ok: false, error: 'Escolha uma opção válida para o domínio.' }
  const enabled = parsed.data
  let storeId: string | undefined
  let savedDomain: CustomDomainActionResult['domain']

  try {
    const context = enabled
      ? await getSellerContextOrThrow()
      : await getSellerContextOrThrow({ allowExpiredPlan: true })
    storeId = context.store.id
    if (enabled && !(await hasCustomDomainFeature(context.store.id))) {
      return { ok: false, error: 'O domínio personalizado está disponível somente no plano Pro/Business.' }
    }
    const existing = await getStoreDomainForStore(context.store.id)
    if (existing?.domain && process.env.VERCEL_ENV !== 'production') {
      return { ok: false, error: 'A preferência de um domínio já conectado só pode ser alterada em produção.', domain: existing }
    }
    if (!existing && !enabled) {
      return { ok: true, domain: null, message: 'O endereço padrão da plataforma está selecionado.' }
    }
    savedDomain = existing ?? await reserveStoreDomain(context.store.id, null)
    const updated = await updateStoreDomain(context.store.id, { enabled })
    if (!updated) return { ok: false, error: 'Não foi possível salvar a preferência do domínio.', domain: savedDomain }
    revalidatePath('/painel/perfil')
    revalidatePath('/painel', 'layout')
    return {
      ok: true,
      domain: updated,
      message: enabled ? 'O domínio personalizado foi selecionado.' : 'O endereço padrão da plataforma foi selecionado.',
    }
  } catch (error) {
    return errorResult(error, savedDomain)
  }
}

export async function disconnectCustomDomainAction(): Promise<CustomDomainActionResult> {
  let storeId: string | undefined
  let savedDomain: CustomDomainActionResult['domain']

  try {
    const { store } = await getSellerContextOrThrow({ allowExpiredPlan: true })
    storeId = store.id
    if (!isProductionDomainManagementEnabled()) {
      throw new Error(process.env.VERCEL_ENV === 'production'
        ? 'O gerenciamento de domínios está temporariamente indisponível.'
        : 'A conexão de domínios só pode ser concluída no ambiente de produção.')
    }
    const existing = await getStoreDomainForStore(store.id)
    if (!existing) return { ok: true, domain: null, message: 'Nenhum domínio personalizado está conectado.' }
    savedDomain = existing

    if (existing.domain) {
      await updateStoreDomain(store.id, { status: 'error', lastError: null, lastCheckedAt: new Date() })
      await Promise.all(getDomainHosts(existing.domain).map(removeProjectDomain))
    }
    await removeStoreDomain(store.id)
    revalidatePath('/painel/dominio')
    revalidatePath('/painel', 'layout')
    return { ok: true, domain: null, message: 'Domínio desconectado.' }
  } catch (error) {
    if (storeId && savedDomain) {
      const updated = await updateStoreDomain(storeId, { status: 'error', lastError: toSafeError(error), lastCheckedAt: new Date() }).catch(() => null)
      savedDomain = updated ?? savedDomain
    }
    return errorResult(error, savedDomain)
  }
}
