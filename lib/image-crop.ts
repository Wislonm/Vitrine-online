export type CropArea = { x: number; y: number; width: number; height: number }

export const OUTPUT_QUALITY = 0.9
export const MAX_OUTPUT_SIZE = 1200
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024
export const SOURCE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    image.src = src
  })
}

/** Recorta a área escolhida na proporção solicitada e converte para WebP com qualidade 90. */
export async function cropToWebp(src: string, area: CropArea, aspect = 1): Promise<Blob> {
  const image = await loadImage(src)
  const outputWidth = Math.max(1, Math.min(Math.round(area.width), MAX_OUTPUT_SIZE))
  const outputHeight = Math.max(1, Math.round(outputWidth / aspect))

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Seu navegador não suporta o recorte de imagens.')

  context.imageSmoothingQuality = 'high'
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputWidth, outputHeight)

  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', OUTPUT_QUALITY))
  if (webp?.type === 'image/webp') return webp

  // Safari/iOS e alguns navegadores móveis não exportam WebP via canvas.
  // Enviamos o recorte em PNG e o endpoint converte para WebP no servidor.
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!png) throw new Error('Não foi possível gerar o recorte da imagem.')
  return png
}
