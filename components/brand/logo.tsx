import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Minha Vitrine, página inicial">
      <Image src="/minha-vitrine-icon.png" alt="" width={36} height={36} className="size-9 rounded-xl object-cover" />
      <span className="font-display text-lg font-semibold tracking-tight">Minha Vitrine</span>
    </Link>
  )
}
