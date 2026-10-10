import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { ID, TournamentPermission } from '@/types'
import { useTournamentsStore } from '@/stores'

/**
 * Contexto del workspace de un torneo en el panel.
 * - `isMine`: el usuario administra el torneo (la API lo vuelve a comprobar siempre).
 * - `readOnly`: torneo finalizado → histórico; no se permiten operaciones deportivas.
 * - `can(permiso)` / `role`: RBAC (propietario o colaborador). Solo decide qué se muestra.
 */
export function useTournamentWorkspace(tournamentId: MaybeRefOrGetter<ID>) {
  const tournaments = useTournamentsStore()
  const tournament = computed(() => tournaments.get(toValue(tournamentId)))
  const isMine = computed(() => tournaments.isMine(toValue(tournamentId)))
  const readOnly = computed(() => tournament.value?.status === 'finished')
  const role = computed(() => tournaments.roleOf(toValue(tournamentId)))
  /** Puedo hacer X en este torneo (y no está finalizado si es una escritura: usar con `readOnly`). */
  const can = (permission: TournamentPermission) => tournaments.can(toValue(tournamentId), permission)
  return { tournament, isMine, readOnly, role, can }
}
