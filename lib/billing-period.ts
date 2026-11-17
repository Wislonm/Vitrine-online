export type BillingPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'yearly'

const billingPeriodMonths: Record<BillingPeriod, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
}

export function addBillingPeriod(start: Date, period: BillingPeriod) {
  const result = new Date(start)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + billingPeriodMonths[period])
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}
