export default function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="size-9 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </main>
  )
}
