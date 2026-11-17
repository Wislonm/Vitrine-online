'use client'

import { useState } from 'react'
import { AccountRow, type AccountRowData } from '@/components/admin/account-row'
import { cn } from '@/lib/utils'

type LifecycleStatus = AccountRowData['lifecycleStatus']

const statusTabs: { value: LifecycleStatus; label: string }[] = [
  { value: 'active', label: 'Ativas' },
  { value: 'suspended', label: 'Suspensas' },
  { value: 'blocked', label: 'Bloqueadas' },
]

export function AccountStatusTabs({
  accounts,
  plans,
  currentAdminId,
}: {
  accounts: AccountRowData[]
  plans: { id: string; name: string; periods: { period: 'monthly' | 'semiannual' | 'yearly'; amount: number }[] }[]
  currentAdminId: string
}) {
  const [status, setStatus] = useState<LifecycleStatus>('active')
  const visibleAccounts = accounts.filter((account) => account.lifecycleStatus === status)

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filtrar lojas por situação" className="grid grid-cols-3 gap-2 rounded-full bg-muted p-1.5">
        {statusTabs.map((tab) => {
          const count = accounts.filter((account) => account.lifecycleStatus === tab.value).length
          const selected = status === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setStatus(tab.value)}
              className={cn(
                'flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:text-sm',
                selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              <span className={cn('tabular-nums', selected ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{count}</span>
            </button>
          )
        })}
      </div>

      {visibleAccounts.length === 0 ? (
        <p className="rounded-3xl bg-muted px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhuma {status === 'active' ? 'loja ativa' : status === 'suspended' ? 'loja suspensa' : 'loja bloqueada'} encontrada.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleAccounts.map((account) => (
            <AccountRow key={account.userId} account={account} currentAdminId={currentAdminId} plans={plans} />
          ))}
        </ul>
      )}
    </div>
  )
}
