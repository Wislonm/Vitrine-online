import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getPlanPeriodPrices, type Plan } from '@/lib/repositories/plans'
import { formatBRL, formatTrialDays } from '@/lib/format'
import { cn } from '@/lib/utils'

const featureRows: { key: keyof NonNullable<Plan['features']>; label: string }[] = [
  { key: 'public_storefront', label: 'Vitrine pública com link próprio' },
  { key: 'seller_panel', label: 'Painel de gerenciamento da loja' },
  { key: 'categories', label: 'Categorias e filtros de produtos' },
  { key: 'side_cart', label: 'Carrinho e lista de desejos' },
  { key: 'whatsapp_orders', label: 'Pedidos enviados pelo WhatsApp' },
  { key: 'hero_customization', label: 'Personalização da vitrine e paleta de cores' },
  { key: 'custom_domain', label: 'Domínio personalizado' },
]

const includedFeatures = [
  'Até 3 opções por produto e galeria de imagens',
  'Controle de estoque e disponibilidade',
  'Busca, paginação e organização do catálogo',
]

const proOnlyFeatures = ['Cadastro de produtos com oferta, REF e SKU']

const billingPeriodLabels = {
  monthly: { label: 'Mensal', suffix: '/mês' },
  semiannual: { label: 'Semestral', suffix: '/semestre' },
  yearly: { label: 'Anual', suffix: '/ano' },
} as const

function PlanCard({ plan, trialDays }: { plan: Plan; trialDays: number }) {
  const isTrial = plan.slug === 'trial-default'
  const periodPrices = getPlanPeriodPrices(plan)
  const trialPeriod = `${trialDays} ${trialDays === 1 ? 'dia' : 'dias'}`

  return (
    <article className="flex min-w-0 flex-col gap-6 rounded-[2rem] bg-card p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="text-2xl font-semibold">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
        {isTrial && <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">{formatTrialDays(plan.trialDays)}</span>}
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="font-display text-5xl font-semibold">
          {plan.productLimit}
          <span className="ml-2 font-sans text-base font-normal text-muted-foreground">produtos</span>
        </p>
        {isTrial && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Durante o teste</span>
            <strong className="font-display text-2xl font-semibold">Grátis</strong>
          </div>
        )}
      </div>

      {periodPrices.length > 0 ? (
        <ul aria-label={`Valores do ${plan.name} por período`} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {periodPrices.map(({ period, amount }) => {
            const item = billingPeriodLabels[period]
            return (
              <li key={period} className="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted p-4">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <strong className="text-xs font-semibold sm:text-sm">{formatBRL(amount)}</strong>
                <span className="text-xs text-muted-foreground">{item.suffix}</span>
              </li>
            )
          })}
        </ul>
      ) : !isTrial ? (
        <p className="rounded-2xl bg-muted p-4 font-medium">Grátis</p>
      ) : null}

      <ul className="grid gap-3 text-sm sm:grid-cols-2">
        {featureRows.map((row) => {
          const included = Boolean(plan.features?.[row.key])
          return (
            <li key={row.key} className={cn('flex items-start gap-3', !included && 'text-muted-foreground')}>
              {included ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Minus className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
              <span>{row.label}</span>
            </li>
          )
        })}
        {includedFeatures.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
        {plan.slug === 'business' && proOnlyFeatures.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3">
        <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }))}>
          {isTrial ? 'Criar vitrine grátis' : `Começar pelo teste de ${trialPeriod}`}
        </Link>
        <p className="text-center text-xs text-muted-foreground">
          {isTrial
            ? 'Sem cartão e sem cobrança durante o teste.'
            : 'Após o teste, escolha a periodicidade e pague por cartão ou Pix. A renovação automática é opcional.'}
        </p>
      </div>
    </article>
  )
}

export function Plans({ plans, trialDays }: { plans: Plan[]; trialDays: number }) {
  return (
    <section id="planos" className="scroll-mt-20 bg-muted/60 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-sage">Planos</p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">Comece grátis, cresça quando precisar.</h2>
        </div>

        <div className="grid max-w-6xl gap-4 lg:grid-cols-2">
          {plans.map((plan) => <PlanCard key={plan.id} plan={plan} trialDays={trialDays} />)}
        </div>
      </div>
    </section>
  )
}
