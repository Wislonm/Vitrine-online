import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/panel/page-header'
import { ProductForm } from '@/components/panel/product-form'
import { buttonVariants } from '@/components/ui/button'
import { listCategoryOptions } from '@/lib/repositories/categories'
import { isProPlan } from '@/lib/repositories/plans'
import { getPlanUsage } from '@/lib/services/plan-usage'
import { requireSellerContext } from '@/lib/session'

export const metadata: Metadata = { title: 'Novo produto' }

export default async function NewProductPage() {
  const { store } = await requireSellerContext()
  const [categories, usage] = await Promise.all([listCategoryOptions(store.id), getPlanUsage(store.id)])

  return (
    <>
      <PageHeader title="Novo produto" description="Preencha os dados e publique quando estiver pronto." />
      {usage.isFull ? (
        <div className="flex flex-col items-start gap-4 rounded-[2rem] bg-muted p-8">
          <p className="font-display text-xl font-semibold">Você atingiu o limite de {usage.limit} produtos</p>
          <p className="text-sm text-muted-foreground">
            Exclua um produto existente para liberar espaço no limite do plano Pro.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/painel/produtos" className={buttonVariants()}>
              Gerenciar produtos
            </Link>
            <Link href="/painel/plano" className={buttonVariants({ variant: 'outline' })}>
              Ver meu plano
            </Link>
          </div>
        </div>
      ) : (
        <ProductForm categories={categories} canUseProductIdentifiers={isProPlan(usage.plan)} />
      )}
    </>
  )
}
