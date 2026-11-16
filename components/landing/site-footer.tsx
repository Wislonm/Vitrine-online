import Link from 'next/link'
import { Logo } from '@/components/brand/logo'

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Vitrines digitais para revendedores, representantes e vendedores independentes receberem pedidos pelo
            WhatsApp.
          </p>
        </div>

        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-10 gap-y-6 text-sm">
          <ul className="flex flex-col gap-2.5">
            <li className="font-medium">Produto</li>
            <li>
              <a href="#beneficios" className="text-muted-foreground hover:text-foreground">
                Benefícios
              </a>
            </li>
            <li>
              <a href="#planos" className="text-muted-foreground hover:text-foreground">
                Planos
              </a>
            </li>
            <li>
              <a href="#faq" className="text-muted-foreground hover:text-foreground">
                Dúvidas
              </a>
            </li>
          </ul>
          <ul className="flex flex-col gap-2.5">
            <li className="font-medium">Conta</li>
            <li>
              <Link href="/cadastro" className="text-muted-foreground hover:text-foreground">
                Criar vitrine
              </Link>
            </li>
            <li>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
            </li>
          </ul>
          <ul className="flex flex-col gap-2.5">
            <li className="font-medium">Legal</li>
            <li><Link href="/privacidade" className="text-muted-foreground hover:text-foreground">Privacidade</Link></li>
            <li><Link href="/termos" className="text-muted-foreground hover:text-foreground">Termos de uso</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Ui Sales. Todos os direitos reservados.
      </div>
    </footer>
  )
}
