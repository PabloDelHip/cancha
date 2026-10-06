import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '@/services'
import { useHomeStore } from '@/stores'
import { useToast } from './useToast'

/**
 * "Quiero organizar un torneo": activa la capacidad de organizar (no quita nada: la misma cuenta
 * sigue administrando sus equipos) y lleva a crear el primer torneo.
 */
export function useOrganizerOptIn() {
  const home = useHomeStore()
  const toast = useToast()
  const router = useRouter()
  const enabling = ref(false)

  async function enable(goToCreate = true) {
    enabling.value = true
    try {
      await home.enableOrganizer()
      toast.success('Listo: ya puedes organizar torneos. Tus equipos siguen igual.')
      if (goToCreate) await router.push({ name: 'admin-tournaments', query: { new: '1' } })
      return true
    } catch (e) {
      toast.error(getErrorMessage(e))
      return false
    } finally {
      enabling.value = false
    }
  }

  return { enabling, enable }
}
