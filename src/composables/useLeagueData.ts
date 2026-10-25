import { onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { ensureAdminData, ensureLeagueData, ensureTournamentData } from '@/stores'
import { getErrorMessage, getErrorStatus } from '@/services'
import type { ID } from '@/types'

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

/**
 * B1 — solo los datos de UN torneo (ver stores/tournamentData.ts), en lugar de toda la plataforma.
 * Vuelve a cargar al cambiar de torneo; una respuesta atrasada del torneo anterior no pisa el estado
 * del actual. `notFound`: no existe, el id no es válido o es un borrador que este visitante no puede
 * ver (404 del servidor, como si no existiera): la vista lo muestra como «no encontrado», no como error.
 */
export function useTournamentData(tournamentId: MaybeRefOrGetter<ID>) {
  const loading = ref(true)
  const error = ref<string | null>(null)
  const notFound = ref(false)
  let seq = 0

  async function load(force = false) {
    const id = toValue(tournamentId)
    const mine = ++seq
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      await ensureTournamentData(id, force)
    } catch (e) {
      if (mine !== seq) return
      const status = getErrorStatus(e)
      if (status === 404 || status === 400) notFound.value = true
      else error.value = getErrorMessage(e)
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  watch(() => toValue(tournamentId), () => load(), { immediate: true })

  return { loading, error, notFound, reload: () => load(true) }
}
