import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'
import { Logo } from '@/components/brand/logo'
import { requireAdmin } from '@/lib/session'

export const metadata: Metadata = {
  title: { default: 'Administração', template: '%s | Admin Minha Vitrine' },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <Logo href="/admin" />
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Admin</span>
          </div>
          <Link
            href="/painel"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Meu painel
          </Link>
        </div>
        <div className="mx-auto max-w-5xl px-5 pb-4">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  )
}
