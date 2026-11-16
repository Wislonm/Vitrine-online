import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Ui Sales, página inicial">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ShoppingBag className="size-4" aria-hidden="true" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Ui Sales</span>
    </Link>
  )
}
