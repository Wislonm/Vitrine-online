import { NextResponse, type NextRequest } from 'next/server'
import { isSlugTaken } from '@/lib/repositories/stores'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { slugSchema } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const rawSlug = request.nextUrl.searchParams.get('slug') ?? ''
    const parsed = slugSchema.safeParse(rawSlug)
    if (!parsed.success) {
      return NextResponse.json({ slug: rawSlug, available: false, reason: 'invalid' }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const { store } = await getSellerContextOrThrow()
    const taken = await isSlugTaken(parsed.data, store.id)
    return NextResponse.json({ slug: parsed.data, available: !taken, reason: taken ? 'taken' : undefined }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Sua sessão expirou. Entre novamente.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('[store] slug availability', error)
    return NextResponse.json({ error: 'Não foi possível verificar o endereço agora.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
