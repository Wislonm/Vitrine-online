import { db } from '@/lib/db'
import { orderItems, orders } from '@/lib/db/schema'

export type NewOrder = {
  storeId: string
  customerName: string
  customerPhone: string | null
  notes: string | null
  totalAmount: string
  items: {
    productId: string
    productName: string
    unitPrice: string
    quantity: number
    subtotal: string
  }[]
}

export async function createOrderWithItems(input: NewOrder) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        storeId: input.storeId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
        totalAmount: input.totalAmount,
      })
      .returning()

    await tx.insert(orderItems).values(
      input.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    )
    return order
  })
}
