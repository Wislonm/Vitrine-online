'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cancelMercadoPagoSubscriptionAction } from '@/app/actions/mercadopago-subscriptions'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function CancelMercadoPagoSubscriptionButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function cancel() {
    startTransition(async () => {
      const result = await cancelMercadoPagoSubscriptionAction()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success(result.message ?? 'Renovação cancelada')
      router.refresh()
    })
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>Cancelar renovação</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar renovação do plano?</AlertDialogTitle>
            <AlertDialogDescription>A próxima cobrança recorrente será cancelada no Mercado Pago. Se houver período já pago, o acesso continua até a data de encerramento informada pelo provedor.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Manter plano</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={cancel}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Confirmar cancelamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
