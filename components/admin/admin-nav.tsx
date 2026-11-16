'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Visão geral', exact: true },
  { href: '/admin/usuarios', label: 'Usuários e lojas' },
  { href: '/admin/planos', label: 'Planos' },
  { href: '/admin/configuracoes/mercado-pago', label: 'Mercado Pago' },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Administração" className="flex gap-2 overflow-x-auto">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
