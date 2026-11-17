'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, Lock, LockOpen } from 'lucide-react'
import { toast } from 'sonner'
import { changeStorePlanAction, setAccountStatusAction } from '@/app/actions/admin'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

export type AccountRowData = {
  userId: string
  userName: string
  email: string
  role: string
  status: string
  lifecycleStatus: 'active' | 'suspended' | 'blocked'
  lifecycleReason: string | null
  createdAt: string
  storeId: string | null
  storeName: string | null
  storeSlug: string | null
  planId: string | null
  planName: string | null
  productLimit: number | null
  productCount: number
}

export function AccountRow({
  account,
  plans,
  currentAdminId,
}: {
  account: AccountRowData
  plans: { id: string; name: string }[]
  currentAdminId: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const blocked = account.lifecycleStatus === 'blocked'
  const isSelf = account.userId === currentAdminId
  const isAdmin = account.role === 'admin'

  function changePlan(planId: string) {
    if (!account.storeId) return
    const storeId = account.storeId
    startTransition(async () => {
      const result = await changeStorePlanAction(storeId, planId)
      if (result.ok) toast.success(result.message ?? 'Plano alterado')
      else toast.error(result.error)
    })
  }

  function toggleStatus() {
    startTransition(async () => {
      const result = await setAccountStatusAction(account.userId, blocked ? 'active' : 'blocked')
      if (result.ok) toast.success(result.message ?? 'Conta atualizada')
      else toast.error(result.error)
      setConfirmOpen(false)
    })
  }

  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-muted p-5 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{account.userName}</p>
          {isAdmin && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs text-primary-foreground">Admin</span>}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              account.lifecycleStatus === 'blocked' ? 'bg-destructive/10 text-destructive' : account.lifecycleStatus === 'suspended' ? 'bg-primary/10 text-primary' : 'bg-sage/15 text-sage',
            )}
          >
            {account.lifecycleStatus === 'blocked' ? 'Bloqueada' : account.lifecycleStatus === 'suspended' ? 'Suspensa' : 'Ativa'}
          </span>
          {account.lifecycleReason && <span className="text-xs text-muted-foreground">{account.lifecycleReason}</span>}
        </div>
        <p className="truncate text-sm text-muted-foreground">{account.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {account.storeName ? (
            <>
              Loja {account.storeName} ·{' '}
              <Link
                href={`/${account.storeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                /{account.storeSlug}
                <ExternalLink className="size-3" aria-hidden="true" />
              </Link>{' '}
              · {account.productCount}/{account.productLimit ?? 0} produtos
            </>
          ) : (
            'Sem loja'
          )}{' '}
          · Desde {formatDate(account.createdAt)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {account.storeId && (
          <div className="w-40">
            <NativeSelect
              aria-label={`Plano de ${account.userName}`}
              value={account.planId ?? ''}
              disabled={pending}
              onChange={(e) => changePlan(e.target.value)}
              className="h-10 bg-background"
            >
              {account.planId && !plans.some((plan) => plan.id === account.planId) && <option value={account.planId} disabled>{account.planName ?? 'Plano interno'}</option>}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        {!isSelf && !isAdmin && (
          <Button type="button" variant={blocked ? 'secondary' : 'outline'} size="sm" disabled={pending} onClick={() => setConfirmOpen(true)}>
            {blocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {blocked ? 'Desbloquear' : 'Bloquear'}
          </Button>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{blocked ? 'Desbloquear' : 'Bloquear'} {account.userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {blocked
                ? 'A pessoa poderá entrar novamente e a vitrine voltará ao ar.'
                : 'A pessoa será desconectada, não conseguirá entrar e a vitrine sairá do ar até o desbloqueio.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant={blocked ? 'default' : 'destructive'} disabled={pending} onClick={toggleStatus}>
              {blocked ? 'Desbloquear' : 'Bloquear'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
