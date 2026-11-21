import { NextResponse, type NextRequest } from 'next/server'
import { resolveCustomDomainHost } from '@/lib/services/custom-domains'

const PLATFORM_HOSTS = new Set(['minhavitrine.shop', 'www.minhavitrine.shop', 'localhost', '127.0.0.1'])

function isPlatformHost(hostname: string) {
  if (PLATFORM_HOSTS.has(hostname) || hostname.endsWith('.vercel.app')) return true
  const vercelHosts = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase().split(':')[0])
  return vercelHosts.includes(hostname)
}

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-store-domain')

  const hostname = request.nextUrl.hostname.toLowerCase().replace(/\.$/, '')
  if (isPlatformHost(hostname)) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  let storeDomain: Awaited<ReturnType<typeof resolveCustomDomainHost>>
  try {
    storeDomain = await resolveCustomDomainHost(hostname)
  } catch {
    return new NextResponse('A vitrine está temporariamente indisponível.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  if (!storeDomain) return NextResponse.rewrite(new URL('/not-found', request.url))

  let publicPath = request.nextUrl.pathname
  const slugPath = `/${storeDomain.slug}`
  if (publicPath === slugPath || publicPath === `${slugPath}/`) {
    publicPath = '/'
  } else if (publicPath.startsWith(`${slugPath}/`)) {
    publicPath = publicPath.slice(slugPath.length)
  }

  if (!storeDomain.canUseCustomDomain) {
    const platformUrl = new URL(`/${storeDomain.slug}${publicPath === '/' ? '' : publicPath}`, 'https://minhavitrine.shop')
    platformUrl.search = request.nextUrl.search
    return NextResponse.redirect(platformUrl, 308)
  }

  if (hostname !== storeDomain.domain || publicPath !== request.nextUrl.pathname) {
    const canonicalUrl = request.nextUrl.clone()
    canonicalUrl.hostname = storeDomain.domain
    canonicalUrl.pathname = publicPath
    return NextResponse.redirect(canonicalUrl, 308)
  }

  requestHeaders.set('x-store-domain', storeDomain.domain)
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = `/${storeDomain.slug}${publicPath === '/' ? '' : publicPath}`
  return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next/static|_next/image|favicon\\.png|favicon\\.ico|share-cover\\.jpg|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)',
  ],
}
