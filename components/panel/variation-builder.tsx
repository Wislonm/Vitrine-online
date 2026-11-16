'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ImageUploader } from '@/components/panel/image-uploader'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export type VariationDraft = {
  id?: string
  name: string
  kind: 'color' | 'size' | 'custom'
  selectorType: 'text' | 'color' | 'number' | 'image'
  displayOnCard: boolean
  position: number
  options: { label: string; value: string; colorValue?: string | null; imageUrl?: string | null }[]
}

const defaultNames = { color: 'Cores', size: 'Tamanhos', custom: '' }
const selectorFor = { color: 'color', size: 'text', custom: 'text' } as const

export function VariationBuilder({
  value,
  onChange,
  showErrors = false,
}: {
  value: VariationDraft[]
  onChange: (value: VariationDraft[]) => void
  showErrors?: boolean
}) {
  const [customKind, setCustomKind] = useState('')
  const [customSelector, setCustomSelector] = useState<VariationDraft['selectorType']>('text')
  const [customOpen, setCustomOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({})
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)
  const [enabled, setEnabled] = useState(value.length > 0)

  function add(kind: VariationDraft['kind']) {
    if (value.length >= 3) return
    onChange([...value, { name: defaultNames[kind], kind, selectorType: selectorFor[kind], displayOnCard: false, position: value.length, options: [] }])
  }

  function update(index: number, patch: Partial<VariationDraft>) {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function remove(index: number) {
    setDeletingIndex(index)
  }

  function confirmRemove() {
    if (deletingIndex === null) return
    onChange(value.filter((_, i) => i !== deletingIndex).map((item, i) => ({ ...item, position: i })))
    setDeletingIndex(null)
  }

  function addOption(index: number) {
    const variation = value[index]
    update(index, { options: [...variation.options, { label: '', value: '', colorValue: variation.selectorType === 'color' ? '#111111' : null }] })
  }

  function editOption(index: number, optionIndex: number, patch: Partial<VariationDraft['options'][number]>) {
    update(index, { options: value[index].options.map((option, i) => (i === optionIndex ? { ...option, ...patch } : option)) })
  }

  function removeOption(index: number, optionIndex: number) {
    update(index, { options: value[index].options.filter((_, i) => i !== optionIndex) })
  }

  function toggleDisplayOnCard(index: number, checked: boolean) {
    if (!checked) {
      update(index, { displayOnCard: false })
      return
    }

    const alreadyDisplayed = value.find((variation, variationIndex) => variationIndex !== index && variation.displayOnCard)
    if (alreadyDisplayed) {
      toast.error(`Desmarque “${alreadyDisplayed.name || 'a outra variação'}” antes de exibir esta variação no card.`)
      return
    }
    update(index, { displayOnCard: true })
  }

  function addCustom() {
    const name = customKind.trim()
    if (!name || value.length >= 3) return
    onChange([...value, { name, kind: 'custom', selectorType: customSelector, displayOnCard: false, position: value.length, options: [] }])
    setCustomKind('')
    setCustomSelector('text')
    setCustomOpen(false)
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-muted p-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-background px-4 py-3">
        <div>
          <h2 className="font-display text-base font-semibold">Ativar opções</h2>
          <p className="mt-1 text-sm text-muted-foreground">Defina até 3 opções de cores, tamanhos e outras opções.</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            setEnabled(checked)
            if (!checked) onChange([])
          }}
          aria-label="Ativar opções de produto"
        />
      </div>

      {enabled && <>
      {value.map((variation, index) => {
        const invalidName = showErrors && !variation.name.trim()
        const invalidOptions = showErrors && variation.options.length === 0
        const isCollapsed = collapsed[index] ?? false
        return (
          <div key={variation.id ?? index} className="flex flex-col gap-4 rounded-2xl bg-background p-4">
            <div className="flex items-start gap-2">
              <GripVertical className="mt-3 size-4 text-muted-foreground" aria-hidden="true" />
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Input
                    value={variation.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                    placeholder="Nome da variação"
                    aria-label="Nome da variação"
                    aria-invalid={invalidName}
                    className={invalidName ? 'border-destructive ring-2 ring-destructive/20' : undefined}
                  />
                  {invalidName && <p className="px-1 text-xs text-destructive">Informe o nome da variação.</p>}
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setCollapsed((current) => ({ ...current, [index]: !isCollapsed }))} aria-label={isCollapsed ? 'Expandir variação' : 'Recolher variação'} title={isCollapsed ? 'Expandir variação' : 'Recolher variação'}>
                {isCollapsed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label={`Remover variação ${variation.name || index + 1}`}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>

            {!isCollapsed && <>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
              <span className="text-sm">Exibir na lista de produtos</span>
              <Switch checked={variation.displayOnCard} onCheckedChange={(checked) => toggleDisplayOnCard(index, checked)} aria-label="Exibir no card" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Opções de {variation.name || 'variação'}</p>
              {variation.options.map((option, optionIndex) => {
                const invalidOption = showErrors && !option.label.trim()
                return (
                  <div key={optionIndex} className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        value={option.label}
                        onChange={(e) => editOption(index, optionIndex, { label: e.target.value, value: e.target.value })}
                        placeholder={variation.kind === 'size' ? 'Ex.: M' : 'Nome da opção'}
                        aria-label="Nome da opção"
                        aria-invalid={invalidOption}
                        className={invalidOption ? 'border-destructive ring-2 ring-destructive/20' : undefined}
                      />
                    </div>
                    {variation.selectorType === 'color' && <input type="color" value={option.colorValue ?? '#111111'} onChange={(e) => editOption(index, optionIndex, { colorValue: e.target.value })} className="size-10 cursor-pointer rounded-lg border-0 bg-transparent" aria-label="Cor da opção" />}
                    {variation.selectorType === 'number' && <Input type="number" value={option.value} onChange={(e) => editOption(index, optionIndex, { value: e.target.value })} placeholder="Número" aria-label="Número da opção" />}
                    {variation.selectorType === 'image' && (
                      <ImageUploader
                        kind="product"
                        label="Textura"
                        value={option.imageUrl ?? null}
                        onChange={(url) => editOption(index, optionIndex, { imageUrl: url })}
                        compact
                      />
                    )}
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeOption(index, optionIndex)} aria-label={`Remover opção ${option.label || optionIndex + 1}`}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )
              })}
              {invalidOptions && <p className="px-1 text-xs text-destructive">Adicione pelo menos uma opção.</p>}
              <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                <Plus aria-hidden="true" />Adicionar opção
              </Button>
            </div>
            </>}
          </div>
        )
      })}

      {value.length < 3 && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" onClick={() => add('color')}>+ Cores</Button>
          <Button type="button" size="sm" onClick={() => add('size')}>+ Tamanhos</Button>
          {!customOpen ? (
            <Button type="button" size="sm" onClick={() => setCustomOpen(true)}>+ Personalizada</Button>
          ) : (
            <div className="grid w-full gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <Input value={customKind} onChange={(e) => setCustomKind(e.target.value)} placeholder="Nome da variação" aria-label="Nome da variação personalizada" className="border-border bg-background" />
              <NativeSelect value={customSelector} onChange={(e) => setCustomSelector(e.target.value as VariationDraft['selectorType'])} aria-label="Tipo de seletor personalizado">
                <option value="text">Texto livre</option><option value="color">Colorpick</option><option value="number">Número</option><option value="image">Imagem</option>
              </NativeSelect>
              <Button type="button" variant="secondary" size="sm" disabled={!customKind.trim()} onClick={addCustom}>Adicionar</Button>
            </div>
          )}
        </div>
      )}
      </>}

      <AlertDialog open={deletingIndex !== null} onOpenChange={(open) => !open && setDeletingIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta variação?</AlertDialogTitle>
            <AlertDialogDescription>As opções dessa variação também serão removidas do produto.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={confirmRemove}>Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
