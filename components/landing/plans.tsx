import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { getPlanPrice, type Plan } from '@/lib/repositories/plans'
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

export function Plans({ plans }: { plans: Plan[] }) {
  return (
    <section id="planos" className="scroll-mt-20 bg-muted/60 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-brand-text">Planos</p>
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
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold">7 dias grátis</span>
              </header>

              <p className="font-display text-5xl font-semibold">
                {plan.productLimit}
                <span className="ml-2 font-sans text-base font-normal text-muted-foreground">produtos</span>
              </p>

              <ul aria-label="Valores do Plano Pro por período" className="grid grid-cols-3 gap-2">
                {[
                  { period: 'monthly', label: 'Mensal', suffix: '/mês' },
                  { period: 'semiannual', label: 'Semestral', suffix: '/semestre' },
                  { period: 'yearly', label: 'Anual', suffix: '/ano' },
                ].map((item) => {
                  const price = getPlanPrice(plan, item.period as 'monthly' | 'semiannual' | 'yearly')
                  return (
                    <li key={item.period} className="flex min-w-0 flex-col gap-1 rounded-2xl bg-muted p-3">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <strong className="text-xs font-semibold sm:text-sm">{price && price > 0 ? formatBRL(price) : 'A definir'}</strong>
                      <span className="text-xs text-muted-foreground">{price && price > 0 ? item.suffix : 'Indisponível'}</span>
                    </li>
                  )
                })}
              </ul>

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
                <Link href="/cadastro" className={cn(buttonVariants({ size: 'lg' }))}>Começar 7 dias grátis</Link>
                <p className="text-center text-xs text-muted-foreground">Após o teste, escolha a periodicidade e pague por cartão ou Pix. A renovação automática é opcional.</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
