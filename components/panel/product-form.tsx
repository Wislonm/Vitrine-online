'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteProductAction, saveProductAction } from '@/app/actions/products'
import { createCategoryAction } from '@/app/actions/categories'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ImageUploader } from '@/components/panel/image-uploader'
import { ProductGallery } from '@/components/panel/product-gallery'
import { Button, buttonVariants } from '@/components/ui/button'
import { VariationBuilder, type VariationDraft } from '@/components/panel/variation-builder'
import { Field } from '@/components/ui/field'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { parsePriceInput } from '@/lib/format'
import type { FieldErrors } from '@/lib/validators'

type ProductFormProps = {
  productId?: string
  categories: { id: string; name: string }[]
  canUseProductIdentifiers: boolean
  initial?: {
    name: string
    referenceCode: string | null
    sku: string | null
    galleryImages: string[]
    description: string | null
    price: string
    offerPrice: string | null
    priceOnRequest: boolean
    stockStatus: 'in_stock' | 'made_to_order' | 'out_of_stock'
    stockQuantity: number | null
    categoryId: string | null
    imageUrl: string | null
    isActive: boolean
    isPublished: boolean
    variations?: VariationDraft[]
  }
}

export function ProductForm({ productId, categories, initial, canUseProductIdentifiers }: ProductFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [galleryImages, setGalleryImages] = useState<string[]>(initial?.galleryImages ?? [])
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true)
  const [priceOnRequest, setPriceOnRequest] = useState(initial?.priceOnRequest ?? false)
  const [priceInput, setPriceInput] = useState(initial ? Number(initial.price).toFixed(2).replace('.', ',') : '')
  const [offerPriceInput, setOfferPriceInput] = useState(initial?.offerPrice ? Number(initial.offerPrice).toFixed(2).replace('.', ',') : '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 'none')
  const [stockStatus, setStockStatus] = useState(initial?.stockStatus ?? 'in_stock')
  const [stockQuantity, setStockQuantity] = useState(initial?.stockQuantity?.toString() ?? '')
  const [categoryOptions, setCategoryOptions] = useState(categories)
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [variations, setVariations] = useState<VariationDraft[]>(initial?.variations ?? [])
  const [deleteOpen, setDeleteOpen] = useState(false)

  function createCategoryInline() {
    const name = newCategoryName.trim()
    if (!name) return

    startTransition(async () => {
      const result = await createCategoryAction({ name })
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      const created = { id: result.data?.id ?? '', name }
      if (!created.id) {
        toast.error('Categoria criada, mas não foi possível selecioná-la automaticamente.')
        return
      }
      setCategoryOptions((current) => [...current, created])
      setCategoryId(created.id)
      setNewCategoryName('')
      setAddingCategory(false)
      toast.success('Categoria criada e selecionada')
    })
  }

  function deleteCurrentProduct() {
    if (!productId) return
    setDeleteOpen(true)
  }

  function confirmDeleteProduct() {
    if (!productId) return
    startTransition(async () => {
      const result = await deleteProductAction(productId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setDeleteOpen(false)
      toast.success('Produto excluído')
      router.push('/painel/produtos')
      router.refresh()
    })
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const price = priceOnRequest ? (parsePriceInput(priceInput) ?? 0) : parsePriceInput(priceInput)
    const rawOfferPrice = priceOnRequest ? '' : offerPriceInput.trim()
    const offerPrice = rawOfferPrice ? parsePriceInput(rawOfferPrice) : null

    if (!priceOnRequest && price === null) {
      setErrors({ price: ['Informe um preço válido, por exemplo 49,90'] })
      return
    }
    if (rawOfferPrice && offerPrice === null) {
      setErrors({ offerPrice: ['Informe um valor de oferta válido'] })
      return
    }

    startTransition(async () => {
      const result = await saveProductAction(productId ?? null, {
        name: String(form.get('name') ?? ''),
        referenceCode: String(form.get('referenceCode') ?? ''),
        sku: String(form.get('sku') ?? ''),
        description: String(form.get('description') ?? ''),
        price,
        offerPrice,
        priceOnRequest,
        stockStatus,
        stockQuantity: stockQuantity.trim() ? Number(stockQuantity) : null,
        categoryId,
        imageUrl: imageUrl ?? '',
        galleryImages,
        isActive,
        isPublished,
        variations,
      })

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Produto salvo')
      if (!productId && result.data?.id) {
        router.replace(`/painel/produtos/${result.data.id}`)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-8 md:grid-cols-[26rem_1fr]" noValidate>
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <ImageUploader kind="product" label="Foto de capa" value={imageUrl} onChange={setImageUrl} />
          {errors.imageUrl?.[0] && <p role="alert" className="mt-2 px-1 text-xs text-destructive">{errors.imageUrl[0]}</p>}
        </div>
        <ProductGallery images={galleryImages} onChange={setGalleryImages} />
      </div>

      <div className="flex flex-col gap-5">
        <Field label="Nome do produto" htmlFor="name" required error={errors.name?.[0]}>
          <Input id="name" name="name" defaultValue={initial?.name} placeholder="Ex.: Moletom Midnight" aria-invalid={!!errors.name} />
        </Field>

        {canUseProductIdentifiers ? (
          <div className="grid grid-cols-2 gap-5">
            <Field label="REF" htmlFor="referenceCode">
              <Input id="referenceCode" name="referenceCode" defaultValue={initial?.referenceCode ?? ''} placeholder="Ex.: REF-001" />
            </Field>
            <Field label="SKU" htmlFor="sku">
              <Input id="sku" name="sku" defaultValue={initial?.sku ?? ''} placeholder="Ex.: CAM-PRE-M" />
            </Field>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4">
            <p className="text-sm text-muted-foreground">REF e SKU estão disponíveis no plano Pro.</p>
            <Link href="/painel/plano" className="text-sm font-medium underline underline-offset-4">Ver planos</Link>
          </div>
        )}

        <Field label="Descrição" htmlFor="description" error={errors.description?.[0]}>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description ?? ''}
            placeholder="Material, tamanhos, detalhes que ajudam o cliente a decidir"
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-3xl bg-muted p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Preço sob consulta</span>
              <span className="block text-xs text-muted-foreground">Ative para informar que o valor é “Sob consulta”.</span>
            </span>
            <Switch checked={priceOnRequest} onCheckedChange={setPriceOnRequest} aria-label="Preço sob consulta" />
          </label>
        </div>

        {!priceOnRequest && (
          <div className="grid grid-cols-2 gap-5">
            <Field label="Preço (R$)" htmlFor="price" required error={errors.price?.[0]}>
              <Input id="price" name="price" inputMode="decimal" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} placeholder="0,00" aria-invalid={!!errors.price} />
            </Field>
            <Field label={<span className="flex items-center gap-1">Oferta (opcional)<InfoTooltip>Informe um preço promocional menor que o preço original.</InfoTooltip></span>} htmlFor="offerPrice" error={errors.offerPrice?.[0]}>
              <Input id="offerPrice" name="offerPrice" inputMode="decimal" value={offerPriceInput} onChange={(event) => setOfferPriceInput(event.target.value)} placeholder="0,00" aria-invalid={!!errors.offerPrice} />
            </Field>
          </div>
        )}

        <Field label="Categoria" htmlFor="categoryId" error={errors.categoryId?.[0]}>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <NativeSelect id="categoryId" name="categoryId" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full min-w-0">
              <option value="none">Sem categoria</option>
              {categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </NativeSelect>
            <Button type="button" className="h-12 w-full min-w-0 px-3 sm:px-5" aria-label="Criar nova categoria" onClick={() => setAddingCategory((current) => !current)}><Plus aria-hidden="true" />Criar</Button>
          </div>
          {addingCategory && <div className="mt-2 flex items-center gap-2"><Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nome da categoria" aria-label="Nome da nova categoria" className="bg-background" /><Button type="button" size="sm" disabled={pending || newCategoryName.trim().length < 2} onClick={createCategoryInline}>Criar</Button></div>}
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Disponibilidade" htmlFor="stockStatus">
            <NativeSelect id="stockStatus" value={stockStatus} onChange={(event) => setStockStatus(event.target.value as typeof stockStatus)}>
              <option value="in_stock">Em estoque</option>
              <option value="made_to_order">Sob encomenda</option>
              <option value="out_of_stock">Fora de estoque</option>
            </NativeSelect>
          </Field>
          {stockStatus === 'in_stock' && (
            <Field label={<span className="flex items-center gap-1">Quantidade<InfoTooltip>Quantidade disponível para venda. Deixe vazio se não quiser controlar o estoque.</InfoTooltip></span>} htmlFor="stockQuantity">
              <Input id="stockQuantity" type="number" min={0} step={1} inputMode="numeric" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
            </Field>
          )}
        </div>

        <VariationBuilder value={variations} onChange={setVariations} showErrors={Boolean(errors.variations)} />

        <div className="flex flex-col gap-3 rounded-3xl bg-muted p-5">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium">Produto ativo</span>
              <span className="block text-xs text-muted-foreground">Desative para tirar da vitrine sem excluir.</span>
            </span>
            <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Produto ativo" />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {productId ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
          <Link href="/painel/produtos" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            <ArrowLeft aria-hidden="true" />
            Voltar
          </Link>
          {productId && <div className="basis-full flex justify-center border-t border-border pt-4"><Button type="button" variant="ghost" size="sm" onClick={deleteCurrentProduct}><Trash2 aria-hidden="true" />Excluir produto</Button></div>}
        </div>
      </div>
      </form>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este produto?</AlertDialogTitle>
            <AlertDialogDescription>O produto será removido da vitrine e não poderá ser recuperado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pending} onClick={confirmDeleteProduct}>Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
