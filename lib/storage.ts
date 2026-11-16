import { del, put } from '@vercel/blob'

export type AssetKind = 'product' | 'banner' | 'avatar'

export interface StorageAdapter {
  isConfigured(): boolean
  upload(pathname: string, file: File): Promise<{ url: string }>
  remove(url: string): Promise<void>
}

// Adaptador atual: Vercel Blob (público, pois as imagens aparecem na vitrine).
// Para trocar de provedor, implemente StorageAdapter e exporte aqui.
const vercelBlobAdapter: StorageAdapter = {
  isConfigured: () => Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  async upload(pathname, file) {
    const blob = await put(pathname, file, { access: 'public', contentType: file.type })
    return { url: blob.url }
  },
  async remove(url) {
    await del(url)
  },
}

export const storage: StorageAdapter = vercelBlobAdapter

// O painel sempre recorta em 1:1 e converte para WebP antes de enviar.
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export function assetPrefix(storeId: string) {
  return `/stores/${storeId}/`
}

/** Garante que uma URL de imagem enviada pelo navegador pertence ao storage da própria loja. */
export function isAssetOwnedByStore(url: string, storeId: string) {
  if (url.startsWith('/demo/')) return true
  try {
    return decodeURIComponent(new URL(url).pathname).startsWith(assetPrefix(storeId))
  } catch {
    return false
  }
}

export async function removeAssetIfOwned(url: string | null | undefined, storeId: string) {
  if (!url || !storage.isConfigured() || !isAssetOwnedByStore(url, storeId)) return
  try {
    await storage.remove(url)
  } catch (error) {
    console.error('[storage] Falha ao remover arquivo', error)
  }
}

export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return 'image/avif'
  }
  return null
}
