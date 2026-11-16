import type { Metadata } from 'next'
import { MercadoPagoSettingsForm } from '@/components/admin/mercadopago-settings-form'
import { getMercadoPagoSettingsForAdmin } from '@/lib/repositories/payment-settings'

export const metadata: Metadata = { title: 'Configuração Mercado Pago' }

export default async function MercadoPagoSettingsPage() {
  const settings = await getMercadoPagoSettingsForAdmin()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Mercado Pago</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Configure o ambiente e as credenciais que serão usadas pelo checkout dos planos.</p>
      </div>
      <MercadoPagoSettingsForm settings={settings} />
    </div>
  )
}
