import { Plus } from 'lucide-react'

function getQuestions(trialDays: number) {
  const trialPeriod = trialDays > 0 ? `${trialDays} ${trialDays === 1 ? 'dia' : 'dias'}` : null
  return [
  {
    q: 'Preciso pagar para criar minha vitrine?',
    a: trialPeriod
      ? `Não. Cada nova conta recebe ${trialPeriod} grátis com acesso completo ao painel e aos recursos do plano Pro, sem cartão e sem cobrança durante o teste.`
      : 'Não. Cada nova conta recebe acesso ao plano gratuito permanente, com acesso completo e sem cartão.',
  },
  {
    q: 'O cliente paga pelo site?',
    a: 'Não. Nesta versão não existe pagamento online. O cliente monta o pedido e envia pelo WhatsApp, e você combina forma de pagamento e entrega com ele.',
  },
  {
    q: 'Como o pedido chega até mim?',
    a: 'Ao finalizar, abrimos o WhatsApp com uma mensagem pronta, com os dados do cliente, produtos, quantidades e total. O cliente precisa tocar em enviar para a mensagem chegar até você.',
  },
  {
    q: 'Posso mudar a aparência da minha vitrine?',
    a: 'Sim. No painel você edita o nome exibido, a descrição, as imagens da vitrine e escolhe entre 12 paletas de cores para combinar com sua marca.',
  },
  {
    q: trialPeriod ? `O que acontece após ${trialPeriod} grátis?` : 'O plano gratuito tem prazo de expiração?',
    a: trialPeriod
      ? `Ao fim do período de teste de ${trialPeriod}, o painel fica bloqueado até a contratação do plano Pro. Seus dados e sua vitrine permanecem salvos. No checkout você escolhe pagamento único por cartão ou Pix, ou renovação recorrente no cartão.`
      : 'Não. O plano gratuito permanece ativo sem data de expiração. Você pode contratar o Pro quando quiser.',
  },
  {
    q: 'Posso usar meu próprio domínio?',
    a: 'Ainda não. O domínio personalizado está nos planos futuros. Por enquanto, sua vitrine fica em um endereço amigável da plataforma.',
  },
  ]
}

export function Faq({ trialDays }: { trialDays: number }) {
  const questions = getQuestions(trialDays)
  return (
    <section id="faq" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 text-sm font-medium text-sage">Dúvidas frequentes</p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">Antes de começar, o essencial.</h2>
        </div>

        <div className="flex flex-col gap-3">
          {questions.map((item) => (
            <details key={item.q} className="group rounded-3xl bg-muted px-6 py-5 open:bg-tile">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <Plus
                  className="size-5 shrink-0 transition-transform group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
