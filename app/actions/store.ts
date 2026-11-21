'use server'

import { revalidatePath } from 'next/cache'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { isSlugTaken, updateStoreAndOwner, updateStoreSettings, getStoreSettings } from '@/lib/repositories/stores'
import { isEmailRegistered, isStorePhoneRegistered, isWhatsappRegistered } from '@/lib/repositories/store-uniqueness'
import { getStoreDomainForStore } from '@/lib/repositories/store-domains'
import { normalizeWhatsapp } from '@/lib/format'
import { heroSchema, profileSchema, zodFieldErrors, type ActionResult } from '@/lib/validators'
import { isAssetOwnedByStore, removeAssetIfOwned } from '@/lib/storage'

const SESSION_ERROR = 'Sua sessão expirou. Entre novamente.'

export async function updateProfileAction(raw: unknown): Promise<ActionResult> {
  try {
    const { user, store } = await getSellerContextOrThrow()

    const domainRecord = await getStoreDomainForStore(store.id)
    if (domainRecord?.enabled && !domainRecord.domain) {
      return { ok: false, error: 'Informe e conecte seu domínio próprio ou desligue a opção “Usar domínio próprio” para salvar.' }
    }

    const parsed = profileSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: zodFieldErrors(parsed.error) }
    }
    const data = parsed.data
    const normalizedWhatsapp = normalizeWhatsapp(data.whatsapp)!
    if (data.contactEmail && await isEmailRegistered(data.contactEmail, user.id, store.id)) {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: { contactEmail: ['Este e-mail já está cadastrado em outra conta ou loja'] } }
    }
    if (await isWhatsappRegistered(normalizedWhatsapp, user.id)) {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: { whatsapp: ['Este WhatsApp já está cadastrado em outra conta'] } }
    }
    const normalizedPhone = data.phone ? normalizeWhatsapp(data.phone) : null
    if (normalizedPhone && await isStorePhoneRegistered(normalizedPhone, store.id)) {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: { phone: ['Este telefone já está cadastrado em outra loja'] } }
    }

    if (await isSlugTaken(data.slug, store.id)) {
      return {
        ok: false,
        error: 'Revise os campos destacados',
        fieldErrors: { slug: ['Este endereço já está em uso'] },
      }
    }

    await updateStoreAndOwner(
      store.id,
      user.id,
      data.ownerName,
      {
        name: data.name,
        slug: data.slug,
        description: data.description,
        whatsapp: normalizeWhatsapp(data.whatsapp),
        phone: data.phone,
        contactEmail: data.contactEmail,
        address: data.address,
        city: data.city,
        state: data.state ? data.state.toUpperCase() : null,
      },
      {
        instagram: data.instagram ?? undefined,
        facebook: data.facebook ?? undefined,
        tiktok: data.tiktok ?? undefined,
        website: data.website ?? undefined,
      },
    )

    revalidatePath('/painel', 'layout')
    revalidatePath(`/${store.slug}`)
    revalidatePath(`/${data.slug}`)
    return { ok: true, message: 'Perfil atualizado' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    if ((error as { code?: string })?.code === '23505') {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: { slug: ['Este endereço já está em uso'] } }
    }
    console.error('[store] updateProfile', error)
    return { ok: false, error: 'Não foi possível salvar o perfil.' }
  }
}

export async function updateHeroAction(raw: unknown): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()

    const parsed = heroSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: 'Revise os campos destacados', fieldErrors: zodFieldErrors(parsed.error) }
    }
    const data = parsed.data

    for (const url of [data.bannerUrl, data.avatarUrl]) {
      if (url && !isAssetOwnedByStore(url, store.id)) {
        return { ok: false, error: 'Envie as imagens pelo painel.' }
      }
    }

    const previous = await getStoreSettings(store.id)
    await updateStoreSettings(store.id, {
      heroType: data.heroType,
      displayName: data.displayName,
      heroDescription: data.heroDescription,
      bannerUrl: data.bannerUrl,
      avatarUrl: data.avatarUrl,
      colorScheme: data.colorScheme,
    })

    if (previous?.bannerUrl && previous.bannerUrl !== data.bannerUrl) {
      await removeAssetIfOwned(previous.bannerUrl, store.id)
    }
    if (previous?.avatarUrl && previous.avatarUrl !== data.avatarUrl) {
      await removeAssetIfOwned(previous.avatarUrl, store.id)
    }

    revalidatePath(`/${store.slug}`)
    revalidatePath('/painel', 'layout')
    revalidatePath('/painel/vitrine')
    return { ok: true, message: 'Vitrine atualizada' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[store] updateHero', error)
    return { ok: false, error: 'Não foi possível salvar a vitrine.' }
  }
}
