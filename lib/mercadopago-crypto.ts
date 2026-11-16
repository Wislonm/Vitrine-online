import 'server-only'
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

function encryptionKey() {
  const authSecret = process.env.BETTER_AUTH_SECRET
  if (!authSecret || authSecret.length < 32) throw new Error('BETTER_AUTH_SECRET precisa estar configurado para proteger as credenciais de pagamento.')
  return Buffer.from(hkdfSync('sha256', Buffer.from(authSecret), Buffer.from('ui-sales-payment-config-v1'), Buffer.from('mercadopago-aes-256-gcm'), 32))
}

export function encryptMercadoPagoSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptMercadoPagoSecret(value: string) {
  const [version, encodedIv, encodedTag, encodedCiphertext] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedTag || !encodedCiphertext) throw new Error('Formato de credencial Mercado Pago inválido.')

  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(encodedIv, 'base64url'))
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
