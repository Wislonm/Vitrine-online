'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updatePlanAction } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { parsePriceInput } from '@/lib/format'
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
    features: Record<string, boolean | undefined>
  }
  featureLabels: Record<string, string>
}

export function PlanEditor({ plan, featureLabels }: PlanEditorProps) {
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isActive, setIsActive] = useState(plan.isActive)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const isTrial = plan.slug === 'trial-default'
    const monthlyPrice = isTrial ? 0 : parsePriceInput(String(form.get('monthlyPrice') ?? ''))
    const semiannualRaw = String(form.get('semiannualPrice') ?? '').trim()
    const annualRaw = String(form.get('annualPrice') ?? '').trim()
    const semiannualPrice = isTrial || !semiannualRaw ? null : parsePriceInput(semiannualRaw)
    const annualPrice = isTrial || !annualRaw ? null : parsePriceInput(annualRaw)
    const priceErrors: FieldErrors = {}
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
        trialDays: isTrial ? Number(form.get('trialDays')) : 0,
        monthlyPrice,
        semiannualPrice,
        annualPrice,
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
        <Field label="Período de degustação (dias)" htmlFor={`trial-days-${plan.id}`} required error={errors.trialDays?.[0]}>
          <Input id={`trial-days-${plan.id}`} name="trialDays" type="number" min={1} max={365} defaultValue={plan.trialDays} className="bg-background" aria-invalid={!!errors.trialDays} />
        </Field>
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

      <div>
        <p className="mb-2 px-1 text-sm font-medium">Recursos habilitados</p>
        <ul className="flex flex-wrap gap-2">
          {Object.entries(featureLabels).map(([key, label]) => (
            <li
              key={key}
              className={
                plan.features[key]
                  ? 'rounded-full bg-sage px-3 py-1 text-xs text-sage-foreground'
                  : 'rounded-full bg-background px-3 py-1 text-xs text-muted-foreground line-through'
              }
            >
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Salvar plano
        </Button>
      </div>
    </form>
  )
}
