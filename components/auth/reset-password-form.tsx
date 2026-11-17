'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function ResetPasswordForm({ token }: { token?: string }) {
  const [pending, setPending] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-muted px-5 py-5 text-sm leading-relaxed text-muted-foreground">
        <p>Este link é inválido ou expirou. Solicite uma nova recuperação de senha.</p>
        <Link href="/recuperar-senha" className="font-medium text-foreground underline-offset-4 hover:underline">
          Solicitar novo link
        </Link>
      </div>
    )
  }

  if (completed) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-3xl bg-tile px-5 py-5">
        <MailCheck className="size-6" aria-hidden="true" />
        <p className="text-sm leading-relaxed">Sua senha foi alterada. Agora você pode entrar com a nova senha.</p>
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Ir para o login
        </Link>
      </div>
    )
  }

  const resetToken = token

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirm = String(form.get('confirm') ?? '')
    if (password.length < 8) return setError('A senha precisa ter ao menos 8 caracteres')
    if (password !== confirm) return setError('As senhas não conferem')

    setError(null)
    setPending(true)
    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: resetToken })
      if (resetError) {
        setError('Este link é inválido ou expirou. Solicite uma nova recuperação.')
        return
      }
      setCompleted(true)
    } catch {
      setError('Não foi possível alterar sua senha agora. Tente solicitar uma nova recuperação.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nova senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="confirm" error={error ?? undefined}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" maxLength={128} required />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        Salvar nova senha
      </Button>
    </form>
  )
}
