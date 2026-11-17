'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminOrThrow, UnauthorizedError } from '@/lib/session'
import { deleteAccountPermanently, getAccountDeletionSnapshot, getStoreById, getUserById, recordAdminAction, setUserStatus } from '@/lib/repositories/admin'
import { isAssetOwnedByStore, storage } from '@/lib/storage'
import { getPlanPrice, listPlans, setStorePlan, updatePlan, type CheckoutBillingPeriod } from '@/lib/repositories/plans'
import { getMercadoPagoCredentialsForServer, getMercadoPagoSettingsForAdmin, saveMercadoPagoSettings } from '@/lib/repositories/payment-settings'
import { mercadoPagoSettingsSchema, planUpdateSchema, zodFieldErrors, type ActionResult } from '@/lib/validators'

const FORBIDDEN = 'Você não tem permissão para esta ação.'

export async function changeStorePlanAction(
  storeId: string,
  planId: string,
  period: CheckoutBillingPeriod,
): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    const parsedPeriod = z.enum(['monthly', 'semiannual', 'yearly']).safeParse(period)
    if (!z.uuid().safeParse(storeId).success || !z.uuid().safeParse(planId).success || !parsedPeriod.success) {
      return { ok: false, error: 'Dados inválidos' }
    }
    const store = await getStoreById(storeId)
    const plan = (await listPlans({ onlyActive: true })).find((p) => p.id === planId)
    if (!store || !plan) return { ok: false, error: 'Loja ou plano não encontrado' }

    const amount = getPlanPrice(plan, parsedPeriod.data)
    if (amount === null || amount <= 0) return { ok: false, error: 'Esse período não está configurado para o plano selecionado.' }

    await setStorePlan(storeId, planId, parsedPeriod.data, amount)
    await recordAdminAction({
      adminUserId: admin.id,
      action: 'change_plan',
      targetStoreId: storeId,
      details: { plan: plan.slug, period: parsedPeriod.data, amount },
    })
    revalidatePath('/admin', 'layout')
    revalidatePath('/admin/usuarios')
    revalidatePath('/painel/plano')
    return { ok: true, message: `Plano ${plan.name} aplicado por ${parsedPeriod.data === 'monthly' ? '1 mês' : parsedPeriod.data === 'semiannual' ? '6 meses' : '1 ano'}` }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] changePlan', error)
    return { ok: false, error: 'Não foi possível alterar o plano.' }
  }
}

export async function setAccountStatusAction(
  userId: string,
  status: 'active' | 'blocked',
): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    if (!['active', 'blocked'].includes(status)) return { ok: false, error: 'Dados inválidos' }
    if (userId === admin.id) return { ok: false, error: 'Você não pode bloquear a própria conta.' }

    const target = await getUserById(userId)
    if (!target) return { ok: false, error: 'Usuário não encontrado' }
    if (target.role === 'admin') return { ok: false, error: 'Contas de administrador não podem ser bloqueadas aqui.' }

    await setUserStatus(userId, status)
    await recordAdminAction({
      adminUserId: admin.id,
      action: status === 'blocked' ? 'block_account' : 'unblock_account',
      details: { userId, email: target.email },
    })
    revalidatePath('/admin', 'layout')
    return { ok: true, message: status === 'blocked' ? 'Conta bloqueada' : 'Conta desbloqueada' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] setStatus', error)
    return { ok: false, error: 'Não foi possível atualizar a conta.' }
  }
}

