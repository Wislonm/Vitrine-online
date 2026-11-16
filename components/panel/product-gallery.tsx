'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropDialog } from '@/components/panel/image-crop-dialog'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { MAX_SOURCE_BYTES, SOURCE_TYPES } from '@/lib/image-crop'

export function ProductGallery({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source)
  }, [source])

  function selectFile(file?: File) {
    if (!file) return
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

  async function upload(blob: Blob) {
    setUploading(true)
    try {
      const formData = new FormData()
      const extension = blob.type === 'image/webp' ? 'webp' : 'png'
      formData.append('file', new File([blob], `gallery.${extension}`, { type: blob.type }))
      formData.append('kind', 'product')
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      const result = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !result.url) {
        toast.error(result.error ?? 'Não foi possível enviar a imagem.')
        return
      }
      onChange([...images, result.url])
      toast.success('Imagem adicionada à galeria')
      setSource(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      toast.error('Falha de conexão ao enviar a imagem.')
    } finally {
      setUploading(false)
    }
  }

  function confirmDelete() {
    if (deleteIndex === null) return
    onChange(images.filter((_, index) => index !== deleteIndex))
    setDeleteIndex(null)
  }

  return (
    <>
      <div className="mt-8 flex h-[17rem] w-28 shrink-0 self-start flex-col items-center gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} />
        {images.length > 0 ? (
          <>
            <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((url, index) => (
                <div key={`${url}-${index}`} className="group relative h-16 w-full shrink-0 overflow-hidden rounded-[10px] bg-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Imagem ${index + 1} da galeria`} className="size-full object-cover" />
                  <button type="button" onClick={() => setDeleteIndex(index)} aria-label={`Excluir imagem ${index + 1} da galeria`} className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background text-destructive shadow-sm">
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" size="icon-lg" className="size-9 shrink-0 rounded-full" disabled={uploading || images.length >= 12} onClick={() => inputRef.current?.click()} aria-label="Adicionar foto à galeria" title="Adicionar foto">
              {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            </Button>
          </>
        ) : (
          <div className="my-auto flex flex-col items-center gap-2">
            <Button type="button" size="icon-lg" className="size-14 shrink-0 rounded-full" disabled={uploading} onClick={() => inputRef.current?.click()} aria-label="Criar galeria" title="Adicionar foto à galeria">
              {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
            </Button>
            <span className="text-xs font-medium text-muted-foreground">Galeria</span>
          </div>
        )}
      </div>
      <ImageCropDialog open={source !== null} src={source} kind="product" saving={uploading} onCancel={() => { setSource(null); if (inputRef.current) inputRef.current.value = '' }} onConfirm={upload} onError={(message) => toast.error(message)} />
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imagem da galeria?</AlertDialogTitle>
            <AlertDialogDescription>Esta imagem será removida da galeria do produto ao salvar as alterações.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
