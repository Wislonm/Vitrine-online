'use client'

import { useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function ForgotPasswordForm({ emailConfigured }: { emailConfigured: boolean }) {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!emailConfigured) {
    return (
      <p className="rounded-3xl bg-muted px-5 py-4 text-sm leading-relaxed text-muted-foreground">
        O envio de e-mails ainda não foi configurado nesta plataforma, então a recuperação automática de senha está
        indisponível. Entre em contato com o administrador para redefinir sua senha.
      </p>
    )
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-tile px-5 py-5">
        <MailCheck className="size-6" aria-hidden="true" />
        <p className="text-sm leading-relaxed">
          Se existir uma conta com esse e-mail, enviaremos as instruções para criar uma nova senha.
        </p>
      </div>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    if (!email) {
      setError('Informe seu e-mail')
      return
    }
    setError(null)
    setPending(true)
    await authClient.requestPasswordReset({ email, redirectTo: '/redefinir-senha' })
    setPending(false)
    setSent(true)
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="E-mail" htmlFor="email" error={error ?? undefined}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@email.com" />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        Enviar instruções
      </Button>
    </form>
  )
}
