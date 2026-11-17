'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ExternalLink, Gem, LayoutDashboard, LogOut, Package, Palette, ShieldCheck, Tags, UserRound } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Logo } from '@/components/brand/logo'
import { cn } from '@/lib/utils'

const items = [
  { href: '/painel', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/painel/produtos', label: 'Produtos', icon: Package },
  { href: '/painel/categorias', label: 'Categorias', icon: Tags },
  { href: '/painel/vitrine', label: 'Vitrine', icon: Palette },
  { href: '/painel/perfil', label: 'Perfil', icon: UserRound },
  { href: '/painel/plano', label: 'Plano', icon: Gem },
]

function useActive() {
  const pathname = usePathname()
  return (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href))
}

function useSignOut() {
  const router = useRouter()
  return async () => {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }
}

export function PanelSidebar({ isAdmin, userName, storeSlug, subscriptionExpired }: { isAdmin: boolean; userName: string; storeSlug: string; subscriptionExpired: boolean }) {
  const isActive = useActive()
  const signOut = useSignOut()
  const visibleItems = subscriptionExpired ? items.filter((item) => item.href === '/painel/plano') : items

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-border p-5 md:flex">
      <div className="flex flex-col gap-8">
        <Logo href="/painel" />
        <nav aria-label="Painel" className="flex flex-col gap-1">
          {visibleItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {subscriptionExpired && href === '/painel/plano' ? 'Contratar plano' : label}
              </Link>
            )
          })}
          {isAdmin && !subscriptionExpired && (
            <Link
              href="/admin"
              className="mt-3 flex items-center gap-3 rounded-full bg-tile px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Administração
            </Link>
          )}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <p className="truncate px-4 text-sm text-muted-foreground">{userName}</p>
        {subscriptionExpired ? (
          <button type="button" onClick={signOut} className="flex items-center gap-3 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-foreground/85">
            <LogOut className="size-4" aria-hidden="true" />
            Sair
          </button>
        ) : (
          <Link href={`/${storeSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver loja
          </Link>
        )}
      </div>
    </aside>
  )
}

export function PanelMobileNav({ subscriptionExpired = false }: { subscriptionExpired?: boolean }) {
  const isActive = useActive()
  const visibleItems = subscriptionExpired ? items.filter((item) => item.href === '/painel/plano') : items

  return (
    <nav
      aria-label="Painel"
      className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-between rounded-full bg-background/95 p-1.5 shadow-xl shadow-foreground/10 ring-1 ring-border backdrop-blur md:hidden"
    >
      {visibleItems.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            aria-label={subscriptionExpired ? 'Contratar plano' : label}
            className={cn(
              'flex h-11 items-center justify-center gap-1.5 rounded-full transition-all',
              active ? 'bg-primary px-4 text-primary-foreground' : 'w-11 text-muted-foreground',
            )}
          >
            <Icon className="size-[1.1rem]" aria-hidden="true" />
            {active && <span className="text-xs font-medium">{subscriptionExpired ? 'Contratar' : label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export function PanelMobileHeader({ isAdmin, storeSlug, subscriptionExpired }: { isAdmin: boolean; storeSlug: string; subscriptionExpired: boolean }) {
  const signOut = useSignOut()
  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-5 md:hidden">
      <Logo href="/painel" />
      {subscriptionExpired ? (
        <button type="button" onClick={signOut} aria-label="Sair" className="flex size-10 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85">
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link href="/admin" aria-label="Administração" className="flex size-10 items-center justify-center rounded-full bg-tile">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Link href={`/${storeSlug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver loja" className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:bg-muted">
            <ExternalLink className="size-4" aria-hidden="true" />
            Ver loja
          </Link>
        </div>
      )}
    </header>
  )
}
