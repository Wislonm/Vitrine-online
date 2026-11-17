import { Link2, MessageCircle, Palette, ShoppingCart, Store, Tags } from 'lucide-react'

const benefits = [
  {
    icon: Link2,
    title: 'Um link, uma loja',
    text: 'Sua vitrine fica em um endereço próprio, como plataforma.com.br/maria. Basta compartilhar no Instagram, Status ou nas conversas.',
  },
  {
    icon: ShoppingCart,
    title: 'Carrinho lateral',
    text: 'O cliente escolhe os produtos, ajusta as quantidades e finaliza sem sair da página, inclusive pelo celular.',
  },
  {
    icon: MessageCircle,
    title: 'Pedido pronto no WhatsApp',
    text: 'A mensagem chega com nome, produtos, quantidades e total. Você só confirma e combina o pagamento do seu jeito.',
  },
  {
    icon: Palette,
    title: 'Sua cara na vitrine',
    text: 'Escolha entre banner, banner com foto ou só foto, e personalize nome e descrição pelo painel.',
  },
  {
    icon: Tags,
    title: 'Catálogo organizado',
    text: 'Crie categorias, publique ou desative produtos e acompanhe quantas vagas ainda restam no seu plano.',
  },
  {
    icon: Store,
    title: 'Feito para revendedores',
    text: 'Sem checkout financeiro e sem taxa por venda. Você segue vendendo como já vende, só que com mais organização.',
  },
]

export function Benefits() {
  return (
    <section id="beneficios" className="scroll-mt-20 bg-muted/60 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-brand-text">Benefícios</p>
          <h2 className="text-4xl leading-tight font-semibold sm:text-5xl">
            Menos conversa solta, mais pedido fechado.
          </h2>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-4 rounded-3xl bg-card p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-tile">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
