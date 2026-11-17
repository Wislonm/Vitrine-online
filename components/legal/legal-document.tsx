import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { LEGAL_DOCUMENT_DATE, LEGAL_DOCUMENT_VERSION } from '@/lib/legal'

type LegalSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

type LegalDocumentProps = {
  title: string
  description: string
  sections: LegalSection[]
  relatedHref: string
  relatedLabel: string
}

export function LegalDocument({ title, description, sections, relatedHref, relatedLabel }: LegalDocumentProps) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Logo href="/" />
          <Link href="/cadastro" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Criar vitrine</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Início
        </Link>

        <article className="rounded-3xl bg-background p-5 shadow-sm ring-1 ring-border sm:p-10">
          <header className="mb-8 flex flex-col gap-3">
            <p className="text-sm font-medium text-sage">Minha Vitrine · documentos legais</p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground">Versão {LEGAL_DOCUMENT_VERSION} · {LEGAL_DOCUMENT_DATE}</p>
          </header>

          <aside role="note" className="mb-8 rounded-2xl border border-border bg-muted p-4 text-sm leading-relaxed">
            <p className="font-semibold">Rascunho incompleto — não é a versão final para publicação.</p>
            <p className="mt-1 text-muted-foreground">
              A identificação legal do controlador/fornecedor e o canal de contato para solicitações de privacidade ainda não foram definidos. Esses dados precisam ser incluídos e o conteúdo revisado antes do uso como documento final.
            </p>
          </aside>

          <div className="flex flex-col gap-8">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`legal-section-${index}`} className="scroll-mt-6">
                <h2 id={`legal-section-${index}`} className="mb-3 font-display text-xl font-semibold">{section.title}</h2>
                <div className="flex flex-col gap-3 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && (
                    <ul className="ml-5 list-disc space-y-2">
                      {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>

          <nav aria-label="Outros documentos legais" className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link href={relatedHref} className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline">
              {relatedLabel}<ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/cadastro" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Voltar ao cadastro</Link>
          </nav>
        </article>
      </main>
    </div>
  )
}
