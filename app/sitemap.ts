import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/termos`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacidade`, lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
