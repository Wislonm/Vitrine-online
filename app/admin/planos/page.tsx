import type { Metadata } from 'next'
import { PlanEditor } from '@/components/admin/plan-editor'
import { listPlans } from '@/lib/repositories/plans'

export const metadata: Metadata = { title: 'Planos' }

const featureLabels = {
  public_storefront: 'Vitrine pública',
  categories: 'Categorias',
  side_cart: 'Carrinho lateral',
  whatsapp_orders: 'Pedidos pelo WhatsApp',
  hero_customization: 'Personalização do cabeçalho',
  seller_panel: 'Painel do vendedor',
  custom_domain: 'Domínio personalizado',
}

export default async function AdminPlansPage() {
  const allPlans = await listPlans()
  const plans = allPlans.filter((plan) => plan.isActive || plan.slug === 'trial-default')

  return (
    <>
      <h1 className="mb-2 text-3xl font-semibold sm:text-4xl">Planos</h1>
      <p className="mb-8 max-w-xl text-muted-foreground">
        Configure os 7 dias do plano de degustação e o valor e a periodicidade do Pro. O plano de degustação é interno e não aparece como opção de compra.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PlanEditor
            key={plan.id}
            featureLabels={featureLabels}
            plan={{
              id: plan.id,
              slug: plan.slug,
              name: plan.name,
              description: plan.description,
              productLimit: plan.productLimit,
              trialDays: plan.trialDays,
              price: plan.price,
              billingPeriod: plan.billingPeriod as 'monthly' | 'quarterly' | 'semiannual' | 'yearly',
              isActive: plan.isActive,
              features: plan.features as Record<string, boolean | undefined>,
            }}
          />
        ))}
      </div>
    </>
  )
}
