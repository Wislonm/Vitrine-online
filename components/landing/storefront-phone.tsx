import Image from 'next/image'
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react'

const products = [
  { name: 'Moletom Sálvia', price: 'R$ 120,00', image: '/demo/hoodie-green.png' },
  { name: 'Moletom Céu', price: 'R$ 135,00', image: '/demo/hoodie-blue.png' },
  { name: 'Moletom Areia', price: 'R$ 110,00', image: '/demo/hoodie-beige.png' },
  { name: 'Moletom Telha', price: 'R$ 125,00', image: '/demo/hoodie-orange.png' },
]

export function StorefrontPhone() {
  return (
    <div
      className="relative mx-auto w-[17.5rem] rounded-[3rem] bg-primary p-2.5 shadow-2xl shadow-foreground/15 sm:w-[19rem]"
      role="img"
      aria-label="Exemplo de vitrine digital em um celular, com banner, categorias e produtos"
    >
      <div className="relative h-[34rem] overflow-hidden rounded-[2.4rem] bg-background sm:h-[37rem]">
        <div className="absolute top-2 left-1/2 z-20 h-6 w-20 -translate-x-1/2 rounded-full bg-primary" />

        <div className="flex h-full flex-col gap-3 px-4 pt-11">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative size-9 overflow-hidden rounded-full bg-tile">
                <Image src="/demo/hoodie-beige.png" alt="" fill sizes="36px" className="object-cover object-top" />
              </span>
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold">Maria Moda</p>
                <p className="text-[0.65rem] text-muted-foreground">Fortaleza, CE</p>
              </div>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-4" aria-hidden="true" />
            </span>
          </div>

          <div className="flex h-10 items-center gap-2 rounded-full bg-muted px-4 text-xs text-muted-foreground">
            <Search className="size-3.5" aria-hidden="true" />
            Buscar produto
          </div>

          <div className="relative h-24 overflow-hidden rounded-3xl bg-tile">
            <Image src="/demo/banner.png" alt="" fill sizes="300px" className="object-cover" />
            <div className="absolute inset-0 flex flex-col justify-center gap-1 bg-gradient-to-r from-background/85 via-background/40 to-transparent px-4">
              <p className="font-display text-sm leading-tight font-semibold">
                Frio chegando,
                <br />
                promoção ligada
              </p>
              <span className="w-fit rounded-full bg-primary px-3 py-1 text-[0.65rem] text-primary-foreground">
                Ver ofertas
              </span>
            </div>
          </div>

          <div className="flex gap-2 overflow-hidden text-[0.7rem]">
            <span className="rounded-full bg-primary px-3.5 py-1.5 text-primary-foreground">Moletons</span>
            <span className="rounded-full bg-muted px-3.5 py-1.5">Bonés</span>
            <span className="rounded-full bg-muted px-3.5 py-1.5">Calças</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {products.slice(0, 2).map((product) => (
              <div key={product.name} className="flex flex-col gap-1.5">
                <div className="relative aspect-square overflow-hidden rounded-3xl bg-tile">
                  <Image src={product.image} alt="" fill sizes="140px" className="object-cover" />
                  <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-background/90">
                    <Heart className="size-3" aria-hidden="true" />
                  </span>
                </div>
                <p className="px-1 text-[0.7rem] leading-tight font-medium">{product.name}</p>
                <p className="px-1 text-[0.7rem] font-semibold">{product.price}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between rounded-full bg-background/95 p-1.5 shadow-lg shadow-foreground/10 ring-1 ring-border">
          <span className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground">
            <Home className="size-3.5" aria-hidden="true" />
            Início
          </span>
          <ShoppingBag className="size-4 text-muted-foreground" aria-hidden="true" />
          <Heart className="size-4 text-muted-foreground" aria-hidden="true" />
          <User className="mr-3 size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
