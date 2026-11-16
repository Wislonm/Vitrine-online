'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <p className="rounded-3xl bg-muted px-5 py-4 text-sm text-muted-foreground">
        Este link é inválido ou expirou. Solicite uma nova recuperação de senha.
      </p>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirm = String(form.get('confirm') ?? '')
    if (password.length < 8) return setError('A senha precisa ter ao menos 8 caracteres')
    if (password !== confirm) return setError('As senhas não conferem')

    setError(null)
    setPending(true)
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token as string })
    setPending(false)
    if (resetError) {
      setError('Este link é inválido ou expirou. Solicite uma nova recuperação.')
      return
    }
    router.push('/login')
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nova senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="confirm" error={error ?? undefined}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        Salvar nova senha
      </Button>
    </form>
  )
}
