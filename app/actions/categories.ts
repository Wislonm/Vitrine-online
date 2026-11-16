'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import { createCategory, deleteCategory, renameCategory } from '@/lib/repositories/categories'
import { categorySchema, zodFieldErrors, type ActionResult } from '@/lib/validators'

const SESSION_ERROR = 'Sua sessão expirou. Entre novamente.'

function isUniqueViolation(error: unknown) {
  return (error as { code?: string })?.code === '23505'
}

export async function createCategoryAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const { store } = await getSellerContextOrThrow()
    const parsed = categorySchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0].message, fieldErrors: zodFieldErrors(parsed.error) }
    }
    const created = await createCategory(store.id, parsed.data.name)
    revalidatePath('/painel/categorias')
    revalidatePath('/painel/produtos')
    revalidatePath(`/${store.slug}`)
    return { ok: true, data: { id: created.id }, message: 'Categoria criada' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    if (isUniqueViolation(error)) return { ok: false, error: 'Você já tem uma categoria com esse nome.' }
    console.error('[categories] create', error)
    return { ok: false, error: 'Não foi possível criar a categoria.' }
  }
}

export async function renameCategoryAction(categoryId: string, raw: unknown): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()
    const parsed = categorySchema.safeParse(raw)
    if (!parsed.success || !z.uuid().safeParse(categoryId).success) {
      return { ok: false, error: parsed.success ? 'Categoria inválida' : parsed.error.issues[0].message }
    }
    const ok = await renameCategory(store.id, categoryId, parsed.data.name)
    if (!ok) return { ok: false, error: 'Categoria não encontrada' }
    revalidatePath('/painel/categorias')
    revalidatePath(`/${store.slug}`)
    return { ok: true, message: 'Categoria atualizada' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    if (isUniqueViolation(error)) return { ok: false, error: 'Você já tem uma categoria com esse nome.' }
    console.error('[categories] rename', error)
    return { ok: false, error: 'Não foi possível renomear a categoria.' }
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  try {
    const { store } = await getSellerContextOrThrow()
    if (!z.uuid().safeParse(categoryId).success) return { ok: false, error: 'Categoria inválida' }
    const ok = await deleteCategory(store.id, categoryId)
    if (!ok) return { ok: false, error: 'Categoria não encontrada' }
    revalidatePath('/painel/categorias')
    revalidatePath('/painel/produtos')
    revalidatePath(`/${store.slug}`)
    return { ok: true, message: 'Categoria excluída' }
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: SESSION_ERROR }
    console.error('[categories] delete', error)
    return { ok: false, error: 'Não foi possível excluir a categoria.' }
  }
}
