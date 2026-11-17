import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, Clock3, Package } from 'lucide-react'
import { PageHeader } from '@/components/panel/page-header'
import { MercadoPagoTransparentCheckout } from '@/components/panel/mercadopago-transparent-checkout'
import { CancelMercadoPagoSubscriptionButton } from '@/components/panel/cancel-mercadopago-subscription-button'
import { formatBRL } from '@/lib/format'
import { getMercadoPagoSettingsForAdmin } from '@/lib/repositories/payment-settings'
import { getPlanPeriodPrices, getPlanPrice, listPlans } from '@/lib/repositories/plans'
import { requireSellerContext } from '@/lib/session'
import { getPlanUsage } from '@/lib/services/plan-usage'

export const metadata: Metadata = { title: 'Contratação do plano' }

const features = [
  'Vitrine pública com link compartilhável',
  'Cadastro de produtos, categorias e opções',
  'Galeria de imagens e personalização de cores',
  'Controle de estoque, ofertas, REF e SKU',
  'Carrinho e pedidos pelo WhatsApp',
  'Painel completo de gerenciamento',
]

const billingPeriodLabels = {
  monthly: 'mês',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  yearly: 'ano',
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}

export default async function PlanPage() {
  const { user, store } = await requireSellerContext({ allowExpiredPlan: true })
  const [usage, paymentSettings, plans] = await Promise.all([
    getPlanUsage(store.id),
    getMercadoPagoSettingsForAdmin(),
    listPlans(),
  ])
  const contractPlan = plans.find((plan) => plan.slug === 'business' && plan.isActive) ?? plans.find((plan) => plan.isActive && plan.slug !== 'trial-default') ?? null
  const trialDurationDays = plans.find((plan) => plan.slug === 'trial-default')?.trialDays ?? 7
  const trialEnd = usage.subscription?.expiresAt ?? null
  const periodOptions = contractPlan ? getPlanPeriodPrices(contractPlan) : []
  const defaultPeriod = periodOptions[0]?.period ?? 'monthly'
  const planPrice = contractPlan ? getPlanPrice(contractPlan, 'monthly') ?? periodOptions[0]?.amount ?? 0 : 0
  const checkoutConfigured = Boolean(paymentSettings.publicKey && paymentSettings.hasAccessToken && paymentSettings.hasWebhookSecret)
  const environmentSafe = paymentSettings.environment === 'production' ? process.env.VERCEL_ENV === 'production' : process.env.VERCEL_ENV !== 'production'
  const canStartContract = usage.subscriptionExpired || usage.isTrial
  const checkoutAvailable = canStartContract && periodOptions.length > 0 && checkoutConfigured && environmentSafe
  const checkoutUnavailableMessage = periodOptions.length === 0
    ? 'Configure ao menos um preço no plano Pro para liberar o checkout.'
    : !environmentSafe
      ? paymentSettings.environment === 'test' ? 'Credenciais de teste não podem processar cobranças em produção.' : 'Credenciais de produção só podem ser usadas no ambiente de produção.'
      : !paymentSettings.hasWebhookSecret
        ? 'Configure o segredo do webhook do Mercado Pago no painel administrativo para liberar o checkout com confirmação segura.'
        : 'O checkout do Mercado Pago ainda não está configurado.'
  const nextPaymentAt = usage.subscription?.mercadoPagoNextPaymentAt ?? null
  const pixPaymentExpired = Boolean(usage.subscription?.mercadoPagoPaymentMethod === 'pix' && usage.subscription.mercadoPagoPixExpiresAt && usage.subscription.mercadoPagoPixExpiresAt.getTime() <= Date.now() && ['pending', 'in_process'].includes(usage.subscription.mercadoPagoStatus ?? ''))
  const paymentPending = Boolean(usage.subscription?.mercadoPagoCheckoutStartedAt || usage.subscription?.mercadoPagoStatus === 'processing' || (['pending', 'in_process'].includes(usage.subscription?.mercadoPagoStatus ?? '') && !pixPaymentExpired))
  const storedPeriod = usage.subscription?.mercadoPagoBillingPeriod
  const selectedPeriod = paymentPending && storedPeriod && ['monthly', 'semiannual', 'yearly'].includes(storedPeriod) ? storedPeriod as 'monthly' | 'semiannual' | 'yearly' : defaultPeriod
  const selectedAmount = paymentPending && usage.subscription?.mercadoPagoAmount
    ? Number(usage.subscription.mercadoPagoAmount)
    : periodOptions.find((option) => option.period === selectedPeriod)?.amount ?? planPrice
  const checkoutInitialProps = {
    amount: selectedAmount,
    billingPeriod: selectedPeriod,
    periodOptions,
    initialPaymentMethod: paymentPending || pixPaymentExpired ? usage.subscription?.mercadoPagoPaymentMethod ?? 'card' : 'card',
    initialCheckoutMode: paymentPending && usage.subscription?.mercadoPagoCheckoutMode === 'recurring' ? 'recurring' : 'one_time',
    initialPixQrCode: usage.subscription?.mercadoPagoPixQrCode ?? null,
    initialPixQrCodeBase64: usage.subscription?.mercadoPagoPixQrCodeBase64 ?? null,
    initialPixExpiresAt: usage.subscription?.mercadoPagoPixExpiresAt?.toISOString() ?? null,
    initialPixExpired: pixPaymentExpired,
    trialEndsAt: usage.isTrial && !usage.subscriptionExpired ? trialEnd?.toISOString() ?? null : null,
  } as const
  const pageTitle = usage.subscriptionExpired ? 'Contratar plano' : 'Meu plano'
  const unavailableDescription = usage.isTrial
    ? 'Seu período de teste terminou. Contrate o plano para reativar o painel.'
    : 'Sua assinatura está suspensa. Regularize o plano para voltar a gerenciar a loja.'

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={usage.subscriptionExpired ? unavailableDescription : usage.isTrial ? `Seu período de degustação libera todos os recursos do plano Pro por ${trialDurationDays} dias.` : 'Acompanhe sua assinatura, o limite de produtos e a próxima renovação.'}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <section className="flex flex-col gap-5 rounded-3xl bg-tile p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plano atual</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{usage.plan?.name ?? 'Degustação'}</h2>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${usage.subscriptionExpired ? 'bg-destructive/10 text-destructive' : 'bg-background text-foreground'}`}>
                {usage.subscriptionExpired ? usage.isTrial ? 'Teste encerrado' : 'Assinatura suspensa' : usage.isTrial ? 'Teste grátis' : usage.subscription?.mercadoPagoStatus === 'cancelled' ? 'Renovação cancelada' : 'Ativo'}
              </span>
              {usage.isTrial && !usage.subscriptionExpired && <Link href="#contratar" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Seja Pro</Link>}
            </div>
          </div>

          {usage.isTrial && !usage.subscriptionExpired && trialEnd ? (
            <div className="flex items-center gap-3 rounded-2xl bg-background p-4">
              <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-semibold">{usage.daysRemaining} {usage.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}</span>
                <span className="block text-muted-foreground">Acesso completo até {formatDate(trialEnd)}.</span>
              </p>
            </div>
          ) : usage.subscriptionExpired ? (
            <div className="rounded-2xl bg-background p-4 text-sm leading-relaxed text-muted-foreground">
              O painel está bloqueado, mas seus dados e sua vitrine permanecem salvos. {usage.isTrial ? 'Conclua a contratação para voltar a gerenciar a loja.' : 'Regularize a assinatura para voltar a gerenciar a loja.'}
            </div>
          ) : usage.subscription?.mercadoPagoStatus === 'cancelled' && trialEnd ? (
            <div className="rounded-2xl bg-background p-4 text-sm leading-relaxed text-muted-foreground">
              Renovação cancelada. Seu acesso continua até {formatDate(trialEnd)}.
            </div>
          ) : nextPaymentAt && usage.daysUntilRenewal !== null ? (
            <div className="flex items-center gap-3 rounded-2xl bg-background p-4">
              <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-semibold">Renovação em {usage.daysUntilRenewal} {usage.daysUntilRenewal === 1 ? 'dia' : 'dias'}</span>
                <span className="block text-muted-foreground">Próxima cobrança prevista para {formatDate(nextPaymentAt)}.</span>
              </p>
            </div>
          ) : usage.subscription?.mercadoPagoCheckoutMode === 'one_time' && trialEnd ? (
            <div className="flex items-center gap-3 rounded-2xl bg-background p-4">
              <Clock3 className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm">
                <span className="font-semibold">Plano válido por {usage.daysRemaining ?? 0} {usage.daysRemaining === 1 ? 'dia' : 'dias'}</span>
                <span className="block text-muted-foreground">Acesso até {formatDate(trialEnd)}. Não há renovação automática.</span>
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-background p-4 text-sm">
              <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
              Assinatura ativa
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-background p-4">
            <Package className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm"><span className="font-semibold">Até {usage.limit} produtos</span><span className="block text-muted-foreground">{usage.used} cadastrados atualmente</span></p>
          </div>
          <div className="rounded-2xl bg-background p-4 text-sm">
            <span className="font-semibold">Valor do plano: </span>
            {periodOptions.length > 0
              ? usage.isTrial
                ? `A partir de ${formatBRL(planPrice)} / ${billingPeriodLabels[defaultPeriod]}`
                : `${formatBRL(Number(usage.subscription?.mercadoPagoAmount ?? planPrice))} / ${billingPeriodLabels[usage.subscription?.mercadoPagoBillingPeriod ?? defaultPeriod]}`
              : 'A definir'}
          </div>
          {usage.subscription?.mercadoPagoStatus === 'authorized' && <CancelMercadoPagoSubscriptionButton />}
        </section>

        <section id="contratar" className="flex scroll-mt-24 flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold">Plano Pro</h2>
            <p className="mt-1 text-sm text-muted-foreground">Todos os recursos para administrar e divulgar sua loja, com {trialDurationDays} dias grátis na criação da conta. A contratação antecipada é opcional.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
          </ul>
          <div className="border-t border-border pt-5">
            {paymentPending ? (
              <MercadoPagoTransparentCheckout
                {...checkoutInitialProps}
                initiallyAwaiting
                publicKey={paymentSettings.publicKey}
                planName={contractPlan?.name ?? 'Pro'}
                payerEmail={user.email}
                identificationType={user.documentType}
                identificationNumber={user.documentNumber}
              />
            ) : checkoutAvailable ? (
              <MercadoPagoTransparentCheckout
                {...checkoutInitialProps}
                publicKey={paymentSettings.publicKey}
                planName={contractPlan!.name}
                payerEmail={user.email}
                identificationType={user.documentType}
                identificationNumber={user.documentNumber}
              />
            ) : !usage.subscriptionExpired && !usage.isTrial ? (
              <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">Sua assinatura Pro está ativa. Veja acima a data prevista para a próxima renovação.</p>
            ) : !usage.subscriptionExpired ? (
              <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">{checkoutUnavailableMessage}</p>
            ) : (
              <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">{checkoutUnavailableMessage}</p>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
