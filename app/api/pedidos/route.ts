import { NextResponse, type NextRequest } from 'next/server'
import { orderSchema } from '@/lib/validators'
import { placeOrder } from '@/lib/services/order-service'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!rateLimit(`order:${ip}`, { limit: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Dados do pedido inválidos.' },
      { status: 400 },
    )
  }

  try {
    const result = await placeOrder({
      slug: parsed.data.slug,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      notes: parsed.data.notes,
      items: parsed.data.items,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ whatsappUrl: result.whatsappUrl, orderId: result.orderId })
  } catch (error) {
    console.error('[pedidos] erro', error)
    return NextResponse.json({ error: 'Não foi possível registrar o pedido.' }, { status: 500 })
  }
}
