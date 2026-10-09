import type { CompetitionSystem, PhaseType, TournamentSettings } from '@/types'

/**
 * Formatos como secuencias de fases (espejo de backend/src/modules/competition/formats.ts, que es
 * quien decide). Aquí solo sirve para que la UI explique antes de enviar.
 */
export const FORMAT_PHASES: Record<CompetitionSystem, PhaseType[]> = {
  league: ['league'],
  knockout: ['knockout'],
  groups_knockout: ['groups', 'knockout'],
  league_playoffs: ['league', 'knockout'],
}

/** Clasificados a playoffs: cualquier número; si no es potencia de 2, los mejores pasan directo (BYE). */
export const MAX_PLAYOFF_TEAMS = 64
export const MAX_GROUPS = 8
export const MAX_KNOCKOUT_TEAMS = 64
export const GROUP_KEYS = 'ABCDEFGH'.split('')

export const nextPowerOfTwo = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(2, n)))

/** Orden estándar del cuadro (1v8, 4v5, 2v7, 3v6…), igual que el backend. */
export function bracketOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const n = order.length * 2
    order = order.flatMap((s) => [s, n + 1 - s])
  }
  return order
}

/** Cruces de la primera ronda por cabeza de serie; `null` = BYE (pasa directo el mejor sembrado). */
export function firstRoundPairs(teamCount: number): [number, number | null][] {
  const order = bracketOrder(nextPowerOfTwo(teamCount))
  const pairs: [number, number | null][] = []
  for (let i = 0; i < order.length; i += 2) {
    const [a, b] = [order[i], order[i + 1]].sort((x, y) => x - y)
    pairs.push([a, b <= teamCount ? b : null])
  }
  return pairs
}

/** Reparto por defecto en grupos (el mismo que hace el servidor): equipo i → grupo i % G. */
export function dealGroups<T>(items: T[], groupCount: number): T[][] {
  return Array.from({ length: groupCount }, (_, g) => items.filter((_, i) => i % groupCount === g))
}

/** Cuadro armado a mano: tamaños posibles (de la final al cuadro que cubre a todos los inscritos). Igual que el servidor. */
export function manualBracketSizes(teamCount: number): number[] {
  const out: number[] = []
  for (let s = 2; s <= Math.min(MAX_KNOCKOUT_TEAMS, nextPowerOfTwo(teamCount)); s *= 2) out.push(s)
  return out
}

/**
 * Cómo arranca un cuadro de `teamCount` cabezas de serie, en una frase: con BYEs, quiénes pasan
 * directo y quiénes juegan la primera ronda ("1º y 2º pasan directo a Semifinal; se juegan 3º-6º y 4º-5º").
 */
export function bracketStartSummary(teamCount: number): string {
  const size = nextPowerOfTwo(teamCount)
  const pairs = firstRoundPairs(teamCount)
  const byes = pairs.filter(([, b]) => b === null).map(([a]) => a).sort((x, y) => x - y)
  const played = pairs.filter(([, b]) => b !== null).sort(([a], [b]) => a - b)
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0])
  const games = list(played.map(([a, b]) => `${a}º-${b}º`))
  if (!byes.length) return `${KNOCKOUT_ROUND_LABEL(size)}: ${games}`
  return `${list(byes.map((b) => `${b}º`))} pasa${byes.length > 1 ? 'n' : ''} directo a ${KNOCKOUT_ROUND_LABEL(size / 2)}; se juega${played.length > 1 ? 'n' : ''} ${games}`
}

/** Nombre de la ronda que disputan `teams` equipos. */
export const KNOCKOUT_ROUND_LABEL = (teams: number) =>
  ({ 2: 'Final', 4: 'Semifinal', 8: 'Cuartos de final', 16: 'Octavos de final', 32: 'Dieciseisavos de final', 64: 'Treintaidosavos de final' })[teams] ?? `Ronda de ${teams}`

export const isPowerOfTwo = (n: number) => Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0
export const hasKnockout = (s: CompetitionSystem) => FORMAT_PHASES[s].includes('knockout')
export const hasRoundRobin = (s: CompetitionSystem) => FORMAT_PHASES[s][0] !== 'knockout'

export function groupSizes(teamCount: number, groupCount: number): number[] {
  return Array.from({ length: groupCount }, (_, g) => Math.floor(teamCount / groupCount) + (g < teamCount % groupCount ? 1 : 0))
}

/** Problemas de la configuración; con `teamCount`, también contra los equipos inscritos. */
export function formatProblems(s: TournamentSettings, teamCount?: number): string[] {
  const out: string[] = []
  if (s.system === 'groups_knockout') {
    const g = s.groupCount ?? 0
    const q = s.qualifiersPerGroup ?? 0
    if (g < 2 || g > MAX_GROUPS) out.push(`Elige entre 2 y ${MAX_GROUPS} grupos.`)
    if (q < 1) out.push('Debe clasificar al menos 1 equipo por grupo.')
    else if (g >= 2 && !isPowerOfTwo(g * q)) {
      out.push(`Clasificarían ${g * q} equipos (${g} × ${q}). Para armar el cuadro sin inventar criterios deben ser 2, 4, 8, 16 o 32.`)
    }
    if (teamCount !== undefined && !out.length) {
      const min = Math.min(...groupSizes(teamCount, g))
      if (min < 2) out.push(`Con ${teamCount} equipos no alcanzan ${g} grupos de al menos 2.`)
      else if (q > min) out.push(`Clasifican ${q} por grupo pero el grupo más pequeño tendría ${min} equipos.`)
    }
  }
  if (s.system === 'league_playoffs') {
    const p = s.playoffTeams ?? 0
    if (!Number.isInteger(p) || p < 2 || p > MAX_PLAYOFF_TEAMS) out.push(`A playoffs deben clasificar entre 2 y ${MAX_PLAYOFF_TEAMS} equipos.`)
    else if (teamCount !== undefined && teamCount < s.playoffTeams!) out.push(`Clasifican ${s.playoffTeams} a playoffs pero hay ${teamCount} equipos inscritos.`)
  }
  if (s.system === 'knockout' && teamCount !== undefined && teamCount > MAX_KNOCKOUT_TEAMS) {
    out.push(`La eliminación directa admite hasta ${MAX_KNOCKOUT_TEAMS} equipos.`)
  }
  if (teamCount !== undefined && teamCount < 2) out.push('Se necesitan al menos 2 equipos inscritos.')
  return out
}
