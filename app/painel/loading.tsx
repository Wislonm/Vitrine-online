export default function PanelLoading() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl items-center justify-center px-5" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <span className="size-9 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Carregando painel...</span>
      </div>
    </main>
  )
}
