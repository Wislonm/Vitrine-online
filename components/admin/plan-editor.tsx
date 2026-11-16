'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updatePlanAction } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
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
    price: string
    billingPeriod: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
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
    const price = parsePriceInput(String(form.get('price') ?? ''))
    if (price === null) {
      setErrors({ price: ['Informe um valor válido em reais.'] })
      return
    }
    startTransition(async () => {
      const result = await updatePlanAction({
        planId: plan.id,
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
        productLimit: Number(form.get('productLimit')),
        price,
        billingPeriod: String(form.get('billingPeriod')) as PlanEditorProps['plan']['billingPeriod'],
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor do plano (R$)" htmlFor={`price-${plan.id}`} required error={errors.price?.[0]}>
          <Input id={`price-${plan.id}`} name="price" inputMode="decimal" defaultValue={Number(plan.price).toFixed(2).replace('.', ',')} placeholder="0,00" className="bg-background" aria-invalid={!!errors.price} />
        </Field>
        <Field label="Periodicidade" htmlFor={`period-${plan.id}`}>
          <NativeSelect id={`period-${plan.id}`} name="billingPeriod" defaultValue={plan.billingPeriod} className="bg-background">
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="semiannual">Semestral</option>
            <option value="yearly">Anual</option>
          </NativeSelect>
        </Field>
      </div>
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

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-full bg-background px-5 py-3">
        <span className="text-sm font-medium">Plano disponível</span>
        <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Plano disponível" />
      </label>

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
