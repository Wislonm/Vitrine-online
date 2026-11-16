import { cn } from '@/lib/utils'

export function UsageBar({ used, limit, percent }: { used: number; limit: number; percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={used}
      aria-label={`${used} de ${limit} produtos utilizados`}
      className="h-3 w-full overflow-hidden rounded-full bg-background"
    >
      <div
        className={cn('h-full rounded-full transition-all', percent >= 90 ? 'bg-destructive' : 'bg-sage')}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
