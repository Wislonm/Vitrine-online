'use client'

import { useState } from 'react'
import { formatBrazilianDocument, onlyDocumentDigits, type BrazilianDocumentType } from '@/lib/brazil-document'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { signUpSchema, zodFieldErrors, type FieldErrors } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { NativeSelect } from '@/components/ui/native-select'

export function SignUpForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [whatsapp, setWhatsapp] = useState('')
  const [documentType, setDocumentType] = useState<BrazilianDocumentType>('cpf')
  const [documentNumber, setDocumentNumber] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const form = new FormData(event.currentTarget)
    const values = {
      name: String(form.get('name') ?? ''),
      commercialName: String(form.get('commercialName') ?? ''),
      documentType,
      documentNumber: onlyDocumentDigits(documentNumber),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      whatsapp,
      termsAccepted: form.get('termsAccepted') === 'on',
    }
    const confirm = String(form.get('confirm') ?? '')

    const parsed = signUpSchema.safeParse(values)
    const nextErrors: FieldErrors = parsed.success ? {} : zodFieldErrors(parsed.error)
    if (values.password !== confirm) nextErrors.confirm = ['As senhas não conferem']
    setErrors(nextErrors)
    if (!parsed.success || nextErrors.confirm) return

    setPending(true)
    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      commercialName: parsed.data.commercialName,
      documentType: parsed.data.documentType,
      documentNumber: parsed.data.documentNumber,
      email: parsed.data.email,
      password: parsed.data.password,
      whatsapp: parsed.data.whatsapp,
      termsAccepted: parsed.data.termsAccepted,
    })

    if (error) {
      setPending(false)
      if (error.code === 'USER_ALREADY_EXISTS' || error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
        setErrors({ email: ['Este e-mail já está cadastrado. Tente entrar.'] })
      } else if (error.code === 'PASSWORD_TOO_SHORT') {
        setErrors({ password: ['A senha precisa ter ao menos 8 caracteres'] })
      } else {
        setFormError(error.message || 'Não foi possível criar sua conta. Tente novamente.')
      }
      return
    }

    router.push('/painel')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Nome completo" htmlFor="name" required error={errors.name?.[0]}>
        <Input id="name" name="name" autoComplete="name" placeholder="Maria Souza" aria-invalid={!!errors.name} />
      </Field>
      <Field label="Nome comercial" htmlFor="commercialName" required error={errors.commercialName?.[0]}>
        <Input id="commercialName" name="commercialName" autoComplete="organization" placeholder="Ex.: Maria Moda" aria-invalid={!!errors.commercialName} />
      </Field>
      <div className="grid grid-cols-[minmax(7rem,0.75fr)_minmax(0,1.25fr)] gap-3">
        <Field label="Documento" htmlFor="documentType" required>
          <NativeSelect id="documentType" value={documentType} onChange={(event) => {
            const nextType = event.target.value as BrazilianDocumentType
            setDocumentType(nextType)
            setDocumentNumber(formatBrazilianDocument(nextType, documentNumber))
          }}>
            <option value="cnpj">CNPJ</option>
            <option value="cpf">CPF</option>
          </NativeSelect>
        </Field>
        <Field label={documentType.toUpperCase()} htmlFor="documentNumber" required error={errors.documentNumber?.[0]}>
          <Input id="documentNumber" name="documentNumber" inputMode="numeric" autoComplete="off" value={documentNumber} onChange={(event) => setDocumentNumber(formatBrazilianDocument(documentType, event.target.value))} placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'} aria-invalid={!!errors.documentNumber} />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="email" required error={errors.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          aria-invalid={!!errors.email}
        />
      </Field>
      <Field
        label="WhatsApp"
        htmlFor="whatsapp"
        required
        hint="Número que vai receber os pedidos, com DDD."
        error={errors.whatsapp?.[0]}
      >
        <PhoneInput
          id="whatsapp"
          name="whatsapp"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="(85) 99999-9999"
          aria-invalid={!!errors.whatsapp}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Senha" htmlFor="password" error={errors.password?.[0]}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={!!errors.password}
          />
        </Field>
        <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm?.[0]}>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
          />
        </Field>
      </div>

      {formError && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex items-start gap-3 pt-1">
        <input
          id="termsAccepted"
          name="termsAccepted"
          type="checkbox"
          required
          aria-invalid={!!errors.termsAccepted}
          aria-describedby={errors.termsAccepted ? 'termsAccepted-error' : undefined}
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          <label htmlFor="termsAccepted" className="cursor-pointer">Li e aceito os </label>
          <Link href="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">Termos de Uso</Link>
          {' '}e confirmo que li a{' '}
          <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">Política de Privacidade</Link>.
        </p>
      </div>
      {errors.termsAccepted?.[0] && <p id="termsAccepted-error" role="alert" className="-mt-2 text-xs text-destructive">{errors.termsAccepted[0]}</p>}

      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
        {pending ? 'Criando sua vitrine...' : 'Criar minha vitrine'}
      </Button>
    </form>
  )
}
