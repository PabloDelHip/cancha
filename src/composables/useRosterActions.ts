import type { ID } from '@/types'
import { usePlayersStore, useTournamentsStore, type RosterEntry } from '@/stores'
import { useConfirm } from './useConfirm'
import { useToast } from './useToast'
import { getErrorMessage } from '@/services'
import { fullName } from '@/utils/players'

/** Acciones sobre la participación de un jugador en un torneo (no sobre su ficha global). */
export function useRosterActions(tournamentId: () => ID) {
  const players = usePlayersStore()
  const tournaments = useTournamentsStore()
  const { ask } = useConfirm()
  const toast = useToast()

  /** Baja del torneo, con motivo: cierra la participación; partidos, estadísticas e historial se conservan. */
  async function unregister(entry: RosterEntry) {
    const reason = await ask({
      title: `¿Dar de baja a ${fullName(entry.player)}?`,
      message: `Deja de participar en ${tournaments.get(tournamentId())?.name ?? 'este torneo'}. Su perfil, sus partidos, estadísticas e historial se conservan, aunque ya haya jugado.`,
      label: 'Motivo de la baja',
      placeholder: 'Ej. Se cambió de equipo fuera del torneo',
      confirmLabel: 'Dar de baja',
      tone: 'danger',
    })
    if (reason === null) return
    try {
      await players.unregister(tournamentId(), entry.player.id, reason)
      toast.success(`${fullName(entry.player)} dado de baja del torneo.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  /**
   * 3D: bloqueo administrativo (no es una sanción). Mientras está vigente no se le inscribe, no se
   * le transfiere y no participa en partidos desde hoy; lo ya jugado no cambia. Motivo obligatorio.
   */
  async function toggleBlock(entry: RosterEntry) {
    const name = fullName(entry.player)
    const blocked = !!players.activeBlock(tournamentId(), entry.player.id)
    const reason = await ask(
      blocked
        ? { title: `¿Levantar el bloqueo de ${name}?`, message: 'Desde hoy puede volver a jugar y a inscribirse.', label: 'Motivo', placeholder: 'Ej. Entregó la ficha médica', confirmLabel: 'Levantar bloqueo' }
        : {
            title: `¿Bloquear a ${name}?`,
            message: 'Bloqueo administrativo, distinto de una sanción: desde hoy no puede jugar ni cambiar de equipo en este torneo hasta que lo levantes. Sus partidos ya jugados no cambian. Su equipo verá que está bloqueado, pero no el motivo.',
            label: 'Motivo del bloqueo',
            placeholder: 'Ej. Falta la ficha médica',
            confirmLabel: 'Bloquear',
            tone: 'danger',
          },
    )
    if (reason === null) return
    try {
      if (blocked) await players.unblock(tournamentId(), entry.player.id, reason)
      else await players.block(tournamentId(), entry.player.id, reason)
      toast.success(blocked ? `${name} ya no está bloqueado.` : `${name} quedó bloqueado en el torneo.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return { unregister, toggleBlock }
}
