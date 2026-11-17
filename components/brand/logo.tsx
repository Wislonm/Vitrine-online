import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Minha Vitrine, página inicial">
      <Image src="/logo-minhavitrine-dark.svg" alt="" width={139} height={46} className="h-10 w-auto object-contain" />
    </Link>
  )
}
