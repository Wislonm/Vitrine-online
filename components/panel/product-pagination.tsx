import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ProductPagination({ page, pageCount, query, category }: { page: number; pageCount: number; query: string; category?: string }) {
  if (pageCount <= 1) return null
  const href = (next: number) => `/painel/produtos?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(category && category !== 'all' ? { category } : {}), page: String(next) }).toString()}`
  return (
    <nav aria-label="Paginação de produtos" className="mt-6 flex items-center justify-center gap-2">
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => (
        <Link key={item} href={href(item)} className={cn(buttonVariants({ variant: item === page ? 'default' : 'outline', size: 'sm' }))}>{item}</Link>
      ))}
    </nav>
  )
}
