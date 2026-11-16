const steps = [
  {
    title: 'Crie sua conta',
    text: 'Informe nome, e-mail, senha e o WhatsApp que vai receber os pedidos. Sua loja é criada automaticamente.',
  },
  {
    title: 'Cadastre seus produtos',
    text: 'Envie fotos, defina preços e organize em categorias. Publique quando estiver pronto.',
  },
  {
    title: 'Compartilhe o link',
    text: 'Divulgue o endereço da sua vitrine. O cliente monta o carrinho e toca em finalizar.',
  },
  {
    title: 'Receba no WhatsApp',
    text: 'O WhatsApp abre com a mensagem pronta. Basta o cliente enviar e você atender como de costume.',
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-sage">Como funciona</p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">
            Da conta criada ao primeiro pedido em quatro passos.
          </h2>
        </div>

        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-3xl bg-tile p-6">
              <span
                className="flex size-10 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>

        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Importante: a plataforma abre o WhatsApp com a mensagem pronta, mas é o cliente quem confirma o envio. Não há
          pagamento online nesta versão.
        </p>
      </div>
    </section>
  )
}
