import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { paymentSettings } from '@/lib/db/schema'
import { decryptMercadoPagoSecret, encryptMercadoPagoSecret } from '@/lib/mercadopago-crypto'

export async function getMercadoPagoSettingsForAdmin() {
  const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1)
  return {
    environment: settings?.environment ?? 'test',
    publicKey: settings?.publicKey ?? '',
    hasAccessToken: Boolean(settings?.accessTokenEncrypted),
    hasWebhookSecret: Boolean(settings?.webhookSecretEncrypted),
    updatedAt: settings?.updatedAt?.toISOString() ?? null,
  }
}

export async function saveMercadoPagoSettings(input: {
  environment: 'test' | 'production'
  publicKey: string
  accessToken: string
  webhookSecret: string
  clearAccessToken: boolean
  clearWebhookSecret: boolean
  updatedBy: string
}) {
  const [current] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1)
  const switchingEnvironment = current && current.environment !== input.environment

  if (switchingEnvironment && current.accessTokenEncrypted && !input.accessToken && !input.clearAccessToken) {
    throw new Error('Informe o Access Token do novo ambiente antes de trocar o modo.')
  }

  const accessTokenEncrypted = input.clearAccessToken
    ? null
    : input.accessToken
      ? encryptMercadoPagoSecret(input.accessToken)
      : current?.accessTokenEncrypted ?? null
  const webhookSecretEncrypted = input.clearWebhookSecret
    ? null
    : input.webhookSecret
      ? encryptMercadoPagoSecret(input.webhookSecret)
      : current?.webhookSecretEncrypted ?? null

  await db.insert(paymentSettings).values({
    id: 1,
    provider: 'mercadopago',
    environment: input.environment,
    publicKey: input.publicKey || null,
    accessTokenEncrypted,
    webhookSecretEncrypted,
    updatedBy: input.updatedBy,
  }).onConflictDoUpdate({
    target: paymentSettings.id,
    set: {
      environment: input.environment,
      publicKey: input.publicKey || null,
      accessTokenEncrypted,
      webhookSecretEncrypted,
      updatedBy: input.updatedBy,
      updatedAt: new Date(),
    },
  })
}

export async function getMercadoPagoCredentialsForServer() {
  const [settings] = await db.select().from(paymentSettings).where(eq(paymentSettings.id, 1)).limit(1)
  if (!settings) return null
  return {
    environment: settings.environment,
    publicKey: settings.publicKey,
    accessToken: settings.accessTokenEncrypted ? decryptMercadoPagoSecret(settings.accessTokenEncrypted) : null,
    webhookSecret: settings.webhookSecretEncrypted ? decryptMercadoPagoSecret(settings.webhookSecretEncrypted) : null,
  }
}
