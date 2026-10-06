import { reactive } from 'vue'
import type { ID } from '@/types'
import { usePlayersStore } from '@/stores'
import type { RegistrationDraft } from '@/components/admin/RegistrationFields.vue'

/** Estado y validación de "equipo + dorsal" para registrar a un jugador en un torneo. */
export function useRegistration(tournamentId: () => ID) {
  const players = usePlayersStore()
  const draft = reactive<RegistrationDraft>({ teamId: '', shirtNumber: null })
  const errors = reactive<{ teamId?: string; shirtNumber?: string }>({})

  function reset(teamId: ID | '' = '', shirtNumber: number | null = null) {
    draft.teamId = teamId
    draft.shirtNumber = shirtNumber
    delete errors.teamId
    delete errors.shirtNumber
  }

  /** Devuelve la asignación válida o null (y deja los errores en `errors`). */
  function validate(playerId: ID | null) {
    delete errors.teamId
    delete errors.shirtNumber
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
    if (errors.teamId || errors.shirtNumber) return null
    return { tournamentId: tournamentId(), teamId: draft.teamId as ID, shirtNumber: number }
  }

  return { draft, errors, reset, validate }
}
