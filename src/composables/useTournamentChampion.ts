import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { ID, TournamentStructure } from '@/types'

type Knockout = Extract<TournamentStructure['phases'][number], { type: 'knockout' }>

/**
 * Campeón OFICIAL a partir de la estructura que calcula el servidor: ganador de la final en formatos
 * con eliminatoria, líder verificable en la liga. Nunca "el primero de la tabla" en un torneo con
 * playoffs. Solo con el torneo finalizado.
 */
export function useTournamentChampion(structure: MaybeRefOrGetter<TournamentStructure | null>) {
  const knockout = computed(() => (toValue(structure)?.phases.find((p) => p.type === 'knockout' && p.generated) as Knockout | undefined) ?? null)
  const champion = computed(() => {
    const s = toValue(structure)
    if (!s || s.status !== 'finished' || !s.championTeamId) return null
    return s.teams[s.championTeamId] ?? null
  })
  const detail = computed(() => {
    const s = toValue(structure)
    const id = s?.championTeamId
    if (!s || !id) return undefined
    const k = knockout.value
    if (k) {
      const final = k.rounds.at(-1)?.ties[0]
      if (!final?.aggregate) return undefined
      const won = final.homeTeamId === id
      const rival = s.teams[(won ? final.awayTeamId : final.homeTeamId) as ID]
      const [a, b] = won ? [final.aggregate.home, final.aggregate.away] : [final.aggregate.away, final.aggregate.home]
      const last = final.legs.at(-1)
      const name = rival?.name ?? 'su rival'
      if (last?.penalties && a === b) {
        const [p1, p2] = won ? [last.penalties.home, last.penalties.away] : [last.penalties.away, last.penalties.home]
        return `Ganó la final a ${name} en penales (${p1}-${p2}) tras empatar ${a}-${b}${last.extraTime ? ' en tiempos extra' : ''}`
      }
      return `Ganó la final ${a}-${b} a ${name}${last?.extraTime ? ' en tiempos extra' : ''}`
    }
    const league = s.phases.find((p) => p.type === 'league')
    const row = league?.type === 'league' ? league.table.find((r) => r.teamId === id) : undefined
    return row ? `${row.points} puntos · ${row.won} ganados de ${row.played}` : undefined
  })
  return { champion, detail, knockout }
}
