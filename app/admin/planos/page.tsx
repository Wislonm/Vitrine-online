import type { Metadata } from 'next'
import { PlanEditor } from '@/components/admin/plan-editor'
import { listPlans } from '@/lib/repositories/plans'

export const metadata: Metadata = { title: 'Planos' }

export default async function AdminPlansPage() {
  const allPlans = await listPlans()
  const plans = allPlans.filter((plan) => plan.isActive || plan.slug === 'trial-default')

  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold sm:text-4xl">Planos</h1>
      <p className="mb-8 max-w-xl text-muted-foreground">
        Configure o período de degustação e os preços mensal, semestral e anual do Pro. Períodos sem valor não aparecem no checkout. O plano de degustação é interno e não aparece como opção de compra.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanEditor
            key={plan.id}
            plan={{
              id: plan.id,
              slug: plan.slug,
              name: plan.name,
              description: plan.description,
              productLimit: plan.productLimit,
              trialDays: plan.trialDays,
              price: plan.price,
              monthlyPrice: plan.monthlyPrice,
              semiannualPrice: plan.semiannualPrice,
              annualPrice: plan.annualPrice,
              isActive: plan.isActive,
              features: plan.features,
            }}
          />
        ))}
      </div>
    </>
  )
}
