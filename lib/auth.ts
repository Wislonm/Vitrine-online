import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { db, pool } from '@/lib/db'
import { stores, user as userTable } from '@/lib/db/schema'
import { isEmailRegistered, isWhatsappRegistered } from '@/lib/repositories/store-uniqueness'
import { isValidBrazilianDocument, onlyDocumentDigits } from '@/lib/brazil-document'
import { isEmailConfigured, sendPasswordResetEmail } from '@/lib/email'
import { normalizeWhatsapp } from '@/lib/format'
import { ensureStoreForUser } from '@/lib/services/store-service'
import { LEGAL_DOCUMENT_VERSION } from '@/lib/legal'

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_ENV === 'production'
      ? 'https://minhavitrine.shop'
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.V0_RUNTIME_URL),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!isEmailConfigured()) {
        console.error('[auth] Recuperação solicitada sem remetente de e-mail configurado.')
        return
      }
      try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, url })
      } catch (error) {
        console.error('[auth] Falha ao enviar e-mail de redefinição:', error)
      }
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user', input: false },
      status: { type: 'string', defaultValue: 'active', input: false },
      whatsapp: { type: 'string', required: false, input: true },
      commercialName: { type: 'string', required: true, input: true, returned: false },
      documentType: { type: 'string', required: true, input: true, returned: false },
      documentNumber: { type: 'string', required: true, input: true, returned: false },
      termsAccepted: { type: 'boolean', required: true, input: true, returned: false },
      termsAcceptedAt: { type: 'date', required: false, input: false, returned: false },
      termsVersion: { type: 'string', required: false, input: false, returned: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const fields = newUser as typeof newUser & { whatsapp?: string; commercialName?: string; documentType?: string; documentNumber?: string; termsAccepted?: boolean }
          if (fields.termsAccepted !== true) throw new APIError('BAD_REQUEST', { message: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade' })
          const whatsapp = normalizeWhatsapp(fields.whatsapp)
          if (!whatsapp) throw new APIError('BAD_REQUEST', { message: 'Informe um WhatsApp válido com DDD' })
          if (await isEmailRegistered(newUser.email)) throw new APIError('BAD_REQUEST', { message: 'Este e-mail já está cadastrado' })
          if (await isWhatsappRegistered(whatsapp)) throw new APIError('BAD_REQUEST', { message: 'Este WhatsApp já está cadastrado' })

          const commercialName = fields.commercialName?.trim()
          if (!commercialName || commercialName.length < 2 || commercialName.length > 80) {
            throw new APIError('BAD_REQUEST', { message: 'Informe um nome comercial válido' })
          }
          const documentType = fields.documentType
          const documentNumber = onlyDocumentDigits(fields.documentNumber ?? '')
          if ((documentType !== 'cpf' && documentType !== 'cnpj') || !isValidBrazilianDocument(documentType, documentNumber)) {
            throw new APIError('BAD_REQUEST', { message: 'Informe um CPF ou CNPJ válido' })
          }
          const [existingDocument] = await db.select({ id: stores.id }).from(stores).where(eq(stores.documentNumber, documentNumber)).limit(1)
          if (existingDocument) throw new APIError('BAD_REQUEST', { message: 'Este CPF/CNPJ já está cadastrado' })

          return { data: { ...newUser, whatsapp, commercialName, documentType, documentNumber, termsAccepted: true, termsAcceptedAt: new Date(), termsVersion: LEGAL_DOCUMENT_VERSION, role: 'user', status: 'active' } }
        },
        after: async (created) => {
          const registration = created as typeof created & { whatsapp?: string | null; commercialName?: string; documentType?: 'cpf' | 'cnpj'; documentNumber?: string }
          await ensureStoreForUser({
            id: created.id,
            name: created.name,
            email: created.email,
            whatsapp: registration.whatsapp,
            commercialName: registration.commercialName,
            documentType: registration.documentType,
            documentNumber: registration.documentNumber,
          })
        },
      },
    },
    session: {
      create: {
        before: async (newSession) => {
          const [row] = await db
            .select({ status: userTable.status })
            .from(userTable)
            .where(eq(userTable.id, newSession.userId))
            .limit(1)
          if (row?.status === 'blocked') {
            throw new APIError('FORBIDDEN', { message: 'Esta conta está bloqueada' })
          }
        },
      },
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
          ...(process.env.V0_DEV_APP_URL ? [process.env.V0_DEV_APP_URL] : []),
          ...(process.env.V0_BUILD_URL ? [process.env.V0_BUILD_URL] : []),
          ...(process.env.V0_SANDBOX_URL ? [process.env.V0_SANDBOX_URL] : []),
        ]
      : []),
    ...(process.env.NODE_ENV === 'production'
        ? [
          'https://minhavitrine.shop',
          'https://www.minhavitrine.shop',
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
        ]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          // Required by the cross-site v0 preview iframe. Without these
          // attributes, login succeeds but the next request appears signed out.
          defaultCookieAttributes: {
            sameSite: 'none' as const,
            secure: true,
          },
        },
      }
    : {}),
})
