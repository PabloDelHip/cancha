import { reactive } from 'vue'
import type { ID, RosterAssignment } from '@/types'
import { toISODate } from '@/utils/format'
import { usePlayersStore } from '@/stores'
import type { RegistrationDraft } from '@/components/admin/RegistrationFields.vue'

/** Estado y validación de "equipo + dorsal" para registrar a un jugador en un torneo. */
export function useRegistration(tournamentId: () => ID) {
  const players = usePlayersStore()
  const draft = reactive<RegistrationDraft>({ teamId: '', shirtNumber: null, startDate: '', retroactiveReason: '' })
  const errors = reactive<{ teamId?: string; shirtNumber?: string; startDate?: string; retroactiveReason?: string }>({})

  function clear() {
    for (const k of ['teamId', 'shirtNumber', 'startDate', 'retroactiveReason'] as const) delete errors[k]
  }
  function reset(teamId: ID | '' = '', shirtNumber: number | null = null) {
    Object.assign(draft, { teamId, shirtNumber, startDate: '', retroactiveReason: '' })
    clear()
  }

  /** Devuelve la asignación válida o null (y deja los errores en `errors`). */
  function validate(playerId: ID | null): RosterAssignment | null {
    clear()
    const number = draft.shirtNumber === null || (draft.shirtNumber as unknown) === '' ? null : Number(draft.shirtNumber)
    if (!draft.teamId) errors.teamId = 'Elige el equipo.'
    if (number !== null && (!Number.isInteger(number) || number < 1 || number > 99)) {
      errors.shirtNumber = 'Entre 1 y 99.'
    } else if (
      number !== null &&
      draft.teamId &&
      players
        .rosterOf(draft.teamId, tournamentId())
        .some((e) => e.membership.shirtNumber === number && e.player.id !== playerId)
    ) {
      errors.shirtNumber = `El #${number} ya está ocupado.`
    }
    const retroactive = !!draft.startDate && draft.startDate < toISODate(new Date())
    if (retroactive && draft.retroactiveReason.trim().length < 3) errors.retroactiveReason = 'Explica por qué (mínimo 3 caracteres).'
    if (errors.teamId || errors.shirtNumber || errors.retroactiveReason) return null
    return {
      tournamentId: tournamentId(),
      teamId: draft.teamId as ID,
      shirtNumber: number,
      ...(draft.startDate ? { startDate: draft.startDate } : {}),
      ...(retroactive ? { retroactiveReason: draft.retroactiveReason.trim() } : {}),
    }
  }

  return { draft, errors, reset, validate }
}
