'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { GripVertical, ImageIcon, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProductAction, reorderProductAction } from '@/app/actions/products'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

export type ProductRowData = {
  id: string
  name: string
  referenceCode: string | null
  sku: string | null
  price: string
  imageUrl: string | null
  isActive: boolean
  isPublished: boolean
  categoryName: string | null
}

function statusOf(product: ProductRowData) {
  if (!product.isActive) return { label: 'Desativado', tone: 'bg-muted text-muted-foreground' }
  if (!product.isPublished) return { label: 'Rascunho', tone: 'bg-tile text-foreground' }
  return { label: 'Na vitrine', tone: 'bg-sage text-sage-foreground' }
}

export function ProductRow({ product }: { product: ProductRowData }) {
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function reorder(event: React.DragEvent<HTMLLIElement>) {
    event.preventDefault()
    setDragOver(false)
    const draggedId = event.dataTransfer.getData('text/product-id')
    if (!draggedId || draggedId === product.id) return
    startTransition(async () => {
      const result = await reorderProductAction(draggedId, product.id)
      if (!result.ok) toast.error(result.error)
    })
  }
  const status = statusOf(product)

  function remove() {
    startTransition(async () => {
      const result = await deleteProductAction(product.id)
      if (result.ok) toast.success(result.message ?? 'Produto excluído')
      else toast.error(result.error)
      setConfirmOpen(false)
    })
  }

  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/product-id', product.id)
        setDragging(true)
      }}
      onDragEnd={() => { setDragging(false); setDragOver(false) }}
      onDragEnter={(event) => { event.preventDefault(); setDragOver(true) }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragOver(false) }}
      onDrop={reorder}
      className={cn(
        'relative flex cursor-grab flex-wrap items-center gap-3 rounded-3xl border-2 p-3 pr-5 transition-all duration-200 active:cursor-grabbing sm:flex-nowrap',
        dragging ? 'z-20 scale-[1.02] border-primary bg-background shadow-2xl shadow-primary/20 ring-4 ring-primary/10' : 'bg-muted',
        dragOver && !dragging ? 'translate-y-1 border-dashed border-primary bg-background shadow-lg' : 'border-transparent',
      )}
    >
      <span className="flex size-8 shrink-0 cursor-grab items-center justify-center text-muted-foreground" title="Clique e arraste para reordenar" aria-label="Clique e arraste para reordenar">
        <GripVertical className="size-5" aria-hidden="true" />
      </span>
      <Link href={`/painel/produtos/${product.id}`} aria-label={`Editar foto de ${product.name}`} className="relative size-20 shrink-0 overflow-hidden rounded-[10px] bg-tile transition-opacity hover:opacity-80">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={`Foto de ${product.name}`} className="size-full object-cover" />
        ) : (
          <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/painel/produtos/${product.id}`} className="block w-fit max-w-full truncate font-medium hover:underline hover:underline-offset-4">
          {product.name}
        </Link>
        {(product.referenceCode || product.sku) && <p className="text-xs text-muted-foreground">{product.referenceCode && <>REF: {product.referenceCode}</>}{product.referenceCode && product.sku && <span className="px-1.5">·</span>}{product.sku && <>SKU: {product.sku}</>}</p>}
        <p className="text-sm text-muted-foreground">
          {formatBRL(product.price)}
          {product.categoryName ? ` · ${product.categoryName}` : ''}
        </p>
        <span className={cn('mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', status.tone)}>
          {status.label}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href={`/painel/produtos/${product.id}`}
          aria-label={`Editar ${product.name}`}
          className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
        >
          <Pencil aria-hidden="true" />
        </Link>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Excluir ${product.name}`}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {product.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto sai da vitrine e libera uma vaga no seu plano. Pedidos antigos continuam com o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}
