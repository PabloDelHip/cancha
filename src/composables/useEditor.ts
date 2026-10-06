import { onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorMessage } from '@/services'
import { useToast } from './useToast'

/**
 * Estado de un modal de crear/editar: qué se edita, si está abierto y si está guardando.
 * Abre automáticamente el modal de creación si la URL trae `?new=1`
 * (atajos desde el dashboard), salvo con `openOnNew: false` (la vista decide qué abrir).
 */
export function useEditor<T>({ openOnNew = true }: { openOnNew?: boolean } = {}) {
  const open = ref(false)
  const current = shallowRef<T | null>(null)
  const saving = ref(false)
  const toast = useToast()
  const route = useRoute()
  const router = useRouter()

  function create() {
    current.value = null
    open.value = true
  }
  function edit(item: T) {
    current.value = item
    open.value = true
  }
  function close() {
    if (!saving.value) open.value = false
  }

  async function save(action: () => Promise<unknown>, successMessage: string) {
    saving.value = true
    try {
      await action()
      toast.success(successMessage)
      open.value = false
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      saving.value = false
    }
  }

  onMounted(() => {
    if (openOnNew && route.query.new) {
      create()
      router.replace({ query: { ...route.query, new: undefined } })
    }
  })

  return { open, current, saving, create, edit, close, save }
}
