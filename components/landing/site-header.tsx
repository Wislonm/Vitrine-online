import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'

const links = [
  { href: '#beneficios', label: 'Benefícios' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'Dúvidas' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Entrar
          </Link>
          <Link href="/cadastro" className={buttonVariants({ size: 'sm' })}>
            Criar vitrine
          </Link>
        </div>
      </div>
    </header>
  )
}
