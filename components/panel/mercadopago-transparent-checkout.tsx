'use client'

import Script from 'next/script'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Check, Clipboard, CreditCard, Loader2, LockKeyhole, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatBRL } from '@/lib/format'

type MercadoPagoCardData = {
  token?: string
  cardholderEmail?: string
  paymentMethodId?: string
  issuerId?: string | number
  installments?: string | number
  identificationType?: string
  identificationNumber?: string
}
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

type CheckoutStatus = {
  active: boolean
  processing: boolean
  status: string | null
  providerStatus: string | null
  checkoutMode: 'recurring' | 'one_time' | null
  paymentMethod: 'card' | 'pix' | null
  pixQrCode: string | null
  pixQrCodeBase64: string | null
  pixExpiresAt: string | null
  paymentExpired: boolean
}

type PaymentResponse = {
  state?: 'active' | 'processing'
  message?: string
  error?: string
  paymentMethod?: 'card' | 'pix'
  pixQrCode?: string | null
  pixQrCodeBase64?: string | null
  pixExpiresAt?: string | null
}

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
  trialEndsAt = null,
  initiallyAwaiting = false,
  initialPaymentMethod = 'card',
  initialPixQrCode = null,
  initialPixQrCodeBase64 = null,
  initialPixExpiresAt = null,
  initialPixExpired = false,
  initialCheckoutMode = 'one_time',
}: {
  publicKey: string
  amount: number
  billingPeriod: keyof typeof periodLabels
  planName: string
  payerEmail: string
  identificationType: string | null
  identificationNumber: string | null
  trialEndsAt?: string | null
  initiallyAwaiting?: boolean
  initialPaymentMethod?: 'card' | 'pix'
  initialPixQrCode?: string | null
  initialPixQrCodeBase64?: string | null
  initialPixExpiresAt?: string | null
  initialPixExpired?: boolean
  initialCheckoutMode?: 'recurring' | 'one_time'
}) {
  const router = useRouter()
  const consentRef = useRef(false)
  const cardFormRef = useRef<MercadoPagoCardForm | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [formReady, setFormReady] = useState(false)
  const [consent, setConsent] = useState(false)
  const [recurring, setRecurring] = useState(initialCheckoutMode === 'recurring' && initialPaymentMethod === 'card')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>(initialPaymentMethod)
  const [submitting, setSubmitting] = useState(false)
  const [awaiting, setAwaiting] = useState(initiallyAwaiting)
  const [completed, setCompleted] = useState(false)
  const [pixExpired, setPixExpired] = useState(initialPixExpired)
  const [pixQrCode, setPixQrCode] = useState<string | null>(initialPixQrCode)
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(initialPixQrCodeBase64)
  const [pixExpiresAt, setPixExpiresAt] = useState<string | null>(initialPixExpiresAt)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(initialPixExpired ? 'O QR Code Pix anterior expirou. Gere um novo para continuar.' : null)
  const firstRenewalDateLabel = trialEndsAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(trialEndsAt))
    : null
  const statusKey = awaiting ? '/api/checkout/mercado-pago/status' : null
  const { data: checkoutStatus } = useSWR(statusKey, fetchCheckoutStatus, { refreshInterval: awaiting ? 5000 : 0, revalidateOnFocus: true })

  async function handlePaymentResponse(response: Response) {
    const result = await response.json() as PaymentResponse
    if (result.state === 'processing') {
      setPaymentMethod(result.paymentMethod ?? paymentMethod)
      setPixQrCode(result.pixQrCode ?? null)
      setPixQrCodeBase64(result.pixQrCodeBase64 ?? null)
      setPixExpiresAt(result.pixExpiresAt ?? null)
      setPixExpired(false)
      setMessage(result.message ?? 'Pagamento enviado. Aguardando confirmação do Mercado Pago.')
      setAwaiting(true)
      return
    }
    if (!response.ok) {
      setError(result.error ?? 'Não foi possível concluir o pagamento.')
      return
    }
    setCompleted(true)
    setMessage(result.message ?? 'Pagamento aprovado. Sua assinatura está ativa.')
    router.refresh()
  }

  async function submitPixPayment() {
    if (!consentRef.current) {
      setError('Aceite os termos e confirme a modalidade de cobrança para continuar.')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch('/api/checkout/mercado-pago/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'pix', legalTermsAccepted: true }),
      })
      await handlePaymentResponse(response)
    } catch {
      setError('Não foi possível gerar o Pix. Atualize a página antes de tentar novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!sdkReady || paymentMethod !== 'card' || completed || awaiting || cardFormRef.current) return
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
            setError('Confirme a cobrança selecionada para continuar.')
            return
          }

          const cardData = cardForm.getCardFormData()
          const recurringMode = recurring
          if (!cardData.token || (!recurringMode && !cardData.paymentMethodId)) {
            setError('Não foi possível tokenizar o cartão. Confira os dados e tente novamente.')
            return
          }

          setSubmitting(true)
          setError(null)
          setMessage(null)
          try {
            const endpoint = recurringMode ? '/api/checkout/mercado-pago' : '/api/checkout/mercado-pago/payment'
            const body = recurringMode
              ? { cardToken: cardData.token, legalTermsAccepted: true, recurringAccepted: true }
              : {
                  paymentMethod: 'card',
                  legalTermsAccepted: true,
                  cardToken: cardData.token,
                  paymentMethodId: cardData.paymentMethodId,
                  payerEmail: cardData.cardholderEmail ?? payerEmail,
                  issuerId: cardData.issuerId ? String(cardData.issuerId) : undefined,
                  installments: Number(cardData.installments) || 1,
                  identificationType: cardData.identificationType?.toUpperCase(),
                  identificationNumber: cardData.identificationNumber?.replace(/\D/g, ''),
                }
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            })
            await handlePaymentResponse(response)
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
      setFormReady(false)
    }
  }, [amount, awaiting, completed, paymentMethod, publicKey, recurring, router, sdkReady])

  useEffect(() => {
    if (!checkoutStatus) return
    if (checkoutStatus.active && !completed) {
      setCompleted(true)
      setAwaiting(false)
      setMessage('Pagamento confirmado. Sua assinatura está ativa e o painel foi liberado.')
      router.refresh()
      return
    }
    if (checkoutStatus.paymentExpired) {
      setAwaiting(false)
      setPixExpired(true)
      setPixQrCode(null)
      setPixQrCodeBase64(null)
      setError('O QR Code Pix expirou. Gere um novo para continuar.')
      return
    }
    if (!checkoutStatus.processing && awaiting) {
      setAwaiting(false)
      setError('A solicitação não foi confirmada. Revise o status antes de tentar novamente.')
    }
  }, [awaiting, checkoutStatus, completed, router])

  function onConsentChange(accepted: boolean) {
    consentRef.current = accepted
    setConsent(accepted)
    if (accepted) setError(null)
  }

  function choosePaymentMethod(method: 'card' | 'pix') {
    setPaymentMethod(method)
    setError(null)
    setConsent(false)
    consentRef.current = false
    if (method === 'pix') setRecurring(false)
    if (method === 'pix' && !completed) setFormReady(false)
  }

  function chooseRecurring(enabled: boolean) {
    setRecurring(enabled)
    setConsent(false)
    consentRef.current = false
    setError(null)
  }

  async function copyPixCode() {
    if (!pixQrCode) return
    try {
      await navigator.clipboard.writeText(pixQrCode)
      toast.success('Código Pix copiado')
    } catch {
      setError('Não foi possível copiar automaticamente. Selecione e copie o código Pix.')
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border bg-background p-5 sm:p-8" aria-labelledby="mp-checkout-title">
      {paymentMethod === 'card' && !awaiting && !completed && <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setError('Não foi possível carregar o SDK seguro do Mercado Pago.')} />}
      <div>
        <h2 id="mp-checkout-title" className="font-display text-xl font-semibold">Pagamento seguro</h2>
        <p className="mt-1 text-sm text-muted-foreground">{planName} · {formatBRL(amount)} / {periodLabels[billingPeriod]}</p>
      </div>

      {completed ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl bg-sage/15 p-4 text-sm text-sage">
          <Check className="size-5 shrink-0" aria-hidden="true" />{message ?? 'Assinatura ativa.'}
        </div>
      ) : awaiting ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-muted p-4">
          {paymentMethod === 'pix' && pixQrCodeBase64 && (
            <img src={`data:image/png;base64,${pixQrCodeBase64}`} alt="QR Code Pix para pagar o plano" className="mx-auto size-52 rounded-xl bg-background p-2" />
          )}
          <div role="status" className="flex items-start gap-3 text-sm leading-relaxed">
            <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" aria-hidden="true" />
            <span>{message ?? (paymentMethod === 'pix' ? 'Aguardando o pagamento Pix.' : 'Aguardando a confirmação do Mercado Pago. Esta página será atualizada automaticamente.')}</span>
          </div>
          {paymentMethod === 'pix' && pixQrCode && (
            <div className="flex flex-col gap-2">
              <label htmlFor="pix-copy-code" className="text-xs font-medium">Pix copia e cola</label>
              <div className="flex gap-2">
                <Input id="pix-copy-code" readOnly value={pixQrCode} className="min-w-0 bg-background text-xs" />
                <Button type="button" variant="outline" size="sm" onClick={copyPixCode} aria-label="Copiar código Pix"><Clipboard aria-hidden="true" /></Button>
              </div>
            </div>
          )}
          {pixExpiresAt && paymentMethod === 'pix' && <p className="text-xs text-muted-foreground">Válido até {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(pixExpiresAt))} UTC.</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <>
          <div role="group" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2 rounded-full bg-muted p-1.5">
            <button type="button" aria-pressed={paymentMethod === 'card'} onClick={() => choosePaymentMethod('card')} className={`rounded-full px-3 py-2.5 text-sm font-medium ${paymentMethod === 'card' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Cartão</button>
            <button type="button" aria-pressed={paymentMethod === 'pix'} onClick={() => choosePaymentMethod('pix')} className={`rounded-full px-3 py-2.5 text-sm font-medium ${paymentMethod === 'pix' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Pix</button>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
            <input type="checkbox" checked={recurring} disabled={paymentMethod === 'pix'} onChange={(event) => chooseRecurring(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
            <span>{paymentMethod === 'pix' ? 'Pix é pagamento único, sem renovação automática.' : `Ativar renovação automática no cartão. ${firstRenewalDateLabel ? `A primeira cobrança será em ${firstRenewalDateLabel}.` : 'A cobrança começa na contratação.'} Desativado por padrão.`}</span>
          </label>

          {paymentMethod === 'card' ? (
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
                    <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option>
                  </select>
                </Field>
                <Field label="Número do documento" htmlFor="mp-identification-number" required>
                  <Input id="mp-identification-number" inputMode="numeric" autoComplete="off" defaultValue={identificationNumber ?? ''} className="bg-muted" />
                </Field>
              </div>
              <div className={recurring ? 'hidden' : 'grid grid-cols-2 gap-3'} aria-hidden={recurring}>
                <Field label="Banco emissor" htmlFor="mp-issuer" required>
                  <select id="mp-issuer" defaultValue="" className="h-12 w-full rounded-full bg-muted px-5 text-sm"><option value="" disabled>Selecione</option></select>
                </Field>
                <Field label="Parcelas" htmlFor="mp-installments" required>
                  <select id="mp-installments" defaultValue="" className="h-12 w-full rounded-full bg-muted px-5 text-sm"><option value="" disabled>Selecione</option></select>
                </Field>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
                <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
                <span>Li e aceito os <Link href="/termos" target="_blank" className="underline underline-offset-4">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline underline-offset-4">Política de Privacidade</Link>. {recurring ? `Autorizo a cobrança recorrente de ${formatBRL(amount)} por ${periodLabels[billingPeriod]}${firstRenewalDateLabel ? `, com a primeira cobrança em ${firstRenewalDateLabel}` : ', com cobrança na contratação'}. Posso cancelar a renovação pelo painel.` : `Confirmo o pagamento único de ${formatBRL(amount)}, cobrado agora pelo período de ${periodLabels[billingPeriod]}, sem renovação automática.`}
                </span>
              </label>
              {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-4" aria-hidden="true" />Os dados do cartão são tokenizados pelo Mercado Pago e não são armazenados pela Minha Vitrine.</p>
              <Button type="submit" size="lg" disabled={!formReady || !consent || submitting}>
                {submitting || !formReady ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
                {submitting ? 'Processando...' : !formReady ? 'Carregando pagamento seguro...' : recurring ? 'Autorizar renovação automática' : `Pagar ${formatBRL(amount)}`}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="rounded-2xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">Pagamento Pix único de {formatBRL(amount)}. O acesso Pro começa após a confirmação e fica ativo por {periodLabels[billingPeriod]}, sem renovação automática.</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-muted p-4 text-sm leading-relaxed">
                <input type="checkbox" checked={consent} onChange={(event) => onConsentChange(event.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" />
                <span>Li e aceito os <Link href="/termos" target="_blank" className="underline underline-offset-4">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className="underline underline-offset-4">Política de Privacidade</Link>. Confirmo o pagamento único de {formatBRL(amount)} pelo período de {periodLabels[billingPeriod]}, sem renovação automática.</span>
              </label>
              {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
              <Button type="button" size="lg" disabled={!consent || submitting} onClick={submitPixPayment}>
                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <QrCode aria-hidden="true" />}
                {submitting ? 'Gerando Pix...' : pixExpired ? 'Gerar novo Pix' : `Gerar Pix de ${formatBRL(amount)}`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
