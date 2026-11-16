import { formatBRL, normalizeWhatsapp } from '@/lib/format'

export type WhatsappOrderItem = {
  name: string
  referenceCode?: string | null
  sku?: string | null
  quantity: number
  unitPrice: number
  subtotal: number
  variations?: { name: string; option: string }[]
}

export type WhatsappOrderInput = {
  storeName: string
  customerName: string
  customerPhone?: string | null
  notes?: string | null
  items: WhatsappOrderItem[]
  total: number
}

export function buildOrderMessage(order: WhatsappOrderInput) {
  const lines: string[] = []
  lines.push(`NOVO PEDIDO - ${order.storeName.toUpperCase()}`)
  lines.push('')
  lines.push(`Cliente: ${order.customerName}`)
  if (order.customerPhone) lines.push(`Telefone: ${order.customerPhone}`)
  lines.push('')
  lines.push('PRODUTOS:')
  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name}`)
    if (item.referenceCode || item.sku) {
      lines.push([item.referenceCode ? `REF: ${item.referenceCode}` : null, item.sku ? `SKU: ${item.sku}` : null].filter(Boolean).join(' · '))
    }
    lines.push(`Quantidade: ${item.quantity}`)
    item.variations?.forEach((variation) => lines.push(`${variation.name}: ${variation.option}`))
    lines.push(`Valor unitário: ${formatBRL(item.unitPrice)}`)
    lines.push(`Subtotal: ${formatBRL(item.subtotal)}`)
    lines.push('')
  })
  lines.push(`TOTAL: ${formatBRL(order.total)}`)
  if (order.notes) {
    lines.push('')
    lines.push(`Observações: ${order.notes}`)
  }
  lines.push('')
  lines.push('Pedido enviado pela vitrine digital.')
  return lines.join('\n')
}

export function buildWhatsappUrl(sellerWhatsapp: string, message: string) {
  const number = normalizeWhatsapp(sellerWhatsapp)
  if (!number) return null
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
