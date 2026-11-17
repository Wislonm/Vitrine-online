import { CircleHelp } from 'lucide-react'

export function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label="Mais informações" className="flex size-5 items-center justify-center rounded-full bg-foreground text-background outline-none hover:bg-foreground/85 focus-visible:ring-2 focus-visible:ring-ring">
        <CircleHelp className="size-3.5" aria-hidden="true" />
      </button>
      <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-[10px] bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {children}
      </span>
    </span>
  )
}
