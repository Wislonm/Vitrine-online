import type { Metadata } from 'next'
import { CustomDomainManager } from '@/components/panel/custom-domain-manager'
import { PageHeader } from '@/components/panel/page-header'
import { getStoreDomainForStore } from '@/lib/repositories/store-domains'
import { getPlanForStore } from '@/lib/repositories/plans'
import { requireSellerContext } from '@/lib/session'

export const metadata: Metadata = { title: 'Domínio personalizado' }

export default async function CustomDomainPage() {
  const { store, subscriptionExpired } = await requireSellerContext({ allowExpiredPlan: true })
  const [planRow, domain] = await Promise.all([
    getPlanForStore(store.id),
    getStoreDomainForStore(store.id),
  ])

  return (
    <>
      <PageHeader
        title="Domínio personalizado"
        description="Conecte o domínio da sua marca à vitrine. O endereço com www também será aceito."
      />
      <CustomDomainManager
        initialDomain={domain ?? null}
        hasFeature={Boolean(planRow?.plan.isActive && planRow.plan.features?.custom_domain) && !subscriptionExpired}
        isProduction={process.env.VERCEL_ENV === 'production'}
        hasVercelToken={Boolean(process.env.VERCEL_API_TOKEN?.trim())}
      />
    </>
  )
}
