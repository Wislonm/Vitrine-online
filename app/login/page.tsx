import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignInForm } from '@/components/auth/sign-in-form'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ bloqueado?: string }>
}) {
  const [{ bloqueado }, session] = await Promise.all([searchParams, getSession()])
  if (session?.user && !bloqueado) redirect('/painel')

  return (
    <AuthShell
      title="Bem-vindo de volta"
      description="Entre para gerenciar sua vitrine, produtos e categorias."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="font-medium text-foreground underline-offset-4 hover:underline">
            Criar vitrine
          </Link>
        </>
      }
    >
      <SignInForm blocked={Boolean(bloqueado)} />
    </AuthShell>
  )
}
