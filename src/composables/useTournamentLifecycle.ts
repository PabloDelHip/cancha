import { ref } from 'vue'
import type { ID } from '@/types'
import { useMatchesStore, useTournamentsStore } from '@/stores'
import { useConfirm } from './useConfirm'
import { useToast } from './useToast'
import { getErrorMessage } from '@/services'
import { plural } from '@/utils/format'

/** Torneo cuyo cierre se está confirmando (un único diálogo montado en el workspace). */
const finishing = ref<ID | null>(null)

/**
 * Ciclo de vida del torneo: borrador → en curso → finalizado.
 * Finalizar es una decisión explícita con su propio diálogo (FinishTournamentDialog).
 */
export function useTournamentLifecycle() {
  const tournaments = useTournamentsStore()
  const matches = useMatchesStore()
  const { confirm } = useConfirm()
  const toast = useToast()

  async function start(tournamentId: ID) {
    const t = tournaments.get(tournamentId)
    if (!t) return
    const teams = tournaments.teamIdsOf(tournamentId).length
    const scheduled = matches.ofTournament(tournamentId).length
    const ok = await confirm({
      title: `¿Iniciar ${t.name}?`,
      message: scheduled
        ? `${plural(teams, 'equipo')} y ${plural(scheduled, 'partido')} programados. El torneo aparecerá como "En curso" en su página pública.`
        : `Aún no hay calendario. Puedes iniciarlo igualmente y programar los partidos después.`,
      confirmLabel: 'Iniciar torneo',
    })
    if (!ok) return
    try {
      await tournaments.start(tournamentId)
      toast.success('Torneo en curso. ¡A jugar!')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return {
    finishing,
    start,
    askFinish: (tournamentId: ID) => (finishing.value = tournamentId),
    closeFinish: () => (finishing.value = null),
  }
}
