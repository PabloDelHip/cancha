import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { ID } from '@/types'
import { useTournamentsStore } from '@/stores'

/**
 * Contexto del workspace de un torneo en el panel.
 * - `isMine`: el usuario administra el torneo (la API lo vuelve a comprobar siempre).
 * - `readOnly`: torneo finalizado → histórico; no se permiten operaciones deportivas.
 */
export function useTournamentWorkspace(tournamentId: MaybeRefOrGetter<ID>) {
  const tournaments = useTournamentsStore()
  const tournament = computed(() => tournaments.get(toValue(tournamentId)))
  const isMine = computed(() => tournaments.isMine(toValue(tournamentId)))
  const readOnly = computed(() => tournament.value?.status === 'finished')
  return { tournament, isMine, readOnly }
}
