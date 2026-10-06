import { api } from './api'
import type { UploadProgress } from '@/types'

/**
 * Subida multipart a los endpoints de imagen del API (que guardan en Cloudinary y devuelven la
 * entidad actualizada con la URL optimizada). Timeout propio: en móvil una foto puede tardar.
 */
export async function putImage<T>(path: string, blob: Blob, onProgress?: UploadProgress): Promise<T> {
  const form = new FormData()
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  form.append('file', blob, `imagen.${ext}`)
  const { data } = await api.put<T>(path, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })
  return data
}

/** Modo demo (sin servidor): la imagen se guarda en el navegador como data URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
