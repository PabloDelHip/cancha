import { onMounted, ref } from 'vue'
import { ensureAdminData, ensureLeagueData } from '@/stores'
import { getErrorMessage } from '@/services'

function useLoad(loader: (force: boolean) => Promise<unknown>) {
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load(force = false) {
    loading.value = true
    error.value = null
    try {
      await loader(force)
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(() => load())

  return { loading, error, reload: () => load(true) }
}

/** Asegura que los datos públicos del dominio estén cargados y expone estado de carga/error. */
export function useLeagueData() {
  return useLoad(ensureLeagueData)
}

/** Igual que useLeagueData, más la información de propiedad del organizador (panel /admin). */
export function useAdminData() {
  return useLoad(ensureAdminData)
}
