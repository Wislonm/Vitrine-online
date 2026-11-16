import type { Metadata } from 'next'
import { CategoryManager } from '@/components/panel/category-manager'
import { PageHeader } from '@/components/panel/page-header'
import { listCategories } from '@/lib/repositories/categories'
import { requireSellerContext } from '@/lib/session'

export const metadata: Metadata = { title: 'Categorias' }

export default async function CategoriesPage() {
  const { store } = await requireSellerContext()
  const categories = await listCategories(store.id)

  return (
    <>
      <PageHeader title="Categorias" description="Organize seus produtos para o cliente encontrar mais rápido." />
      <CategoryManager categories={categories} />
    </>
  )
}
