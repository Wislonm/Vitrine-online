import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { listPlans } from '@/lib/repositories/plans'
import { formatTrialDays } from '@/lib/format'
import { getSession } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Criar vitrine',
  robots: { index: false, follow: false },
}

export default async function SignUpPage() {
  const session = await getSession()
  if (session?.user) redirect('/painel')

  const plans = await listPlans()
  const trialDays = plans.find((plan) => plan.slug === 'trial-default')?.trialDays ?? 7
  const signupDescription = trialDays > 0
    ? `Leva menos de dois minutos. Sua loja começa com ${formatTrialDays(trialDays)} e acesso completo, sem cartão.`
    : 'Leva menos de dois minutos. Sua loja começa no plano Gratuito permanente, com acesso completo e sem cartão.'

  return (
    <AuthShell
      title="Crie sua vitrine"
      description={signupDescription}
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
