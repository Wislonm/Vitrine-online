import type { Metadata } from 'next'
import Link from 'next/link'
import { PackageOpen, Plus, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/panel/page-header'
import { ProductRow } from '@/components/panel/product-row'
import { ProductPagination } from '@/components/panel/product-pagination'
import { UsageBar } from '@/components/panel/usage-bar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { listCategoryOptions } from '@/lib/repositories/categories'
import { listProducts } from '@/lib/repositories/products'
import { hasProductIdentifiersFeature } from '@/lib/repositories/plans'
import { getPlanUsage } from '@/lib/services/plan-usage'
import { requireSellerContext } from '@/lib/session'

export const metadata: Metadata = { title: 'Produtos' }

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; page?: string }> }) {
  const params = await searchParams
  const q = params.q ?? ''
  const category = params.category ?? 'all'
  const page = Math.max(Number(params.page ?? '1') || 1, 1)
  const { store } = await requireSellerContext()
  const [result, usage, categories] = await Promise.all([
    listProducts(store.id, { search: q, categoryId: category, page, pageSize: 15 }),
    getPlanUsage(store.id),
    listCategoryOptions(store.id),
  ])

  return (
    <>
      <PageHeader title="Produtos" description="Cadastre, edite e controle o que aparece na sua vitrine." action={usage.isFull ? <span className="rounded-full bg-muted px-5 py-3 text-sm text-muted-foreground">Limite do plano atingido</span> : <Link href="/painel/produtos/novo" className={buttonVariants({ size: 'lg' })}><Plus aria-hidden="true" />Novo produto</Link>} />
      <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-tile p-5"><div className="flex items-center justify-between text-sm"><span className="font-medium">{usage.used} de {usage.limit} produtos</span><span className="text-muted-foreground">{usage.remaining} vagas restantes</span></div><UsageBar used={usage.used} limit={usage.limit} percent={usage.percent} /></div>
      <form role="search" method="get" className="mb-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input name="q" defaultValue={q} placeholder="Buscar produto pelo nome" aria-label="Buscar produto" className="pl-12" /></div><NativeSelect name="category" defaultValue={category} aria-label="Filtrar por categoria"><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect><input type="hidden" name="page" value="1" /><Button type="submit" size="lg">Filtrar</Button>{(q || category !== 'all') && <Link href="/painel/produtos" className={buttonVariants({ variant: 'ghost', size: 'lg' })}><X aria-hidden="true" />Limpar filtros</Link>}</form>
      {result.items.length === 0 ? <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-muted px-6 py-16 text-center"><PackageOpen className="size-8 text-muted-foreground" aria-hidden="true" /><p className="font-display text-xl font-semibold">{q || category !== 'all' ? 'Nenhum produto encontrado' : 'Sua vitrine ainda está vazia'}</p><p className="max-w-sm text-muted-foreground">Ajuste sua busca ou filtro para encontrar produtos.</p></div> : <><ul className="flex flex-col gap-3">{result.items.map((product) => <ProductRow key={product.id} canUseProductIdentifiers={hasProductIdentifiersFeature(usage.plan)} product={{ id: product.id, name: product.name, referenceCode: product.referenceCode, sku: product.sku, price: product.price, imageUrl: product.imageUrl, isActive: product.isActive, isPublished: product.isPublished, categoryName: product.categoryName }} />)}</ul><ProductPagination page={result.page} pageCount={result.pageCount} query={q} category={category} /></>}
    </>
  )
}
