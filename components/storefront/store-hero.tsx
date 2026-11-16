import { cn } from '@/lib/utils'

export type HeroType = 'banner' | 'banner_avatar' | 'avatar'

type StoreHeroProps = {
  type: HeroType
  name: string
  description?: string | null
  bannerUrl?: string | null
  avatarUrl?: string | null
  compact?: boolean
  showText?: boolean
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function Banner({ url, name, compact }: { url?: string | null; name: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-tile',
        'aspect-[4/1] min-h-[168px] sm:min-h-0',
        'rounded-[2em]',
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-display text-7xl font-semibold tracking-tight text-foreground/10 sm:text-8xl"
        >
          {initials(name)}
        </span>
      )}
    </div>
  )
}

function Avatar({ url, name, className }: { url?: string | null; name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-tile ring-4 ring-background',
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Foto de ${name}`} className="size-full object-cover" />
      ) : (
        <span aria-hidden="true" className="font-display text-2xl font-semibold text-foreground/40">
          {initials(name)}
        </span>
      )}
    </div>
  )
}

export function StoreHero({ type, name, description, bannerUrl, avatarUrl, compact, showText = true }: StoreHeroProps) {
  const text = (
    <div className={cn('flex flex-col gap-1.5', type === 'avatar' && 'items-center text-center')}>
      <h1 className={cn('font-semibold', compact ? 'text-xl' : 'text-3xl sm:text-4xl')}>{name}</h1>
      {description && (
        <p className={cn('max-w-xl text-pretty text-muted-foreground', compact ? 'text-xs' : 'text-sm sm:text-base')}>
          {description}
        </p>
      )}
    </div>
  )

  if (type === 'banner') {
    return (
      <header className="flex flex-col gap-5">
        <Banner url={bannerUrl} name={name} compact={compact} />
        {showText && <div className="px-5 sm:px-0">{text}</div>}
      </header>
    )
  }

  if (type === 'banner_avatar') {
    return (
      <header className="flex flex-col gap-4">
        <Banner url={bannerUrl} name={name} compact={compact} />
        <div className="flex flex-col gap-4 px-5 sm:px-6">
          <Avatar url={avatarUrl} name={name} className={cn(compact ? 'size-16' : 'size-24 sm:size-28')} />
          {text}
        </div>
      </header>
    )
  }

  return (
    <header className="flex flex-col items-center gap-5 px-5 pt-4">
      <Avatar url={avatarUrl} name={name} className={compact ? 'size-20' : 'size-28 sm:size-32'} />
      {text}
    </header>
  )
}
