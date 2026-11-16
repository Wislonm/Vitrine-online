import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata: Metadata = {
  title: 'Nova senha',
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <AuthShell
      title="Crie uma nova senha"
      description="Escolha uma senha com pelo menos 8 caracteres."
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  )
}
