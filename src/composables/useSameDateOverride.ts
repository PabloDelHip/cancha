import type { ID } from '@/types'
import { useTournamentsStore } from '@/stores'
import { getErrorBody } from '@/services'
import { useConfirm } from './useConfirm'

/**
 * 3A — un jugador no participa con dos equipos del torneo en la misma fecha deportiva (409
 * SAME_DATE_OTHER_TEAM). Quien puede autorizar excepciones (propietario/administrador) escribe el
 * motivo y se reintenta como corrección administrativa (queda en el historial del partido); los
 * demás ven el error. Devuelve null si se canceló.
 */
export function useSameDateOverride(tournamentId: () => ID | undefined) {
  const tournaments = useTournamentsStore()
  const { ask } = useConfirm()

  async function run<T>(call: (sameDateReason?: string) => Promise<T>): Promise<T | null> {
    try {
      return await call()
    } catch (e) {
      const body = getErrorBody<{ error?: string; message?: string }>(e)
      const id = tournamentId()
      if (body?.error !== 'SAME_DATE_OTHER_TEAM' || !id || !tournaments.can(id, 'REGISTRATION_EXCEPTIONS')) throw e
      const reason = await ask({
        title: 'Jugador con dos equipos en la misma fecha',
        message: `${body.message ?? ''} Si es una corrección administrativa autorizada, escribe el motivo: quedará en el historial del partido.`,
        label: 'Motivo de la corrección',
        confirmLabel: 'Guardar como corrección',
        tone: 'danger',
      })
      return reason === null ? null : call(reason)
    }
  }

  return { run }
}
