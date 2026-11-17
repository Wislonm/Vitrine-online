import type { Metadata } from 'next'
import { Search } from 'lucide-react'
import { AccountStatusTabs } from '@/components/admin/account-status-tabs'
import { Input } from '@/components/ui/input'
import { listAccounts } from '@/lib/repositories/admin'
import { getPlanPeriodPrices, listPlans } from '@/lib/repositories/plans'
import { requireAdmin } from '@/lib/session'

export const metadata: Metadata = { title: 'Usuários e lojas' }

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const admin = await requireAdmin()
  const [accounts, plans] = await Promise.all([listAccounts(q), listPlans({ onlyActive: true })])

  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold sm:text-4xl">Usuários e lojas</h1>
      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">Suspensas: plano expirado ou pendência financeira. Bloqueadas: contas impedidas de acessar por descumprimento das regras. A exclusão fica disponível somente para lojas bloqueadas; planos podem ser atribuídos manualmente na linha do usuário.</p>

      <form role="search" className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input name="q" defaultValue={q} placeholder="Buscar por nome, e-mail ou endereço da loja" aria-label="Buscar contas" className="pl-12" />
      </form>

      <AccountStatusTabs
        currentAdminId={admin.id}
        plans={plans.map((plan) => ({ id: plan.id, name: plan.name }))}
        accounts={accounts.map((account) => ({
          userId: account.userId,
          userName: account.userName,
          email: account.email,
          role: account.role,
          status: account.status,
          lifecycleStatus: account.lifecycleStatus,
          lifecycleReason: account.lifecycleReason,
          createdAt: account.createdAt.toISOString(),
          storeId: account.storeId,
          storeStatus: account.storeStatus,
          storeName: account.storeName,
          storeSlug: account.storeSlug,
          planId: account.planId,
          planName: account.planName,
          productLimit: account.productLimit,
          productCount: account.productCount,
        }))}
      />
    </>
  )
}
