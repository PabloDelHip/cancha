import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ID, PlayerProfile, ProfileMatch } from '@/types'
import { getErrorMessage, getErrorStatus, playerService } from '@/services'

/** Partidos por página al pedir más allá de los recientes del perfil. */
const PAGE_SIZE = 20

/**
 * Perfil deportivo de un Player: UNA petición a GET /players/:id/profile (o su equivalente mock).
 *
 * El servidor es la fuente de verdad: calcula carrera, participaciones actuales, competiciones,
 * historial y partidos recientes. Aquí no se recalcula nada deportivo; solo se carga, se expone
 * y se piden más partidos (paginados en el servidor) cuando el usuario lo solicita.
 */
export function usePlayerProfile(playerId: MaybeRefOrGetter<ID>) {
  const profile = ref<PlayerProfile | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  const matches = ref<ProfileMatch[]>([])
  const pagesLoaded = ref(0)
  const loadingMore = ref(false)
  /** Total de partidos oficiales = partidos jugados de su carrera. */
  const totalMatches = computed(() => profile.value?.career.appearances ?? 0)
  const hasMoreMatches = computed(() => matches.value.length < totalMatches.value)

  async function load() {
    const id = toValue(playerId)
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const data = await playerService.profile(id)
      if (id !== toValue(playerId)) return // respuesta atrasada de otro jugador
      profile.value = data
      matches.value = data.recentMatches
      pagesLoaded.value = 0
    } catch (e) {
      profile.value = null
      if (getErrorStatus(e) === 404) notFound.value = true
      else error.value = getErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  /** Siguiente página de partidos (la primera sustituye a los recientes del perfil). */
  async function loadMoreMatches() {
    if (loadingMore.value || !hasMoreMatches.value) return
    loadingMore.value = true
    try {
      const { items } = await playerService.matches(toValue(playerId), pagesLoaded.value + 1, PAGE_SIZE)
      matches.value = pagesLoaded.value === 0 ? items : [...matches.value, ...items]
      pagesLoaded.value++
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loadingMore.value = false
    }
  }

  watch(() => toValue(playerId), load, { immediate: true })

  return { profile, loading, error, notFound, reload: load, matches, totalMatches, hasMoreMatches, loadingMore, loadMoreMatches }
}
