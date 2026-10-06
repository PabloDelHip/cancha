import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { ID, TeamMatch, TeamProfile } from '@/types'
import { getErrorMessage, getErrorStatus, teamService } from '@/services'

/** Partidos por página al pedir más allá de los recientes del perfil. */
const PAGE_SIZE = 20

/**
 * Perfil público de un equipo: UNA petición a GET /teams/:id/profile (o su equivalente mock).
 *
 * El servidor es la fuente de verdad: calcula el balance, las competiciones, las plantillas por
 * torneo, los goleadores con este equipo, el historial y los títulos verificables. Aquí no se
 * recalcula nada deportivo; solo se carga y se piden más partidos (paginados en el servidor).
 */
export function useTeamProfile(teamId: MaybeRefOrGetter<ID>) {
  const profile = ref<TeamProfile | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const notFound = ref(false)

  const matches = ref<TeamMatch[]>([])
  const pagesLoaded = ref(0)
  const loadingMore = ref(false)
  /** Partidos oficiales del equipo = partidos jugados de su historia. */
  const totalMatches = computed(() => profile.value?.record.played ?? 0)
  const hasMoreMatches = computed(() => matches.value.length < totalMatches.value)

  async function load() {
    const id = toValue(teamId)
    loading.value = true
    error.value = null
    notFound.value = false
    try {
      const data = await teamService.profile(id)
      if (id !== toValue(teamId)) return // respuesta atrasada de otro equipo
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
      const { items } = await teamService.matches(toValue(teamId), pagesLoaded.value + 1, PAGE_SIZE)
      matches.value = pagesLoaded.value === 0 ? items : [...matches.value, ...items]
      pagesLoaded.value++
    } catch (e) {
      error.value = getErrorMessage(e)
    } finally {
      loadingMore.value = false
    }
  }

  watch(() => toValue(teamId), load, { immediate: true })

  return { profile, loading, error, notFound, reload: load, matches, totalMatches, hasMoreMatches, loadingMore, loadMoreMatches }
}
