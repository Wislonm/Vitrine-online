'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropDialog } from '@/components/panel/image-crop-dialog'
import { Button } from '@/components/ui/button'
import { MAX_SOURCE_BYTES, SOURCE_TYPES } from '@/lib/image-crop'
import { cn } from '@/lib/utils'

type ImageUploaderProps = {
  kind: 'product' | 'banner' | 'avatar'
  value: string | null
  onChange: (url: string | null) => void
  label: string
  className?: string
  /** Controla apenas a moldura de exibição. O arquivo enviado é sempre quadrado (1:1). */
  shape?: 'square' | 'wide' | 'circle'
  compact?: boolean
}

export function ImageUploader({ kind, value, onChange, label, className, shape = 'square', compact = false }: ImageUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source)
    }
  }, [source])

  function handleSelect(file: File) {
    if (!SOURCE_TYPES.includes(file.type)) {
      toast.error('Use imagens JPG, PNG, WebP ou AVIF.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast.error('A imagem original deve ter no máximo 15 MB.')
      return
    }
    setSource(URL.createObjectURL(file))
  }

  function closeCropper() {
    setSource(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function upload(blob: Blob) {
    setUploading(true)
    try {
      const body = new FormData()
      const extension = blob.type === 'image/webp' ? 'webp' : 'png'
      body.append('file', new File([blob], `${kind}.${extension}`, { type: blob.type }))
      body.append('kind', kind)
      const response = await fetch('/api/upload', { method: 'POST', body })
      const json = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !json.url) {
        toast.error(json.error ?? 'Não foi possível enviar a imagem.')
        return
      }
      onChange(json.url)
      toast.success('Imagem salva')
      closeCropper()
    } catch {
      toast.error('Falha de conexão ao enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={cn('min-w-0 max-w-full overflow-hidden', compact ? 'flex flex-row items-center gap-2' : 'flex flex-col gap-3', className)}>
      {!compact && <span className="px-1 text-[0.8125rem] font-medium">{label}</span>}
      <button
        type="button"
        aria-label={`${value ? 'Trocar' : 'Enviar'} ${label}`}
        aria-busy={uploading}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer items-center justify-center overflow-hidden border-0 bg-tile p-0 text-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
          compact ? 'size-12 rounded-[10px]' : shape === 'circle' ? 'size-40 rounded-full' : shape === 'wide' ? 'aspect-[4/1] w-full rounded-[10px]' : 'aspect-square w-full max-w-64 rounded-[10px]',
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-muted-foreground" aria-hidden="true" />
        )}
        {uploading && !source && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-6 animate-spin" aria-label="Enviando imagem" />
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleSelect(file)
          }}
        />
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus aria-hidden="true" />
          {value ? 'Trocar imagem' : 'Enviar imagem'}
        </Button>

      </div>
      <ImageCropDialog
        open={source !== null}
        src={source}
        kind={kind}
        saving={uploading}
        onCancel={closeCropper}
        onConfirm={upload}
        onError={(message) => toast.error(message)}
      />
    </div>
  )
}
