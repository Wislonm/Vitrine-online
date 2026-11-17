import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FinalCta() {
  return (
    <section className="px-5 pb-20 lg:pb-28">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-[2.5rem] bg-primary px-8 py-14 text-primary-foreground sm:px-14 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">
            Sua vitrine no ar ainda hoje.
          </h2>
          <p className="mt-3 text-primary-foreground/70">
            Crie a conta, cadastre os primeiros produtos e mande o link para seus clientes.
          </p>
        </div>
        <Link
          href="/cadastro"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'bg-primary-foreground text-primary hover:bg-primary-foreground/90',
          )}
        >
          Criar vitrine grátis
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
