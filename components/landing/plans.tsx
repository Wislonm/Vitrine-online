import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { Plan } from '@/lib/repositories/plans'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

const featureRows: { key: keyof NonNullable<Plan['features']>; label: string }[] = [
  { key: 'public_storefront', label: 'Vitrine pública com link próprio' },
  { key: 'seller_panel', label: 'Painel de gerenciamento da loja' },
  { key: 'categories', label: 'Categorias e filtros de produtos' },
  { key: 'side_cart', label: 'Carrinho e lista de desejos' },
  { key: 'whatsapp_orders', label: 'Pedidos enviados pelo WhatsApp' },
  { key: 'hero_customization', label: 'Personalização da vitrine e paleta de cores' },
]

const includedFeatures = [
  'Cadastro de produtos com oferta, REF e SKU',
  'Até 3 opções por produto e galeria de imagens',
  'Controle de estoque e disponibilidade',
  'Busca, paginação e organização do catálogo',
]

const billingPeriodLabels = {
  monthly: 'mês',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  yearly: 'ano',
}

export function Plans({ plans }: { plans: Plan[] }) {
  return (
    <section id="planos" className="scroll-mt-20 bg-muted/60 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-sage">Planos</p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">Comece grátis, cresça quando precisar.</h2>
        </div>

        <div className="grid max-w-2xl gap-4">
          {plans.slice(0, 1).map((plan) => (
            <article key={plan.id} className="flex flex-col gap-6 rounded-[2rem] bg-card p-6 sm:p-8">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">30 dias grátis</span>
              </header>

              <p className="font-display text-5xl font-semibold">
                {plan.productLimit}
                <span className="ml-2 font-sans text-base font-normal text-muted-foreground">produtos</span>
              </p>

              <p className="flex items-baseline gap-2">
                {Number(plan.price) > 0 ? (
                  <>
                    <span className="font-display text-2xl font-semibold">{formatBRL(Number(plan.price))}</span>
                    <span className="text-sm text-muted-foreground">/{billingPeriodLabels[plan.billingPeriod]}</span>
                  </>
                ) : <span className="text-sm text-muted-foreground">Valor a definir</span>}
              </p>

              <ul className="flex flex-col gap-3 text-sm">
                {featureRows.map((row) => {
                  const included = Boolean(plan.features?.[row.key])
                  return (
                    <li key={row.key} className={cn('flex items-center gap-3', !included && 'text-muted-foreground')}>
                      {included ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <Minus className="size-4 shrink-0" aria-hidden="true" />}
                      {row.label}
                    </li>
                  )
                })}
                {includedFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3"><Check className="size-4 shrink-0" aria-hidden="true" />{feature}</li>
                ))}
              </ul>

              <div className="mt-auto flex flex-col gap-3">
                <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }))}>Começar 30 dias grátis</Link>
                <p className="text-center text-xs text-muted-foreground">Acesso completo durante o teste, sem cobrança automática. Checkout Mercado Pago em preparação.</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
