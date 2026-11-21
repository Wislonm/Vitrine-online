import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Domínio personalizado' }

export default function CustomDomainPage() {
  redirect('/painel/perfil#dominio')
}
