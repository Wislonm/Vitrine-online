import { Benefits } from '@/components/landing/benefits'
import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Plans } from '@/components/landing/plans'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { listPlans } from '@/lib/repositories/plans'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'

export const revalidate = 60

const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo-minhavitrine.svg`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

export default async function LandingPage() {
  const allPlans = await listPlans()
  const trialDays = allPlans.find((plan) => plan.slug === 'trial-default')?.trialDays ?? 7
  const plans = allPlans.filter((plan) => plan.isActive || plan.slug === 'trial-default')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c') }}
      />
      <SiteHeader />
      <main>
        <Hero trialDays={trialDays} />
        <Benefits />
        <HowItWorks />
        <Plans plans={plans} trialDays={trialDays} />
        <Faq trialDays={trialDays} />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
