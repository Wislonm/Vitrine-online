import Link from 'next/link'
import { ArrowRight, MessageCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { StorefrontPhone } from '@/components/landing/storefront-phone'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pt-14 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="flex flex-col items-start gap-7">
          <span className="rise-in inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs font-medium">
            <span className="size-2 rounded-full bg-sage" aria-hidden="true" />
            30 dias grátis, sem cartão
          </span>

          <h1
            className="rise-in text-5xl leading-[1.02] font-semibold sm:text-6xl lg:text-7xl"
            style={{ animationDelay: '80ms' }}
          >
            Sua vitrine pronta. Os pedidos chegam no seu WhatsApp.
          </h1>

          <p
            className="rise-in max-w-xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: '160ms' }}
          >
            Crie sua loja online em minutos, cadastre seus produtos e compartilhe um link só. O cliente
            monta o pedido e você recebe tudo organizado na conversa, sem taxa por venda.
          </p>

          <div className="rise-in flex flex-wrap items-center gap-3" style={{ animationDelay: '240ms' }}>
            <Link href="/cadastro" className={buttonVariants({ size: 'lg' })}>
              Criar minha vitrine grátis
              <ArrowRight aria-hidden="true" />
            </Link>
            <a href="#como-funciona" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Ver como funciona
            </a>
          </div>

          <p className="rise-in text-sm text-muted-foreground" style={{ animationDelay: '300ms' }}>
            30 dias grátis com acesso completo ao painel. Cadastro em menos de 2 minutos.
          </p>
        </div>

        <div className="rise-in relative" style={{ animationDelay: '200ms' }}>
          <div className="absolute inset-x-6 top-10 bottom-0 rounded-[3rem] bg-tile" aria-hidden="true" />
          <div className="relative py-6">
            <StorefrontPhone />

            <div className="absolute right-0 bottom-24 z-20 hidden w-60 rounded-3xl bg-card p-4 shadow-xl shadow-foreground/10 ring-1 ring-border sm:block lg:-right-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-sage text-sage-foreground">
                  <MessageCircle className="size-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold">Novo pedido no WhatsApp</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Cliente: João Silva
                <br />
                2x Moletom Sálvia
                <br />
                1x Moletom Céu
              </p>
              <p className="mt-2 border-t border-border pt-2 text-sm font-semibold">Total: R$ 375,00</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
