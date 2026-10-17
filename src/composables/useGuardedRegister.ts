import { computed } from 'vue'
import type { ID, RosterAssignment } from '@/types'
import { usePlayersStore, useTournamentsStore } from '@/stores'
import { getErrorBody } from '@/services'
import { useConfirm } from './useConfirm'

/**
 * Inscribir o cambiar de equipo con las excepciones del organizador. Si el servidor rechaza por una
 * regla que admite excepción, quien puede autorizarla escribe el motivo y se reintenta; los demás
 * ven el error. Devuelve false si se canceló la excepción.
 * - 3A: equipo lleno (409 TEAM_FULL) → `overLimitReason`.
 * - 3C: eliminatoria iniciada con el bloqueo activo (409 TRANSFERS_LOCKED_KNOCKOUT) → `knockoutReason`.
 * - 3D: ya jugó en el torneo con otro equipo (409 TRANSFER_REASON_REQUIRED): volver con uno distinto
 *   es un cambio de equipo → `transferReason`. No es una excepción: lo pide a quien inscribe.
 */
export function useGuardedRegister(tournamentId: () => ID) {
  const players = usePlayersStore()
  const tournaments = useTournamentsStore()
  const { ask } = useConfirm()
  const canExceptions = computed(() => tournaments.can(tournamentId(), 'REGISTRATION_EXCEPTIONS'))

  async function register(playerId: ID, assignment: RosterAssignment): Promise<boolean> {
    let next = assignment
    for (;;) {
      try {
        await players.register(playerId, next)
        return true
      } catch (e) {
        const body = getErrorBody<{ error?: string; max?: number; count?: number; message?: string }>(e)
        if (body?.error === 'TRANSFER_REASON_REQUIRED' && !next.transferReason) {
          const reason = await ask({
            title: 'Es un cambio de equipo',
            message: `${body.message ?? 'Ya jugó con otro equipo en este torneo.'} Se aplican las reglas de cambios de equipo (plazo y eliminatoria).`,
            label: 'Motivo del cambio',
            placeholder: 'Ej. Su equipo anterior se retiró',
            confirmLabel: 'Inscribir',
          })
          if (reason === null) return false
          next = { ...next, transferReason: reason }
          continue
        }
        if (!canExceptions.value) throw e
        if (body?.error === 'TEAM_FULL' && !next.overLimitReason) {
          const reason = await ask({
            title: 'El equipo ya está completo',
            message: `El torneo permite ${body.max} jugadores por equipo y este ya tiene ${body.count}. Puedes autorizar una excepción: quedará registrado quién la autorizó y por qué.`,
            label: 'Motivo de la excepción',
            placeholder: 'Ej. Portero suplente por lesión',
            confirmLabel: 'Autorizar e inscribir',
          })
          if (reason === null) return false
          next = { ...next, overLimitReason: reason }
          continue
        }
        if (body?.error === 'TRANSFERS_LOCKED_KNOCKOUT' && !next.knockoutReason) {
          const reason = await ask({
            title: 'La fase eliminatoria ya empezó',
            message: 'Este torneo no permite cambios de equipo desde el primer partido de eliminatoria. Puedes autorizar una excepción: quedará registrado quién la autorizó y por qué.',
            label: 'Motivo de la excepción',
            placeholder: 'Ej. Autorizado por la junta de delegados',
            confirmLabel: 'Autorizar el cambio',
          })
          if (reason === null) return false
          next = { ...next, knockoutReason: reason }
          continue
        }
        throw e
      }
    }
  }

  return { register, canExceptions }
}
