/**
 * 7B-A — exportación a PNG y recursos de las publicaciones.
 *
 * - Los escudos y el logo se convierten antes a data URL (`toDataUrl`): si uno falla (CORS, red,
 *   formato), se usa el escudo de iniciales. Así la exportación no depende de nada externo y nunca
 *   queda una imagen rota.
 * - html-to-image clona el nodo con sus estilos y lo dibuja en un canvas al tamaño exacto del
 *   formato (pixelRatio 1: 1080 px de ancho reales), con las fuentes incrustadas.
 * - Compartir usa la Web Share API con archivos cuando el navegador lo permite; si no, descarga.
 */
import { toBlob } from 'html-to-image'
import { fontEmbedCss } from './fonts'
import { FORMATS, type PosterFormat } from './data'

const cache = new Map<string, Promise<string | null>>()

/** Imagen remota → data URL (o null si no se puede leer). Con tiempo límite y caché por URL. */
export function toDataUrl(url: string | null | undefined, timeoutMs = 8000): Promise<string | null> {
  if (!url) return Promise.resolve(null)
  if (url.startsWith('data:image/')) return Promise.resolve(url)
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeoutMs)
        try {
          const res = await fetch(url, { mode: 'cors', signal: ctrl.signal, credentials: 'omit' })
          if (!res.ok) return null
          const blob = await res.blob()
          if (!blob.type.startsWith('image/')) return null
          return await blobToDataUrl(blob)
        } catch {
          return null
        } finally {
          clearTimeout(timer)
        }
      })(),
    )
  }
  return cache.get(url)!
}

export function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Espera a que todas las imágenes del nodo estén decodificadas (si no, salen en blanco). */
async function imagesReady(node: HTMLElement) {
  await Promise.all([...node.querySelectorAll('img')].map((img) => (img.complete ? img.decode().catch(() => undefined) : new Promise((r) => img.addEventListener('load', r, { once: true })))))
}

/** PNG del nodo de la publicación al tamaño exacto del formato. */
export async function renderPng(node: HTMLElement, format: PosterFormat, fonts: string[]): Promise<Blob> {
  const { width, height } = FORMATS[format]
  await document.fonts.ready
  await imagesReady(node)
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: 1,
    canvasWidth: width,
    canvasHeight: height,
    skipAutoScale: true,
    cacheBust: false,
    fontEmbedCSS: await fontEmbedCss(fonts),
    // El nodo se dibuja en su tamaño real aunque la vista previa esté escalada.
    style: { transform: 'none', transformOrigin: '0 0', margin: '0' },
  })
  if (!blob) throw new Error('No se pudo generar la imagen')
  return blob
}

/** ¿El navegador puede compartir estos archivos (Web Share API nivel 2)? */
export function canShareFiles(files: File[]) {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files })
}

/** Comparte las imágenes; devuelve false si el navegador no puede (entonces se descargan). */
export async function sharePngs(files: File[], text: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canShareFiles(files)) return 'unsupported'
  try {
    await navigator.share({ files, text })
    return 'shared'
  } catch (e) {
    return (e as DOMException)?.name === 'AbortError' ? 'cancelled' : 'unsupported'
  }
}

/** Descarga un archivo y libera su URL temporal. */
export function downloadFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
