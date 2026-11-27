import { PlanEditor } from '@/components/admin/plan-editor'

export default function PlanFeaturesPreviewPage() {
  return (
    <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-2">
      <PlanEditor
        plan={{ id: 'trial-preview', slug: 'trial-default', name: 'Gratuito', description: 'Acesso gratuito para novas contas.', productLimit: 200, trialDays: 30, price: '0.00', monthlyPrice: '0.00', semiannualPrice: null, annualPrice: null, isActive: false, features: {} }}
      />
      <PlanEditor
        plan={{ id: 'pro-preview', slug: 'business', name: 'Plano Pro', description: 'Plano completo.', productLimit: 1000, trialDays: 0, price: '25.00', monthlyPrice: '25.00', semiannualPrice: '120.00', annualPrice: null, isActive: true, features: { custom_domain: true, product_identifiers: true } }}
      />
    </main>
  )
}
