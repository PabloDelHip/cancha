import { useToast } from '@/composables/useToast'
import { uploadErrorMessage } from '@/utils/imageFile'

/**
 * Al CREAR un jugador o equipo la imagen elegida se sube después (hace falta su id). Si esa subida
 * falla, la ficha ya existe: se avisa sin deshacer nada y se puede subir al editarla.
 */
export function useImageAfterCreate() {
  const toast = useToast()
  return async function attach<T>(image: Blob | null, upload: (image: Blob) => Promise<T>): Promise<T | null> {
    if (!image) return null
    try {
      return await upload(image)
    } catch (e) {
      toast.error(`Se guardó la ficha, pero no se pudo subir la imagen: ${uploadErrorMessage(e)} Puedes subirla al editarla.`)
      return null
    }
  }
}
