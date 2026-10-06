import { watch, type MaybeRefOrGetter, toValue } from 'vue'
import { useRouter } from 'vue-router'
import { useTournamentStats } from './useTournamentStats'
import type { ID } from '@/types'

/**
 * Pestañas de rankings globales (tabla/competición, goleadores): en un torneo con seguimiento
 * parcial no existen. Si se llega por URL directa, se redirige al resumen del torneo en vez de
 * mostrar una tabla vacía o incompleta. Devuelve `partial` para no pintar nada mientras tanto.
 */
export function useFullCoverageOnly(tournamentId: MaybeRefOrGetter<ID>, fallback: 'tournament' | 'admin-tournament') {
  const router = useRouter()
  const { partial } = useTournamentStats(tournamentId)
  watch(
    partial,
    (isPartial) => {
      if (isPartial) void router.replace({ name: fallback, params: { id: toValue(tournamentId) } })
    },
    { immediate: true },
  )
  return { partial }
}
