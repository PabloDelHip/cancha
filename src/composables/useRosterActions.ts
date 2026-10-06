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
  const { confirm } = useConfirm()
  const toast = useToast()

  /** Baja del torneo: cierra la participación; partidos, estadísticas e historial se conservan. */
  async function unregister(entry: RosterEntry) {
    const ok = await confirm({
      title: `¿Dar de baja a ${fullName(entry.player)}?`,
      message: `Deja de participar en ${tournaments.get(tournamentId())?.name ?? 'este torneo'}. Su perfil, sus partidos y su historial se conservan.`,
      confirmLabel: 'Dar de baja',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await players.unregister(tournamentId(), entry.player.id)
      toast.success(`${fullName(entry.player)} dado de baja del torneo.`)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return { unregister }
}
