'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Crop, Lightbulb, Loader2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cropToWebp, type CropArea } from '@/lib/image-crop'

type Kind = 'product' | 'banner' | 'avatar'

const tips: Record<Kind, string> = {
  product:
    'Deixe o produto no centro e ocupando boa parte do quadro. Fundo limpo e boa iluminação valorizam a foto na vitrine.',
  banner:
    'A capa é exibida em faixa na vitrine, então o centro da imagem é a parte que mais aparece. Deixe o assunto principal na região central.',
  avatar:
    'Centralize o rosto ou a logo. Na vitrine, a imagem aparece dentro de um círculo, então mantenha o assunto longe das bordas.',
}

type ImageCropDialogProps = {
  open: boolean
  src: string | null
  kind: Kind
  saving: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
  onError: (message: string) => void
}

export function ImageCropDialog({ open, src, kind, saving, onCancel, onConfirm, onError }: ImageCropDialogProps) {
  const zoomId = useId()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<CropArea | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 })
      setZoom(kind === 'banner' ? 2 : 1)
      setArea(null)
    }
  }, [open, src])

  const onCropComplete = useCallback((_: unknown, pixels: CropArea) => setArea(pixels), [])

  async function save() {
    if (!src || !area) return
    setProcessing(true)
    try {
      const blob = await cropToWebp(src, area, kind === 'banner' ? 4 : 1)
      onConfirm(blob)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível recortar a imagem.')
    } finally {
      setProcessing(false)
    }
  }

  const busy = processing || saving

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="gap-5 rounded-[10px] p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl font-semibold">
            <Crop className="size-5" aria-hidden="true" />
            Recortar imagem
          </DialogTitle>
          <DialogDescription>{kind === 'banner' ? 'O banner usa a proporção 4:1 (783×196px).' : 'Esta imagem usa a proporção quadrada 1:1.'}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-[10px] bg-tile p-3.5 text-sm leading-relaxed">
          <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-medium">Dica: </span>
            {tips[kind]}
          </p>
        </div>

        <div className={`relative w-full overflow-hidden rounded-[10px] bg-muted ${kind === 'banner' ? 'aspect-[4/1]' : 'aspect-square'}`}>
          {src && (
            <Cropper
              image={src}
              objectFit="cover"
              cropSize={kind === 'banner' ? { width: 360, height: 90 } : { width: 360, height: 360 }}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={4}
              aspect={kind === 'banner' ? 4 : 1}
              cropShape={kind === 'avatar' ? 'round' : 'rect'}
              showGrid={kind !== 'avatar'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <p className="-mt-2 text-xs text-muted-foreground">Arraste a imagem para reposicionar e use o zoom para ajustar o enquadramento.</p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z - 0.2).toFixed(2))))}
            aria-label="Diminuir zoom"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <label htmlFor={zoomId} className="sr-only">
            Zoom
          </label>
          <input
            id={zoomId}
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-2 w-full cursor-pointer accent-primary"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))}
            aria-label="Aumentar zoom"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(kind === 'banner' ? 2 : 1)
              setCrop({ x: 0, y: 0 })
            }}
            aria-label="Restaurar enquadramento"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/85"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>

        <DialogFooter className="-mx-5 -mb-5 rounded-b-[10px] p-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={save} disabled={busy || !area}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {busy ? 'Salvando...' : 'Salvar recorte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
