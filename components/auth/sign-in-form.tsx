'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { signInSchema, zodFieldErrors, type FieldErrors } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function SignInForm({ blocked }: { blocked?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(
    blocked ? 'Esta conta está bloqueada. Fale com o suporte da plataforma.' : null,
  )
  const [errors, setErrors] = useState<FieldErrors>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const form = new FormData(event.currentTarget)
    const parsed = signInSchema.safeParse({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    })
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})

    setPending(true)
    const { error } = await authClient.signIn.email(parsed.data)
    if (error) {
      setPending(false)
      setFormError(
        error.status === 403
          ? 'Esta conta está bloqueada. Fale com o suporte da plataforma.'
          : 'E-mail ou senha incorretos.',
      )
      return
    }

    router.push('/painel')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="E-mail" htmlFor="email" error={errors.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          aria-invalid={!!errors.email}
        />
      </Field>
      <Field label="Senha" htmlFor="password" error={errors.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
        />
      </Field>

      <div className="-mt-1 flex justify-end">
        <Link href="/recuperar-senha" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </div>

      {formError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {pending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
