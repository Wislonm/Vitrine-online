'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, Lock, LockOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { changeStorePlanAction, deleteAccountAction, setAccountStatusAction } from '@/app/actions/admin'
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
import { Input } from '@/components/ui/input'
import { formatBRL, formatDate } from '@/lib/format'
import type { CheckoutBillingPeriod } from '@/lib/repositories/plans'
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
  storeStatus: string | null
  storeName: string | null
  storeSlug: string | null
  planId: string | null
  planName: string | null
  billingPeriod: string | null
  productLimit: number | null
  productCount: number
}

export function AccountRow({
  account,
  plans,
  currentAdminId,
}: {
  account: AccountRowData
  plans: { id: string; name: string; periods: { period: CheckoutBillingPeriod; amount: number }[] }[]
  currentAdminId: string
}) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(false)
  const blocked = account.lifecycleStatus === 'blocked'
  const isSelf = account.userId === currentAdminId
  const isAdmin = account.role === 'admin'
  const confirmationMatches = confirmationEmail.trim().toLowerCase() === account.email.trim().toLowerCase()
  const currentPlan = plans.find((plan) => plan.id === account.planId)
  const currentPlanPeriods = currentPlan?.periods ?? []
  const initialPeriod = currentPlanPeriods.find((option) => option.period === account.billingPeriod)?.period
    ?? currentPlanPeriods[0]?.period
    ?? 'monthly'
  const [selectedPeriod, setSelectedPeriod] = useState<CheckoutBillingPeriod>(initialPeriod)

  function assignPlan(planId: string, period: CheckoutBillingPeriod) {
    if (!account.storeId) return
    const storeId = account.storeId
    const previousPeriod = selectedPeriod
    setSelectedPeriod(period)
    startTransition(async () => {
      const result = await changeStorePlanAction(storeId, planId, period)
      if (result.ok) toast.success(result.message ?? 'Plano alterado')
      else {
        setSelectedPeriod(previousPeriod)
        toast.error(result.error)
      }
    })
  }

  function changePlan(planId: string) {
    const plan = plans.find((option) => option.id === planId)
    const period = plan?.periods.find((option) => option.period === selectedPeriod)?.period ?? plan?.periods[0]?.period
    if (!period) {
      toast.error('Esse plano não tem períodos configurados.')
      return
    }
    assignPlan(planId, period)
  }

  function changePeriod(value: string) {
    const period = currentPlanPeriods.find((option) => option.period === value)?.period
    if (account.planId && period) assignPlan(account.planId, period)
  }

  function toggleStatus() {
    startTransition(async () => {
      const result = await setAccountStatusAction(account.userId, blocked ? 'active' : 'blocked')
      if (result.ok) toast.success(result.message ?? 'Conta atualizada')
      else toast.error(result.error)
      setConfirmOpen(false)
    })
  }

  function changeDeleteDialog(open: boolean) {
    setDeleteOpen(open)
    if (!open) {
      setConfirmationEmail('')
      setConfirmPermanentDelete(false)
    }
  }

  function deleteAccount() {
    startTransition(async () => {
      const result = await deleteAccountAction({
        userId: account.userId,
        confirmationEmail,
        confirmed: confirmPermanentDelete,
      })
      if (result.ok) {
        toast.success(result.message ?? 'Conta excluída')
        changeDeleteDialog(false)
      } else {
        toast.error(result.error)
      }
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
              account.lifecycleStatus === 'blocked' ? 'bg-destructive/10 text-destructive' : account.lifecycleStatus === 'suspended' ? 'bg-brand/15 text-brand-text' : 'bg-sage/15 text-sage',
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
          <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-none">
            <NativeSelect
              id={`account-plan-${account.storeId}`}
              aria-label={`Plano da loja ${account.storeName ?? account.userName}`}
              value={account.planId ?? ''}
              disabled={pending}
              onChange={(event) => changePlan(event.target.value)}
              className="h-10 min-w-40 flex-1 bg-background sm:flex-none"
            >
              {!account.planId && <option value="" disabled>Selecione um plano</option>}
              {account.planId && !plans.some((plan) => plan.id === account.planId) && <option value={account.planId} disabled>{account.planName ?? 'Plano interno'}</option>}
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              id={`account-period-${account.storeId}`}
              aria-label={`Período do plano da loja ${account.storeName ?? account.userName}`}
              value={currentPlanPeriods.some((option) => option.period === selectedPeriod) ? selectedPeriod : currentPlanPeriods[0]?.period ?? ''}
              disabled={pending || !account.planId || currentPlanPeriods.length === 0}
              onChange={(event) => changePeriod(event.target.value)}
              className="h-10 min-w-36 flex-1 bg-background sm:flex-none"
            >
              {currentPlanPeriods.length === 0 ? (
                <option value="">Sem períodos</option>
              ) : currentPlanPeriods.map((option) => (
                <option key={option.period} value={option.period}>
                  {`${option.period === 'monthly' ? 'Mensal' : option.period === 'semiannual' ? 'Semestral' : 'Anual'} · ${formatBRL(option.amount)}`}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
        {!isSelf && !isAdmin && (
          <>
            <Button type="button" variant={blocked ? 'secondary' : 'outline'} size="sm" disabled={pending} onClick={() => setConfirmOpen(true)}>
              {blocked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {blocked ? 'Desbloquear' : 'Bloquear'}
            </Button>
            {account.storeStatus === 'blocked' && (
              <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={() => changeDeleteDialog(true)}>
                <Trash2 aria-hidden="true" />Excluir
              </Button>
            )}
          </>
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

      <AlertDialog open={deleteOpen} onOpenChange={changeDeleteDialog}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a conta, sessões, vitrine, produtos, pedidos e imagens próprias da loja. Renovações ativas serão canceladas antes da remoção; pagamentos já aprovados não são reembolsados. O registro de auditoria será preservado. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4 text-sm">
            <p>Conta selecionada: <span className="font-medium text-foreground">{account.email}</span></p>
            <div className="flex flex-col gap-2">
              <label htmlFor={`delete-account-email-${account.userId}`} className="font-medium">Digite o e-mail exato para confirmar</label>
              <Input
                id={`delete-account-email-${account.userId}`}
                type="email"
                autoComplete="off"
                value={confirmationEmail}
                onChange={(event) => setConfirmationEmail(event.target.value)}
                aria-invalid={confirmationEmail.length > 0 && !confirmationMatches}
              />
              {confirmationEmail.length > 0 && !confirmationMatches && <p role="status" className="text-xs text-destructive">O e-mail não corresponde à conta selecionada.</p>}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted p-3 leading-relaxed">
              <input
                type="checkbox"
                checked={confirmPermanentDelete}
                onChange={(event) => setConfirmPermanentDelete(event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-primary"
              />
              <span>Entendo que os dados da loja e os pedidos serão removidos permanentemente.</span>
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending || !confirmationMatches || !confirmPermanentDelete} onClick={deleteAccount}>
              {pending ? 'Excluindo...' : 'Excluir conta'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
