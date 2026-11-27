'use client'

import { useState, useTransition } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { updatePlanAction } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { parsePriceInput, slugify } from '@/lib/format'
import { getPlanDisplayFeatures, PLAN_FEATURE_ICON_OPTIONS } from '@/lib/plan-features'
import { PlanFeatureIcon } from '@/components/plan-feature-icon'
import type { PlanDisplayFeature, PlanFeatures } from '@/lib/db/schema'
import type { FieldErrors } from '@/lib/validators'

type PlanEditorProps = {
  plan: {
    id: string
    slug: string
    name: string
    description: string | null
    productLimit: number
    trialDays: number
    price: string
    monthlyPrice: string | null
    semiannualPrice: string | null
    annualPrice: string | null
    isActive: boolean
    features: PlanFeatures
  }
}

export function PlanEditor({ plan }: PlanEditorProps) {
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isActive, setIsActive] = useState(plan.isActive)
  const [isPermanentFree, setIsPermanentFree] = useState(plan.slug === 'trial-default' && plan.trialDays === 0)
  const [trialDaysInput, setTrialDaysInput] = useState(String(plan.trialDays > 0 ? plan.trialDays : 7))
  const [featureItems, setFeatureItems] = useState<PlanDisplayFeature[]>(() => getPlanDisplayFeatures(plan.slug, plan.features))

  function updateFeatureItem(id: string, updates: Partial<PlanDisplayFeature>) {
    setFeatureItems((current) => current.map((feature) => feature.id === id ? { ...feature, ...updates } : feature))
    setErrors((current) => ({ ...current, displayFeatures: undefined }))
  }

  function updateFeatureLabel(id: string, label: string) {
    setFeatureItems((current) => current.map((feature) => feature.id === id
      ? { ...feature, label, key: feature.systemKey ? feature.key : feature.key || slugify(label) }
      : feature))
    setErrors((current) => ({ ...current, displayFeatures: undefined }))
  }

  function addFeatureItem() {
    const id = crypto.randomUUID()
    setFeatureItems((current) => [...current, { id, key: '', label: '', icon: 'sparkles', enabled: true, systemKey: null }])
  }

  function removeFeatureItem(id: string) {
    setFeatureItems((current) => current.filter((feature) => feature.id !== id))
    setErrors((current) => ({ ...current, displayFeatures: undefined }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const isTrial = plan.slug === 'trial-default'
    const trialDays = isTrial && !isPermanentFree ? Number(trialDaysInput) : 0
    const monthlyPrice = isTrial ? 0 : parsePriceInput(String(form.get('monthlyPrice') ?? ''))
    const semiannualRaw = String(form.get('semiannualPrice') ?? '').trim()
    const annualRaw = String(form.get('annualPrice') ?? '').trim()
    const semiannualPrice = isTrial || !semiannualRaw ? null : parsePriceInput(semiannualRaw)
    const annualPrice = isTrial || !annualRaw ? null : parsePriceInput(annualRaw)
    const displayFeatures = featureItems.map((feature) => ({
      ...feature,
      key: feature.systemKey ?? (feature.key || slugify(feature.label)),
      label: feature.label.trim(),
    }))
    const featureKeys = displayFeatures.map((feature) => feature.key)
    const featureNameKeys = displayFeatures.map((feature) => slugify(feature.label))
    const priceErrors: FieldErrors = {}
    if (
      displayFeatures.some((feature) => !feature.label || !feature.key) ||
      new Set(featureKeys).size !== featureKeys.length ||
      new Set(featureNameKeys).size !== featureNameKeys.length
    ) {
      priceErrors.displayFeatures = ['Preencha cada recurso e use um nome único em cada plano.']
    }
    if (isTrial && !isPermanentFree && (!Number.isInteger(trialDays) || trialDays < 1 || trialDays > 365)) {
      priceErrors.trialDays = ['Informe de 1 a 365 dias ou escolha o acesso permanente.']
    }
    if (monthlyPrice === null) priceErrors.monthlyPrice = ['Informe um valor mensal válido em reais.']
    if (semiannualRaw && semiannualPrice === null) priceErrors.semiannualPrice = ['Informe um valor semestral válido em reais.']
    if (annualRaw && annualPrice === null) priceErrors.annualPrice = ['Informe um valor anual válido em reais.']
    if (Object.keys(priceErrors).length > 0) {
      setErrors(priceErrors)
      return
    }

    startTransition(async () => {
      const result = await updatePlanAction({
        planId: plan.id,
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
        productLimit: Number(form.get('productLimit')),
        trialDays,
        monthlyPrice,
        semiannualPrice,
        annualPrice,
        displayFeatures,
        isActive,
      })
      if (result.ok) {
        setErrors({})
        toast.success(result.message ?? 'Plano atualizado')
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-[2rem] bg-muted p-6 sm:p-8" noValidate>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{plan.name}</h2>
        <code className="rounded-full bg-background px-3 py-1 text-xs">{plan.slug}</code>
      </div>

      <Field label="Nome" htmlFor={`name-${plan.id}`} error={errors.name?.[0]}>
        <Input id={`name-${plan.id}`} name="name" defaultValue={plan.name} className="bg-background" />
      </Field>
      <Field label="Descrição" htmlFor={`description-${plan.id}`} error={errors.description?.[0]}>
        <Input id={`description-${plan.id}`} name="description" defaultValue={plan.description ?? ''} className="bg-background" />
      </Field>
      {plan.slug === 'trial-default' ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-background p-4">
            <div className="flex flex-col gap-1">
              <label htmlFor={`permanent-free-${plan.id}`} className="text-sm font-medium">Gratuito permanente</label>
              <p className="text-xs leading-relaxed text-muted-foreground">Sem data de expiração para novas contas.</p>
            </div>
            <Switch id={`permanent-free-${plan.id}`} checked={isPermanentFree} onCheckedChange={setIsPermanentFree} aria-label="Gratuito permanente" />
          </div>
          {isPermanentFree ? (
            <p className="rounded-2xl bg-background p-4 text-sm leading-relaxed text-muted-foreground">
              Novas contas permanecem no plano gratuito sem expiração. Contas existentes mantêm a data já registrada.
            </p>
          ) : (
            <Field label="Período de degustação (dias)" htmlFor={`trial-days-${plan.id}`} required error={errors.trialDays?.[0]}>
              <Input
                id={`trial-days-${plan.id}`}
                name="trialDays"
                type="number"
                min={1}
                max={365}
                value={trialDaysInput}
                onChange={(event) => setTrialDaysInput(event.target.value)}
                className="bg-background"
                aria-invalid={!!errors.trialDays}
              />
            </Field>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Mensal (R$)" htmlFor={`monthly-price-${plan.id}`} required error={errors.monthlyPrice?.[0]}>
              <Input id={`monthly-price-${plan.id}`} name="monthlyPrice" inputMode="decimal" defaultValue={Number(plan.monthlyPrice ?? plan.price).toFixed(2).replace('.', ',')} placeholder="0,00" className="bg-background" aria-invalid={!!errors.monthlyPrice} />
            </Field>
            <Field label="Semestral (R$)" htmlFor={`semiannual-price-${plan.id}`} hint="Deixe vazio para não oferecer." error={errors.semiannualPrice?.[0]}>
              <Input id={`semiannual-price-${plan.id}`} name="semiannualPrice" inputMode="decimal" defaultValue={plan.semiannualPrice === null ? '' : Number(plan.semiannualPrice).toFixed(2).replace('.', ',')} placeholder="0,00" className="bg-background" aria-invalid={!!errors.semiannualPrice} />
            </Field>
            <Field label="Anual (R$)" htmlFor={`annual-price-${plan.id}`} hint="Deixe vazio para não oferecer." error={errors.annualPrice?.[0]}>
              <Input id={`annual-price-${plan.id}`} name="annualPrice" inputMode="decimal" defaultValue={plan.annualPrice === null ? '' : Number(plan.annualPrice).toFixed(2).replace('.', ',')} placeholder="0,00" className="bg-background" aria-invalid={!!errors.annualPrice} />
            </Field>
          </div>
          <input type="hidden" name="trialDays" value="0" />
        </>
      )}
      <Field label="Limite de produtos" htmlFor={`limit-${plan.id}`} error={errors.productLimit?.[0]}>
        <Input
          id={`limit-${plan.id}`}
          name="productLimit"
          type="number"
          min={0}
          max={100000}
          defaultValue={plan.productLimit}
          className="bg-background"
        />
      </Field>

      {plan.slug === 'trial-default' ? (
        <p className="rounded-2xl bg-background p-4 text-sm leading-relaxed text-muted-foreground">Plano interno aplicado automaticamente a novas contas. Não aparece como opção de compra.</p>
      ) : (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-full bg-background px-5 py-3">
          <span className="text-sm font-medium">Plano disponível</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Plano disponível" />
        </label>
      )}

      <fieldset className="flex flex-col gap-4 rounded-3xl bg-background p-5">
        <legend className="sr-only">Recursos do plano</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Recursos habilitados</h3>
            <p className="mt-1 text-xs text-muted-foreground">Defina o nome, o ícone e se cada recurso está incluído neste plano.</p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={featureItems.length >= 30} onClick={addFeatureItem}>
            <Plus aria-hidden="true" />Adicionar recurso
          </Button>
        </div>

        {featureItems.map((feature, index) => (
          <div key={feature.id} className="grid min-w-0 gap-3 rounded-2xl bg-muted p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Recurso" htmlFor={`feature-label-${plan.id}-${feature.id}`}>
                <Input
                  id={`feature-label-${plan.id}-${feature.id}`}
                  value={feature.label}
                  onChange={(event) => updateFeatureLabel(feature.id, event.target.value)
                  placeholder="Nome do recurso"
                  className="bg-background"
                  maxLength={120}
                  aria-invalid={Boolean(errors.displayFeatures?.[0] && !feature.label.trim())}
                />
              </Field>
            </div>
            <Field label="Ícone" htmlFor={`feature-icon-${plan.id}-${feature.id}`}>
              <div className="flex min-w-0 items-center gap-2">
                <NativeSelect
                  id={`feature-icon-${plan.id}-${feature.id}`}
                  value={feature.icon}
                  className="min-w-0 flex-1 bg-background"
                  onChange={(event) => updateFeatureItem(feature.id, { icon: event.target.value as PlanDisplayFeature['icon'] })}
                >
                  {PLAN_FEATURE_ICON_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </NativeSelect>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background">
                  <PlanFeatureIcon name={feature.icon} className="size-4" />
                </span>
              </div>
            </Field>
            <Field label="Disponibilidade" htmlFor={`feature-enabled-${plan.id}-${feature.id}`}>
              <div className="flex min-w-0 items-center gap-2">
                <NativeSelect
                  id={`feature-enabled-${plan.id}-${feature.id}`}
                  value={feature.enabled ? 'enabled' : 'disabled'}
                  className="min-w-0 flex-1 bg-background"
                  onChange={(event) => updateFeatureItem(feature.id, { enabled: event.target.value === 'enabled' })}
                >
                  <option value="enabled">Incluído</option>
                  <option value="disabled">Não incluído</option>
                </NativeSelect>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover recurso ${feature.label || index + 1}`}
                  onClick={() => removeFeatureItem(feature.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </Field>
          </div>
        ))}
        {errors.displayFeatures?.[0] && <p role="alert" className="text-sm text-destructive">{errors.displayFeatures[0]}</p>}
      </fieldset>

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Salvar plano
        </Button>
      </div>
    </form>
  )
}
