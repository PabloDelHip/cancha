import { getErrorMessage, getErrorStatus } from '@/services'

/** Lo que se acepta elegir (se recorta y comprime en el navegador antes de subir). */
export const PICKABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const MAX_PICK_BYTES = 15 * 1024 * 1024

/** Validación al elegir el archivo; null si es válido. */
export function pickProblem(file: File): string | null {
  if (!PICKABLE_IMAGE_TYPES.includes(file.type)) return 'Formato no compatible. Usa una imagen JPG, PNG o WebP.'
  if (file.size > MAX_PICK_BYTES) return 'La imagen pesa más de 15 MB. Elige una más ligera.'
  return null
}

/**
 * Recorte → imagen cuadrada de como mucho `size` px (nunca amplía), lista para subir.
 * WebP si el navegador sabe generarlo; si no, JPEG para fotos y PNG para logos (transparencia).
 */
export async function exportSquare(source: HTMLCanvasElement, size: number, kind: 'photo' | 'logo'): Promise<Blob> {
  const side = Math.min(size, source.width, source.height)
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, side, side)
  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await toBlob('image/webp', 0.9)
  if (webp && webp.type === 'image/webp') return webp
  const fallback = kind === 'photo' ? await toBlob('image/jpeg', 0.9) : await toBlob('image/png')
  if (!fallback) throw new Error('No se pudo procesar la imagen')
  return fallback
}

/** Mensaje claro para errores de subida (sin detalles internos). */
export function uploadErrorMessage(error: unknown): string {
  switch (getErrorStatus(error)) {
    case 413:
      return 'La imagen es demasiado grande. Prueba con otra más ligera.'
    case 503:
      return 'La subida de imágenes no está disponible en este momento.'
    case 403:
      return 'No tienes permisos para cambiar esta imagen.'
    default:
      return getErrorMessage(error)
  }
}

/**
 * Foto completa (portada) reducida a como mucho `max` px de lado (nunca amplía), lista para subir.
 * Sin recortar: el encuadre se guarda aparte. WebP si se puede; si no, JPEG.
 */
export async function downscale(file: Blob, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88))
  const webp = await toBlob('image/webp')
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await toBlob('image/jpeg')
  if (!jpeg) throw new Error('No se pudo procesar la imagen')
  return jpeg
}
