import Link from 'next/link'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={cn('size-9 shrink-0', className)}>
      <rect width="64" height="64" rx="16" className="fill-brand" />
      <g transform="translate(0 -2)">
        <path d="M17 14H47L54 30a5.5 5.5 0 0 1-11 0a5.5 5.5 0 0 1-11 0a5.5 5.5 0 0 1-11 0a5.5 5.5 0 0 1-11 0Z" className="fill-brand-cream" />
        <path d="M24.5 14H32V30a5.5 5.5 0 0 1-11 0Z" className="fill-brand-mint" />
        <path d="M39.5 14H47L54 30a5.5 5.5 0 0 1-11 0Z" className="fill-brand-mint" />
        <rect x="14" y="39" width="36" height="17" rx="3.5" className="fill-brand-window" />
        <g transform="translate(32 47.6) scale(.84) translate(-32 -47.6)">
          <path d="M27.5 44.5H36.5L38.6 54.5H25.4Z" strokeWidth="1.4" strokeLinejoin="round" className="fill-brand-cream stroke-brand-cream" />
          <path d="M29.6 47.2C29.6 40.6 34.4 40.6 34.4 47.2" strokeWidth="1.7" strokeLinecap="round" className="stroke-brand-cream" />
        </g>
      </g>
    </svg>
  )
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Minha Vitrine, página inicial">
      <LogoMark />
      <span className="font-display text-xl leading-none font-semibold tracking-tight">
        Minha <span className="text-sage">Vitrine</span>
      </span>
    </Link>
  )
}