export async function deleteAccountAction(raw: unknown): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    const parsed = z.object({
      userId: z.string().trim().min(1).max(255),
      confirmationEmail: z.string().trim().email().max(255),
      confirmed: z.literal(true),
    }).safeParse(raw)
    if (!parsed.success) return { ok: false, error: 'Confirme a exclusão digitando o e-mail exato da conta.' }

    const snapshot = await getAccountDeletionSnapshot(parsed.data.userId)
    if (!snapshot) return { ok: false, error: 'Conta não encontrada.' }
    if (snapshot.userId === admin.id) return { ok: false, error: 'Você não pode excluir a própria conta.' }
    if (snapshot.role === 'admin') return { ok: false, error: 'Contas de administrador não podem ser excluídas por este fluxo.' }
    if (!snapshot.storeId || snapshot.storeStatus !== 'blocked') return { ok: false, error: 'Só é possível excluir contas quando a loja está bloqueada.' }
    if (snapshot.email.trim().toLowerCase() !== parsed.data.confirmationEmail.trim().toLowerCase()) {
      return { ok: false, error: 'O e-mail digitado não corresponde à conta selecionada.' }
    }
    if (snapshot.checkoutStartedAt && !snapshot.preapprovalId && !snapshot.paymentId) {
      return { ok: false, error: 'Há um pagamento sendo iniciado. Aguarde a confirmação antes de excluir a conta.' }
    }

    const terminalPreapprovalStatuses = ['cancelled', 'canceled', 'rejected', 'expired']
    const needsPreapprovalCancellation = Boolean(snapshot.preapprovalId && !terminalPreapprovalStatuses.includes(snapshot.paymentStatus ?? ''))
    const needsPendingPaymentResolution = Boolean(snapshot.paymentId && ['pending', 'in_process', 'processing'].includes(snapshot.paymentStatus ?? ''))
    let cancelledPreapprovalId: string | null = null
    let resolvedPaymentId: string | null = null

    if (needsPreapprovalCancellation || needsPendingPaymentResolution) {
      const credentials = await getMercadoPagoCredentialsForServer()
      if (!credentials?.accessToken) return { ok: false, error: 'Não foi possível validar as cobranças no Mercado Pago. A conta não foi excluída.' }

      if (needsPreapprovalCancellation && snapshot.preapprovalId) {
        const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(snapshot.preapprovalId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ status: 'cancelled' }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        })
        if (!response.ok) return { ok: false, error: 'Não foi possível cancelar a renovação no Mercado Pago. A conta não foi excluída.' }
        const cancellation = await response.json() as { status?: string }
        if (cancellation.status !== 'cancelled') return { ok: false, error: 'O Mercado Pago não confirmou o cancelamento. A conta não foi excluída.' }
        cancelledPreapprovalId = snapshot.preapprovalId
      }

      if (needsPendingPaymentResolution && snapshot.paymentId) {
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(snapshot.paymentId)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ status: 'canceled' }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000),
        })
        if (!response.ok) return { ok: false, error: 'Não foi possível encerrar o pagamento pendente no Mercado Pago. A conta não foi excluída.' }
        const paymentResolution = await response.json() as { status?: string }
        if (!['canceled', 'cancelled', 'rejected', 'approved', 'expired'].includes(paymentResolution.status ?? '')) {
          return { ok: false, error: 'O Mercado Pago não confirmou o encerramento do pagamento pendente. A conta não foi excluída.' }
        }
        resolvedPaymentId = snapshot.paymentId
      }
    }

    const result = await deleteAccountPermanently({
      userId: parsed.data.userId,
      adminUserId: admin.id,
      confirmationEmail: parsed.data.confirmationEmail,
      cancelledPreapprovalId,
      resolvedPaymentId,
    })
    if (result.status === 'not_found') return { ok: false, error: 'Conta não encontrada.' }
    if (result.status === 'self') return { ok: false, error: 'Você não pode excluir a própria conta.' }
    if (result.status === 'admin') return { ok: false, error: 'Contas de administrador não podem ser excluídas por este fluxo.' }
    if (result.status === 'store_not_blocked') return { ok: false, error: 'Só é possível excluir contas quando a loja está bloqueada.' }
    if (result.status === 'email_mismatch') return { ok: false, error: 'O e-mail digitado não corresponde à conta selecionada.' }
    if (result.status === 'billing_cancellation_required') return { ok: false, error: 'A cobrança mudou durante a exclusão. Revise a assinatura e tente novamente.' }
    if (result.status === 'checkout_processing') return { ok: false, error: 'Há um checkout em processamento. Aguarde a confirmação antes de excluir a conta.' }

    const ownedAssets = result.storeId
      ? result.assetUrls.filter((url) => {
          try {
            const hostname = new URL(url).hostname
            return hostname.endsWith('.public.blob.vercel-storage.com') && isAssetOwnedByStore(url, result.storeId!)
          } catch {
            return false
          }
        })
      : []
    let cleanupFailures = 0
    if (ownedAssets.length > 0) {
      if (!storage.isConfigured()) {
        cleanupFailures = ownedAssets.length
      } else {
        const cleanupResults = await Promise.allSettled(ownedAssets.map((url) => storage.remove(url)))
        cleanupFailures = cleanupResults.filter((cleanup) => cleanup.status === 'rejected').length
      }
    }

    if (cleanupFailures > 0) {
      try {
        await recordAdminAction({
          adminUserId: admin.id,
          action: 'delete_account_media_cleanup_failed',
          details: { deletedUserId: result.userId, failedAssetCount: cleanupFailures },
        })
      } catch (auditError) {
        console.error('[admin] deleteAccountMediaAudit', auditError)
      }
    }

    try {
      revalidatePath('/admin', 'layout')
      revalidatePath('/admin/usuarios')
    } catch (revalidationError) {
      console.error('[admin] deleteAccountRevalidation', revalidationError)
    }
    return {
      ok: true,
      message: cleanupFailures > 0
        ? `Conta excluída. ${cleanupFailures} arquivo(s) de mídia precisam de revisão no log de auditoria.`
        : 'Conta e dados relacionados excluídos permanentemente.',
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] deleteAccount', error)
    return { ok: false, error: 'Não foi possível concluir a exclusão. Os dados locais permanecem; confira o status de cobrança no Mercado Pago antes de tentar novamente.' }
  }
}

