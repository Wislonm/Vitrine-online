import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <h1 className="text-5xl font-semibold sm:text-6xl">Página não encontrada</h1>
      <p className="max-w-md text-muted-foreground">
        O endereço que você acessou não existe ou a vitrine não está disponível no momento.
      </p>
      <Link href="/" className={buttonVariants({ size: 'lg' })}>
        Voltar ao início
      </Link>
    </main>
  )
}
