import { NextResponse, type NextRequest } from 'next/server'
import sharp from 'sharp'
import { getSellerContextOrThrow, UnauthorizedError } from '@/lib/session'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  assetPrefix,
  detectImageType,
  storage,
  type AssetKind,
} from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const { store } = await getSellerContextOrThrow()

    if (!storage.isConfigured()) {
      return NextResponse.json(
        { error: 'O armazenamento de imagens ainda não está configurado.' },
        { status: 503 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const kind = formData.get('kind') as AssetKind | null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }
    if (!kind || !['product', 'banner', 'avatar'].includes(kind)) {
      return NextResponse.json({ error: 'Tipo de imagem inválido.' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 4 MB.' }, { status: 400 })
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'A imagem precisa passar pelo recorte e ser enviada em WebP.' }, { status: 400 })
    }

    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
    const detected = detectImageType(head)
    if (!detected || detected !== file.type) {
      return NextResponse.json({ error: 'O arquivo não é uma imagem válida.' }, { status: 400 })
    }

    const output = file.type === 'image/webp'
      ? file
      : new File(
          [await sharp(Buffer.from(await file.arrayBuffer())).webp({ quality: 90 }).toBuffer()],
          `${kind}.webp`,
          { type: 'image/webp' },
        )
    const pathname = `${assetPrefix(store.id).slice(1)}${kind}/${crypto.randomUUID()}.webp`
    const { url } = await storage.upload(pathname, output)
    return NextResponse.json({ url })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Faça login para enviar imagens.' }, { status: 401 })
    }
    console.error('[upload] erro', error)
    return NextResponse.json({ error: 'Não foi possível enviar a imagem.' }, { status: 500 })
  }
}
