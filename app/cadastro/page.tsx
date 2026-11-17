import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Criar vitrine',
  robots: { index: false, follow: false },
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect('/painel')

  return (
    <AuthShell
      title="Crie sua vitrine"
      description="Leva menos de dois minutos. Sua loja começa com 7 dias grátis e acesso completo, sem cartão."
      footer={
        <>
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  )
}
