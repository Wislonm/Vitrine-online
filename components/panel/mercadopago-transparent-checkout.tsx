'use client'

import Script from 'next/script'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Check, CreditCard, Loader2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatBRL } from '@/lib/format'

type MercadoPagoCardData = { token?: string }
type MercadoPagoCardForm = { getCardFormData: () => MercadoPagoCardData; unmount?: () => void }
type MercadoPagoCardFormOptions = {
  amount: string
  iframe: boolean
  form: Record<string, { id: string; placeholder?: string } | string>
  callbacks: {
    onFormMounted: (error?: unknown) => void
    onSubmit: (event: Event) => void | Promise<void>
  }
}
type MercadoPagoClient = { cardForm: (options: MercadoPagoCardFormOptions) => MercadoPagoCardForm }

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options: { locale: string }) => MercadoPagoClient
  }
}

type CheckoutStatus = { active: boolean; processing: boolean; status: string | null; providerStatus: string | null }

async function fetchCheckoutStatus(url: string): Promise<CheckoutStatus> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Não foi possível consultar a assinatura.')
  return response.json() as Promise<CheckoutStatus>
}

const periodLabels = {
  monthly: 'mês',
  quarterly: 'trimestre',
  semiannual: 'semestre',
  yearly: 'ano',
}

export function MercadoPagoTransparentCheckout({
  publicKey,
  amount,
  billingPeriod,
  planName,
  payerEmail,
  identificationType,
  identificationNumber,
  initiallyAwaiting = false,
}: {
  publicKey: string
  amount: number
  billingPeriod: keyof typeof periodLabels
  planName: string
  payerEmail: string
  identificationType: string | null
  identificationNumber: string | null
  initiallyAwaiting?: boolean
}) {
  const router = useRouter()
  const consentRef = useRef(false)
  const cardFormRef = useRef<MercadoPagoCardForm | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [awaiting, setAwaiting] = useState(initiallyAwaiting)
  const [completed, setCompleted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const statusKey = awaiting ? '/api/checkout/mercado-pago/status' : null
  const { data: checkoutStatus } = useSWR(statusKey, fetchCheckoutStatus, { refreshInterval: awaiting ? 5000 : 0, revalidateOnFocus: true })

  useEffect(() => {
    if (!sdkReady || completed || awaiting || cardFormRef.current) return
    if (!window.MercadoPago) {
      setError('O SDK seguro do Mercado Pago não carregou. Atualize a página e tente novamente.')
      return
    }

    const mercadoPago = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
    let cardForm: MercadoPagoCardForm
    cardForm = mercadoPago.cardForm({
      amount: amount.toFixed(2),
      iframe: true,
      form: {
        id: 'mp-subscription-card-form',
        cardNumber: { id: 'mp-card-number', placeholder: 'Número do cartão' },
        expirationDate: { id: 'mp-card-expiration', placeholder: 'MM/AA' },
        securityCode: { id: 'mp-card-security-code', placeholder: 'CVV' },
        cardholderName: { id: 'mp-cardholder-name', placeholder: 'Nome impresso no cartão' },
        cardholderEmail: { id: 'mp-cardholder-email', placeholder: 'E-mail do titular' },
        identificationType: { id: 'mp-identification-type' },
        identificationNumber: { id: 'mp-identification-number', placeholder: 'CPF ou CNPJ do titular' },
        issuer: { id: 'mp-issuer' },
        installments: { id: 'mp-installments' },
      },
      callbacks: {
        onFormMounted: (mountError) => {
          if (mountError) {
            setError('Não foi possível carregar o formulário seguro de cartão. Atualize a página e tente novamente.')
            return
          }
          setFormReady(true)
        },
        onSubmit: async (event) => {
          event.preventDefault()
          if (!consentRef.current) {
            setError('Confirme a cobrança recorrente para continuar.')
            return
          }

          const cardData = cardForm.getCardFormData()
          if (!cardData.token) {
            setError('Não foi possível tokenizar o cartão. Confira os dados e tente novamente.')
            return
          }

          setSubmitting(true)
          setError(null)
          setMessage(null)
          try {
            const response = await fetch('/api/checkout/mercado-pago', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cardToken: cardData.token, legalTermsAccepted: true, recurringAccepted: true }),
            })
            const result = await response.json() as { state?: string; message?: string; error?: string }
            if (result.state === 'processing') {
              setMessage(result.message ?? 'Solicitação enviada. Aguardando confirmação do Mercado Pago.')
              setAwaiting(true)
              return
            }
            if (!response.ok) {
              setError(result.error ?? 'Não foi possível iniciar a assinatura.')
              return
            }
            if (result.state === 'active') {
              setCompleted(true)
              setMessage(result.message ?? 'Assinatura ativada. Seu acesso foi liberado.')
              router.refresh()
              return
            }
            setMessage(result.message ?? 'Solicitação enviada. Aguardando confirmação do Mercado Pago.')
            setAwaiting(true)
          } catch {
            setError('Não foi possível confirmar o resultado agora. Atualize a página antes de tentar novamente para evitar uma cobrança duplicada.')
          } finally {
            setSubmitting(false)
          }
        },
      },
    })
    cardFormRef.current = cardForm

    return () => {
      cardForm.unmount?.()
      cardFormRef.current = null
    }
  }, [amount, awaiting, completed, publicKey, router, sdkReady])

  useEffect(() => {
    if (!checkoutStatus?.active || completed) return
    setCompleted(true)
    setAwaiting(false)
    setMessage('Pagamento confirmado. Sua assinatura está ativa e o painel foi liberado.')
    router.refresh()
  }, [checkoutStatus?.active, completed, router])

  useEffect(() => {
    if (!checkoutStatus || checkoutStatus.processing || checkoutStatus.active || !awaiting) return
    setAwaiting(false)
    setError('A solicitação não foi confirmada. Confira o status da assinatura antes de tentar novamente.')
  }, [awaiting, checkoutStatus?.active, checkoutStatus?.processing])

  function onConsentChange(accepted: boolean) {
    consentRef.current = accepted
    setConsent(accepted)
    if (accepted) setError(null)
  }

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-8" aria-labelledby="mp-checkout-title">
      <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setError('Não foi possível carregar o SDK seguro do Mercado Pago.')} />
      <div>
        <h2 id="mp-checkout-title" className="font-display text-xl font-semibold">Pagamento seguro</h2>
        <p className="mt-1 text-sm text-muted-foreground">{planName} · {formatBRL(amount)} / {periodLabels[billingPeriod]}</p>
      </div>

      {completed ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-sage/15 p-4 text-sm text-sage">
          <Check className="size-5 shrink-0" aria-hidden="true" />{message ?? 'Assinatura ativa.'}
        </div>
      ) : awaiting ? (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
          <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden="true" />
          <span>{message ?? 'Aguardando a confirmação segura do Mercado Pago. Esta página será atualizada automaticamente.'}</span>
        </div>
      ) : (
        <form id="mp-subscription-card-form" className="flex flex-col gap-4" noValidate>
          <Field label="Nome impresso no cartão" htmlFor="mp-cardholder-name" required>
            <Input id="mp-cardholder-name" autoComplete="cc-name" className="bg-muted" />
          </Field>
          <Field label="Número do cartão" htmlFor="mp-card-number" required>
            <div id="mp-card-number" className="min-h-12 rounded-full bg-muted px-5 py-3" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Validade" htmlFor="mp-card-expiration" required>
              <div id="mp-card-expiration" className="min-h-12 rounded-full bg-muted px-5 py-3" />
            </Field>
            <Field label="Código de segurança" htmlFor="mp-card-security-code" required>
              <div id="mp-card-security-code" className="min-h-12 rounded-full bg-muted px-5 py-3" />
            </Field>
          </div>
          <Field label="E-mail do titular" htmlFor="mp-cardholder-email" required>
            <Input id="mp-cardholder-email" type="email" autoComplete="email" defaultValue={payerEmail} className="bg-muted" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Documento" htmlFor="mp-identification-type" required>
              <select id="mp-identification-type" defaultValue={(identificationType ?? 'cpf').toUpperCase()} className="h-12 w-full rounded-full bg-muted px-5 text-sm">
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
              </select>
            </Field>
            <Field label="Número do documento" htmlFor="mp-identification-number" required>
              <Input id="mp-identification-number" inputMode="numeric" autoComplete="off" defaultValue={identificationNumber ?? ''} className="bg-muted" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Banco emissor" htmlFor="mp-issuer" required>
              <select id="mp-issuer" defaultValue="" className="h-12 w-full rounded-full bg-muted px-5 text-sm"><option value="" disabled>Selecione</option></select>
            </Field>
            <Field label="Parcelas" htmlFor="mp-installments" required>
              <select id="mp-installments" defaultValue="" className="h-12 w-full rounded-full bg-muted px-5 text-sm"><option value="" disabled>Selecione</option></select>
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
            <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
            <span>Li e aceito os <Link href="/termos" target="_blank" className="underline underline-offset-4">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline underline-offset-4">Política de Privacidade</Link>, e autorizo a cobrança recorrente de {formatBRL(amount)} por {periodLabels[billingPeriod]}. Posso cancelar a renovação pelo painel.</span>
          </label>

          {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}

          <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" aria-hidden="true" />Os dados do cartão são tokenizados pelo Mercado Pago e não são armazenados pela Ui Sales.</p>
          <Button type="submit" size="lg" disabled={!formReady || !consent || submitting}>
            {submitting || !formReady ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
            {submitting ? 'Processando...' : !formReady ? 'Carregando pagamento seguro...' : `Assinar por ${formatBRL(amount)}`}
          </Button>
        </form>
      )}
    </section>
  )
}
