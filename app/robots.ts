import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/painel', '/admin', '/api', '/login', '/cadastro', '/recuperar-senha', '/redefinir-senha'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