export async function updatePlanAction(raw: unknown): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    const parsed = planUpdateSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: 'Revise os campos', fieldErrors: zodFieldErrors(parsed.error) }
    }
    const { planId, ...parsedData } = parsed.data
    const existingPlan = (await listPlans()).find((plan) => plan.id === planId)
    if (!existingPlan) return { ok: false, error: 'Plano não encontrado' }
    if (existingPlan.slug === 'trial-default' && parsedData.trialDays < 1) {
      return { ok: false, error: 'Informe ao menos 1 dia de degustação', fieldErrors: { trialDays: ['Informe ao menos 1 dia'] } }
    }
    if (existingPlan.slug !== 'trial-default' && parsedData.monthlyPrice <= 0) {
      return { ok: false, error: 'Informe um preço mensal maior que zero para o plano Pro.', fieldErrors: { monthlyPrice: ['Informe um preço mensal maior que zero'] } }
    }
    const data = {
      ...parsedData,
      price: parsedData.monthlyPrice.toFixed(2),
      monthlyPrice: parsedData.monthlyPrice.toFixed(2),
      semiannualPrice: parsedData.semiannualPrice?.toFixed(2) ?? null,
      annualPrice: parsedData.annualPrice?.toFixed(2) ?? null,
      billingPeriod: 'monthly' as const,
    }
    await updatePlan(planId, data)
    await recordAdminAction({
      adminUserId: admin.id,
      action: 'update_plan',
      details: {
        planId,
        productLimit: data.productLimit,
        trialDays: data.trialDays,
        monthlyPrice: data.monthlyPrice,
        semiannualPrice: data.semiannualPrice,
        annualPrice: data.annualPrice,
        isActive: data.isActive,
      },
    })
    revalidatePath('/admin', 'layout')
    revalidatePath('/painel/plano')
    return { ok: true, message: 'Plano atualizado' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] updatePlan', error)
    return { ok: false, error: 'Não foi possível atualizar o plano.' }
  }
}

export async function saveMercadoPagoSettingsAction(raw: unknown): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    const parsed = mercadoPagoSettingsSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, error: 'Revise as configurações', fieldErrors: zodFieldErrors(parsed.error) }

    const current = await getMercadoPagoSettingsForAdmin()
    const changingEnvironment = current.environment !== parsed.data.environment
    if (changingEnvironment && current.publicKey && current.publicKey === parsed.data.publicKey) {
      return { ok: false, error: 'Atualize a Public Key com a credencial do novo ambiente antes de trocar.' }
    }
    if (changingEnvironment && current.hasAccessToken && !parsed.data.accessToken && !parsed.data.clearAccessToken) {
      return { ok: false, error: 'Informe o Access Token do novo ambiente ou remova o token salvo antes de trocar.' }
    }
    if (changingEnvironment && current.hasWebhookSecret && !parsed.data.webhookSecret && !parsed.data.clearWebhookSecret) {
      return { ok: false, error: 'Informe o segredo de webhook do novo ambiente ou remova o segredo salvo antes de trocar.' }
    }

    await saveMercadoPagoSettings({ ...parsed.data, updatedBy: admin.id })
    await recordAdminAction({
      adminUserId: admin.id,
      action: 'update_mercadopago_settings',
      details: {
        environment: parsed.data.environment,
        publicKeyConfigured: Boolean(parsed.data.publicKey),
        accessTokenUpdated: Boolean(parsed.data.accessToken),
        webhookSecretUpdated: Boolean(parsed.data.webhookSecret),
      },
    })
    revalidatePath('/admin/configuracoes/mercado-pago')
    return { ok: true, message: 'Configurações do Mercado Pago salvas com segurança.' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] saveMercadoPagoSettings', error)
    return { ok: false, error: 'Não foi possível salvar as configurações do Mercado Pago.' }
  }
}

export async function testMercadoPagoConnectionAction(): Promise<ActionResult<{ nickname: string | null }>> {
  try {
    const admin = await getAdminOrThrow()
    const credentials = await getMercadoPagoCredentialsForServer()
    if (!credentials?.accessToken) return { ok: false, error: 'Salve um Access Token antes de testar.' }

    let response: Response
    try {
      response = await fetch('https://api.mercadopago.com/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${credentials.accessToken}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
    } catch {
      return { ok: false, error: 'Não foi possível conectar ao Mercado Pago. Tente novamente.' }
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: 'O Mercado Pago recusou o Access Token. Confira as credenciais e o ambiente selecionado.' }
    }
    if (!response.ok) {
      return { ok: false, error: response.status === 429 ? 'Limite de testes atingido. Aguarde e tente novamente.' : 'O Mercado Pago não conseguiu validar o Access Token agora.' }
    }

    const profile = await response.json() as { nickname?: unknown }
    const nickname = typeof profile.nickname === 'string' ? profile.nickname : null
    await recordAdminAction({ adminUserId: admin.id, action: 'test_mercadopago_connection', details: { environment: credentials.environment, success: true } })
    const environmentLabel = credentials.environment === 'test' ? 'de teste' : 'de produção'
    return { ok: true, message: nickname ? `Access Token ${environmentLabel} válido. Conectado como ${nickname}.` : `Access Token ${environmentLabel} válido. O Mercado Pago respondeu com sucesso.`, data: { nickname } }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: FORBIDDEN }
    console.error('[admin] testMercadoPagoConnection', error)
    return { ok: false, error: 'Não foi possível testar a integração do Mercado Pago.' }
  }
}
