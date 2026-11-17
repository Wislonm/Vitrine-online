import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const heading = Outfit({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })
const body = Geist({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL('https://minhavitrine.shop'),
  applicationName: 'Minha Vitrine',
  title: {
    default: 'Minha Vitrine | Sua loja online pelo WhatsApp',
    template: '%s | Minha Vitrine',
  },
  description:
    'Crie sua vitrine digital, cadastre produtos e receba pedidos organizados direto no seu WhatsApp. Para revendedores, representantes e vendedores independentes.',
  generator: 'v0.app',
  openGraph: {
    siteName: 'Minha Vitrine',
    locale: 'pt_BR',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <footer className="border-t border-border bg-background px-5 pt-5 pb-24 text-center text-xs text-muted-foreground sm:pb-5">
          <p>
            Desenvolvido por{' '}
            <a href="https://uitech.com.br" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
              UItech
            </a>
          </p>
        </footer>
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
