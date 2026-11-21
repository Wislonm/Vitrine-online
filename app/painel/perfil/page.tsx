import type { Metadata } from 'next'
import { PageHeader } from '@/components/panel/page-header'
import { ProfileForm } from '@/components/panel/profile-form'
import { getStoreSettings } from '@/lib/repositories/stores'
import { getStoreDomainForStore } from '@/lib/repositories/store-domains'
import { getPlanForStore } from '@/lib/repositories/plans'
import { requireSellerContext } from '@/lib/session'
import { getBaseUrl } from '@/lib/url'

export const metadata: Metadata = { title: 'Meu perfil' }

export default async function ProfilePage() {
  const { user, store } = await requireSellerContext()
  const [settings, baseUrl, domain, planRow] = await Promise.all([
    getStoreSettings(store.id),
    getBaseUrl(),
    getStoreDomainForStore(store.id),
    getPlanForStore(store.id),
  ])
  const social = settings?.socialLinks ?? {}

  return (
    <>
      <PageHeader title="Meu perfil" description="Gerencie os dados da loja, o endereço da vitrine e os contatos exibidos ao público." />
      <ProfileForm
        baseHost={baseUrl.replace(/^https?:\/\//, '')}
        initialDomain={domain ?? null}
        hasCustomDomainFeature={Boolean(planRow?.plan.isActive && planRow.plan.features?.custom_domain)}
        isProduction={process.env.VERCEL_ENV === 'production'}
        hasVercelToken={Boolean(process.env.VERCEL_API_TOKEN?.trim())}
        initial={{
          ownerName: user.name,
          name: store.name,
          slug: store.slug,
          description: store.description ?? '',
          whatsapp: store.whatsapp ?? '',
          phone: store.phone ?? '',
          contactEmail: store.contactEmail ?? '',
          address: store.address ?? '',
          city: store.city ?? '',
          state: store.state ?? '',
          instagram: social.instagram ?? '',
          facebook: social.facebook ?? '',
          tiktok: social.tiktok ?? '',
          website: social.website ?? '',
        }}
      />
    </>
  )
}
