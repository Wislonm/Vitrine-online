import type { Metadata } from 'next'
import { Check, Clock3, CreditCard, Package } from 'lucide-react'
import { PageHeader } from '@/components/panel/page-header'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
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
  const { store } = await requireSellerContext({ allowExpiredPlan: true })
  const usage = await getPlanUsage(store.id)
  const trialEnd = usage.subscription?.expiresAt ?? null
  const pageTitle = usage.subscriptionExpired ? 'Contratar plano' : 'Meu plano'

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={usage.subscriptionExpired ? 'Seu período de teste terminou. Contrate o plano para reativar o painel.' : 'Seu teste grátis libera todos os recursos do painel por 30 dias.'}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <section className="flex flex-col gap-5 rounded-3xl bg-tile p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Plano único</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{usage.plan?.name ?? 'Plano único'}</h2>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${usage.subscriptionExpired ? 'bg-destructive/10 text-destructive' : 'bg-background text-foreground'}`}>
              {usage.subscriptionExpired ? 'Teste encerrado' : usage.isTrial ? 'Teste grátis' : 'Ativo'}
            </span>
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
              O painel está bloqueado, mas seus dados e sua vitrine permanecem salvos. Conclua a contratação para voltar a gerenciar a loja.
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
            {usage.plan && Number(usage.plan.price) > 0 ? `${formatBRL(Number(usage.plan.price))} / ${billingPeriodLabels[usage.plan.billingPeriod]}` : 'A definir'}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-8">
          <div>
            <h2 className="font-display text-xl font-semibold">Plano completo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Um único plano com todos os recursos para administrar e divulgar sua loja.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{feature}</span></li>)}
          </ul>
          <div className="border-t border-border pt-5">
            <Button type="button" size="lg" disabled className="w-full sm:w-auto">
              <CreditCard aria-hidden="true" />
              Contratação online em breve
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">A integração de pagamento está sendo preparada. Nenhuma cobrança é feita durante os 30 dias grátis.</p>
          </div>
        </section>
      </div>
    </>
  )
}
