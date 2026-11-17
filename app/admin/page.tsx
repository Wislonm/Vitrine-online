import { formatDate } from '@/lib/format'
import { getAdminStats, listRecentAdminActions } from '@/lib/repositories/admin'

const actionLabels: Record<string, string> = {
  change_plan: 'Alterou o plano de uma loja',
  block_account: 'Bloqueou uma conta',
  unblock_account: 'Desbloqueou uma conta',
  update_plan: 'Editou um plano',
}

export default async function AdminDashboardPage() {
  const [stats, actions] = await Promise.all([getAdminStats(), listRecentAdminActions()])

  const cards = [
    { label: 'Usuários', value: stats.users },
    { label: 'Lojas', value: stats.stores },
    { label: 'Contas no plano legado', value: stats.free },
    { label: 'Contas em degustação', value: stats.trial },
    { label: 'Assinantes Pro', value: stats.pro },
    { label: 'Contas bloqueadas', value: stats.blocked },
    { label: 'Produtos cadastrados', value: stats.products },
  ]

  return (
    <>
      <h1 className="mb-8 text-3xl font-semibold sm:text-4xl">Visão geral</h1>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="flex flex-col gap-1 rounded-3xl bg-muted p-6">
            <dt className="text-sm text-muted-foreground">{card.label}</dt>
            <dd className="font-display text-4xl font-semibold">{card.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="audit-title" className="mt-10">
        <h2 id="audit-title" className="mb-4 text-xl font-semibold">
          Alterações administrativas recentes
        </h2>
        {actions.length === 0 ? (
          <p className="rounded-3xl bg-muted px-6 py-8 text-sm text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((action) => (
              <li key={action.id} className="flex flex-wrap items-center justify-between gap-2 rounded-full bg-muted px-6 py-3 text-sm">
                <span>
                  <span className="font-medium">{action.adminName ?? 'Administrador'}</span>{' '}
                  <span className="text-muted-foreground">{actionLabels[action.action] ?? action.action}</span>
                </span>
                <time className="text-xs text-muted-foreground" dateTime={action.createdAt.toISOString()}>
                  {formatDate(action.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
