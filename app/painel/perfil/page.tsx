import type { Metadata } from 'next'
import { PageHeader } from '@/components/panel/page-header'
import { ProfileForm } from '@/components/panel/profile-form'
import { getStoreSettings } from '@/lib/repositories/stores'
import { requireSellerContext } from '@/lib/session'
import { getBaseUrl } from '@/lib/url'

export const metadata: Metadata = { title: 'Meu perfil' }

export default async function ProfilePage() {
  const { user, store } = await requireSellerContext()
  const [settings, baseUrl] = await Promise.all([getStoreSettings(store.id), getBaseUrl()])
  const social = settings?.socialLinks ?? {}

  return (
    <>
      <PageHeader title="Meu perfil" description="Estas informações aparecem no rodapé da sua vitrine. Campos vazios ficam ocultos." />
      <ProfileForm
        baseHost={baseUrl.replace(/^https?:\/\//, '')}
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
