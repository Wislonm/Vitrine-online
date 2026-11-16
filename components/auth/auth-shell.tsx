import Image from 'next/image'
import { Logo } from '@/components/brand/logo'

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10">
          <header className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </header>
          {children}
          <div className="text-center text-sm text-muted-foreground">{footer}</div>
        </main>
      </div>

      <aside className="relative hidden bg-tile lg:block" aria-hidden="true">
        <Image
          src="/demo/hoodie-green.png"
          alt=""
          fill
          priority
          sizes="45vw"
          className="object-cover object-top"
        />
        <div className="absolute inset-x-10 bottom-10 rounded-3xl bg-background/90 p-6 backdrop-blur">
          <p className="font-display text-xl leading-snug font-semibold">
            Seus clientes escolhem. O pedido chega pronto no seu WhatsApp.
          </p>
        </div>
      </aside>
    </div>
  )
}
