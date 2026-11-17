'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminOrThrow, UnauthorizedError } from '@/lib/session'
import { getStoreById, getUserById, recordAdminAction, setUserStatus } from '@/lib/repositories/admin'
import { listPlans, setStorePlan, updatePlan } from '@/lib/repositories/plans'
import { getMercadoPagoCredentialsForServer, getMercadoPagoSettingsForAdmin, saveMercadoPagoSettings } from '@/lib/repositories/payment-settings'
import { mercadoPagoSettingsSchema, planUpdateSchema, zodFieldErrors, type ActionResult } from '@/lib/validators'

const FORBIDDEN = 'Você não tem permissão para esta ação.'

export async function changeStorePlanAction(storeId: string, planId: string): Promise<ActionResult> {
  try {
    const admin = await getAdminOrThrow()
    if (!z.uuid().safeParse(storeId).success || !z.uuid().safeParse(planId).success) {
      return { ok: false, error: 'Dados inválidos' }
    }
    const store = await getStoreById(storeId)
    const plan = (await listPlans({ onlyActive: true })).find((p) => p.id === planId)
    if (!store || !plan) return { ok: false, error: 'Loja ou plano não encontrado' }

    await setStorePlan(storeId, planId)
    await recordAdminAction({
      adminUserId: admin.id,
      action: 'change_plan',
      targetStoreId: storeId,
      details: { plan: plan.slug },
    })
    revalidatePath('/admin', 'layout')
    return { ok: true, message: `Plano alterado para ${plan.name}` }
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
    const data = { ...parsedData, price: parsedData.price.toFixed(2) }
    await updatePlan(planId, data)
    await recordAdminAction({
      adminUserId: admin.id,
      action: 'update_plan',
      details: { planId, productLimit: data.productLimit, trialDays: data.trialDays, price: data.price, billingPeriod: data.billingPeriod, isActive: data.isActive },
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
