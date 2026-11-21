import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Outfit } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { SHARE_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/seo'
import './globals.css'

const heading = Outfit({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })
const body = Geist({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: '%s | Minha Vitrine',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'vitrine online',
    'vitrine digital',
    'loja online para revendedores',
    'catálogo digital',
    'vender pelo WhatsApp',
    'pedidos pelo WhatsApp',
    'loja virtual sem taxa por venda',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Sua vitrine online. Pedidos no WhatsApp.',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: SHARE_IMAGE, width: 1376, height: 768, alt: 'Minha Vitrine: vitrine online e pedidos pelo WhatsApp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sua vitrine online. Pedidos no WhatsApp.',
    description: SITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  icons: {
    icon: '/favicon.png',
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
