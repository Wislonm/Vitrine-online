import { Benefits } from '@/components/landing/benefits'
import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Plans } from '@/components/landing/plans'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { listPlans } from '@/lib/repositories/plans'

export const revalidate = 60

export default async function LandingPage() {
  const plans = await listPlans({ onlyActive: true })

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Benefits />
        <HowItWorks />
        <Plans plans={plans} />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
