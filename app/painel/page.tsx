import Link from 'next/link'
import { Clock3, ExternalLink, PackagePlus, UserPen } from 'lucide-react'
import { CopyLinkButton } from '@/components/panel/copy-link-button'
import { PageHeader } from '@/components/panel/page-header'
import { UsageBar } from '@/components/panel/usage-bar'
import { requireSellerContext } from '@/lib/session'
import { getPlanUsage } from '@/lib/services/plan-usage'
import { getBaseUrl } from '@/lib/url'

export default async function DashboardPage() {
  const { store } = await requireSellerContext()
  const [usage, baseUrl] = await Promise.all([getPlanUsage(store.id), getBaseUrl()])
  const publicUrl = `${baseUrl}/${store.slug}`
  const nextPaymentAt = usage.subscription?.mercadoPagoNextPaymentAt ?? null
  const renewalDateLabel = nextPaymentAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(nextPaymentAt)
    : null

  return (
    <>
      <PageHeader title={store.name} description="Resumo da sua loja e atalhos para o que você faz com mais frequência." />

      <section aria-labelledby="link-title" className="mb-4 rounded-[2rem] bg-primary p-6 text-primary-foreground sm:p-8">
        <h2 id="link-title" className="text-sm font-medium text-primary-foreground/70">
          Endereço da sua vitrine
        </h2>
        <p className="mt-2 font-display text-2xl font-semibold break-all sm:text-3xl">{publicUrl.replace(/^https?:\/\//, '')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <CopyLinkButton url={publicUrl} />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="plan-title" className="flex flex-col gap-5 rounded-[2rem] bg-tile p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 id="plan-title" className="text-xl font-semibold">
              {usage.plan?.name ?? 'Pro'}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-3">
              {usage.isTrial && <Link href="/painel/plano#contratar" className="rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Seja Pro</Link>}
              <Link href="/painel/plano" className="text-sm underline-offset-4 hover:underline">
                Detalhes
              </Link>
            </div>
          </div>
          <div>
            <p className="font-display text-5xl font-semibold">
              {usage.used}
              <span className="ml-1 text-2xl font-normal text-muted-foreground">/ {usage.limit}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">produtos cadastrados</p>
          </div>
          <UsageBar used={usage.used} limit={usage.limit} percent={usage.percent} />
          {usage.isTrial && usage.daysRemaining !== null && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" aria-hidden="true" />Teste grátis: {usage.daysRemaining} {usage.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}</p>
          )}
          {!usage.isTrial && usage.daysUntilRenewal !== null && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" aria-hidden="true" />Renovação em {usage.daysUntilRenewal} {usage.daysUntilRenewal === 1 ? 'dia' : 'dias'}{renewalDateLabel ? ` · ${renewalDateLabel}` : ''}</p>
          )}
          {!usage.isTrial && usage.subscription?.mercadoPagoCheckoutMode === 'one_time' && usage.daysRemaining !== null && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" aria-hidden="true" />Plano válido por mais {usage.daysRemaining} {usage.daysRemaining === 1 ? 'dia' : 'dias'}</p>
          )}
          <p className="text-sm">
            {usage.isFull
              ? 'Limite atingido. Exclua um produto para liberar espaço no plano.'
              : `${usage.remaining} ${usage.remaining === 1 ? 'vaga restante' : 'vagas restantes'}`}
          </p>
        </section>

        <section aria-labelledby="shortcuts-title" className="flex flex-col gap-3 rounded-[2rem] bg-muted p-6 sm:p-8">
          <h2 id="shortcuts-title" className="mb-2 text-xl font-semibold">
            Atalhos
          </h2>
          <Link
            href="/painel/produtos/novo"
            className="flex items-center gap-4 rounded-[10px] bg-background px-5 py-4 transition-colors hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PackagePlus className="size-4" aria-hidden="true" />
            </span>
            <span className="font-medium">Cadastrar produto</span>
          </Link>
          <Link
            href="/painel/perfil"
            className="flex items-center gap-4 rounded-[10px] bg-background px-5 py-4 transition-colors hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserPen className="size-4" aria-hidden="true" />
            </span>
            <span className="font-medium">Editar perfil</span>
          </Link>
          <Link
            href="/painel/vitrine"
            className="flex items-center gap-4 rounded-[10px] bg-background px-5 py-4 transition-colors hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ExternalLink className="size-4" aria-hidden="true" />
            </span>
            <span className="font-medium">Personalizar vitrine</span>
          </Link>
        </section>
      </div>
    </>
  )
}
