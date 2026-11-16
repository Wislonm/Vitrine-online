'use client'

import { useState, type CSSProperties } from 'react'
import { ImageIcon, Loader2, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { getCartItemKey, useCart } from '@/components/storefront/cart-context'
import { formatBRL } from '@/lib/format'

type CartSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  storeName: string
  canReceiveOrders: boolean
  themeStyle?: CSSProperties
}

export function CartSheet({ open, onOpenChange, slug, storeName, canReceiveOrders, themeStyle }: CartSheetProps) {
  const cart = useCart()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = new FormData(event.currentTarget)
    const customerName = String(form.get('customerName') ?? '').trim()
    if (customerName.length < 2) {
      setNameError('Informe seu nome para continuar')
      toast.error('Preencha seu nome para finalizar o pedido')
      requestAnimationFrame(() => {
        const field = document.getElementById('customerName')
        field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(field as HTMLInputElement | null)?.focus()
      })
      return
    }
    setNameError(null)

    setPending(true)
    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          customerName,
          customerPhone: phone,
          notes: String(form.get('notes') ?? ''),
          items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, variations: i.variationSelections.map((selection) => ({ variationId: selection.variationId, optionId: selection.optionId, optionLabel: selection.optionLabel })) })), 
        }),
      })
      const json = (await response.json()) as { whatsappUrl?: string; error?: string }
      if (!response.ok || !json.whatsappUrl) {
        setError(json.error ?? 'Não foi possível registrar o pedido. Tente novamente.')
        return
      }
      setWhatsappUrl(json.whatsappUrl)
      cart.clear()
      window.open(json.whatsappUrl, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setPending(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setWhatsappUrl(null)
    onOpenChange(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="cart-sheet gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        style={themeStyle}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <SheetTitle className="font-display text-2xl font-semibold">Seu carrinho</SheetTitle>
            <SheetDescription className="text-xs">Pedido para {storeName}</SheetDescription>
          </div>
          <SheetClose
            aria-label="Fechar carrinho"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-muted hover:bg-accent"
          >
            <X className="size-4" aria-hidden="true" />
          </SheetClose>
        </div>

        {whatsappUrl ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-sage text-sage-foreground">
              <MessageCircle className="size-7" aria-hidden="true" />
            </span>
            <h3 className="text-2xl font-semibold">Pedido pronto para enviar</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Abrimos o WhatsApp com a mensagem preenchida. Para concluir, confirme o envio da mensagem no aplicativo.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-sage px-8 text-base font-medium text-sage-foreground hover:bg-sage/90"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              Abrir WhatsApp novamente
            </a>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer text-sm text-muted-foreground underline underline-offset-4"
            >
              Voltar à vitrine
            </button>
          </div>
        ) : cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="font-display text-xl font-semibold">Seu carrinho está vazio</p>
            <p className="text-sm text-muted-foreground">Adicione produtos da vitrine para montar seu pedido.</p>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Ver produtos
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-4">
              <ul className="flex flex-col gap-3">
                {cart.items.map((item) => (
                  <li key={getCartItemKey(item)} className="flex gap-3 rounded-[10px] bg-muted p-2.5">
                    <div className="relative size-24 shrink-0 overflow-hidden rounded-[10px] bg-tile">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground/60" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-[5px] py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm leading-snug font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBRL(item.price)} cada</p>
                          {item.variationSelections.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.variationSelections.map((selection) => (
                                <span key={selection.variationId} className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] text-foreground">
                                  {selection.variationName}: {selection.optionLabel}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => cart.remove(getCartItemKey(item))}
                          aria-label={`Remover ${item.name}`}
                          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-full bg-background p-1">
                          <button
                            type="button"
                            onClick={() => cart.decrease(getCartItemKey(item))}
                            disabled={item.quantity <= 1}
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="size-4" aria-hidden="true" />
                          </button>
                          <span className="w-7 text-center text-sm font-medium tabular-nums" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => cart.increase(getCartItemKey(item))}
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="font-display text-base font-semibold">{formatBRL(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-4">
                <h3 className="font-display text-lg font-semibold">Seus dados</h3>
                <Field label="Nome" htmlFor="customerName" error={nameError ?? undefined}>
                  <Input id="customerName" name="customerName" autoComplete="name" placeholder="Como podemos te chamar?" aria-invalid={!!nameError} />
                </Field>
                <Field label="Telefone (opcional)" htmlFor="customerPhone">
                  <PhoneInput
                    id="customerPhone"
                    value={phone}
                    onChange={setPhone}
                    placeholder="(85) 99999-9999"
                  />
                </Field>
                <Field label="Observações (opcional)" htmlFor="notes">
                  <Textarea id="notes" name="notes" maxLength={500} placeholder="Tamanho, cor, forma de entrega..." className="min-h-20" />
                </Field>
              </div>
            </div>

            <div className="pb-safe flex flex-col gap-3 border-t border-border bg-background px-5 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-display text-2xl font-semibold">{formatBRL(cart.total)}</span>
              </div>
              {error && (
                <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {!canReceiveOrders && (
                <p role="alert" className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Esta loja ainda não cadastrou um WhatsApp para receber pedidos.
                </p>
              )}
              <Button type="submit" variant="sage" size="lg" disabled={pending || !canReceiveOrders}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
                {pending ? 'Preparando pedido...' : 'Finalizar pelo WhatsApp'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                O WhatsApp abrirá com a mensagem pronta. Você precisa confirmar o envio por lá.
              </p>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
