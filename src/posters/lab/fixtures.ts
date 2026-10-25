/**
 * 7B-A — datos de PRUEBA del banco visual (poster-lab.html, solo desarrollo). Equipos inventados,
 * con nombres largos, acentos y ñ, algunos sin escudo; estadísticas coherentes entre sí
 * (PJ = G + E + P, Pts = 3G + E, DIF = GF − GC). Nunca se usan en la app.
 */
import { buildFixturePages, buildMatchPoster, buildPosterPages, buildResultPages, type MatchPosterData, type PosterData, type PosterFormat, type ResultsPosterData } from '../data'
import type { Standing } from '@/types'

const TEAMS: [string, string, string, boolean][] = [
  ['Halcones de Mazatlán', '#b91c1c', '#fde047', true],
  ['Club Deportivo Águilas del Norte de Sinaloa', '#1d4ed8', '#ffffff', true],
  ['Leones Cañeros', '#f59e0b', '#111827', false],
  ['Atlético San José de Gracia', '#047857', '#ffffff', true],
  ['Peñarol Ñuu Savi', '#111827', '#facc15', true],
  ['Real Xochimilco F.C.', '#7c3aed', '#ffffff', false],
  ['Tiburones Rojos del Puerto', '#dc2626', '#ffffff', true],
  ['Deportivo Ébano', '#0f172a', '#e2e8f0', true],
  ['Potros Universitarios', '#0e7490', '#fef3c7', false],
  ['Lobos de la Sierra Tarahumara', '#57534e', '#fafaf9', true],
  ['Coyotes Juárez', '#c2410c', '#fff7ed', true],
  ['Unión Pescadores de Altata', '#0369a1', '#f0f9ff', false],
  ['Toros Bravos', '#7f1d1d', '#fde68a', true],
  ['Pumas del Valle', '#1e3a8a', '#facc15', true],
  ['Estrella Roja Ahome', '#e11d48', '#ffffff', false],
  ['Gallos Finos de Culiacán', '#a16207', '#111827', true],
  ['Venados de Cosalá', '#65a30d', '#ffffff', true],
  ['Guerreros Aztecas', '#9f1239', '#fbbf24', false],
  ['Marlins de La Paz', '#0284c7', '#ffffff', true],
  ['Diablos Azules', '#1e40af', '#ef4444', true],
  ['Mineros de Concordia', '#3f3f46', '#f97316', false],
  ['Jaguares Élite', '#ca8a04', '#0a0a0a', true],
  ['Santos Rosario', '#15803d', '#fafafa', true],
  ['Cometas F.C.', '#4338ca', '#a5f3fc', false],
]

/** Escudo SVG original y simple (forma + franja + inicial): nada de terceros. */
function crestSvg(name: string, a: string, b: string, i: number) {
  const letter = name.replace(/^(Club Deportivo|Deportivo|Atlético|Real|Unión)\s+/, '').charAt(0)
  const shapes = [
    `<path d="M50 4 L92 16 L92 52 Q92 80 50 96 Q8 80 8 52 L8 16 Z" fill="${a}" stroke="${b}" stroke-width="5"/>`,
    `<circle cx="50" cy="50" r="44" fill="${a}" stroke="${b}" stroke-width="6"/>`,
    `<path d="M50 4 L94 30 L94 70 L50 96 L6 70 L6 30 Z" fill="${a}" stroke="${b}" stroke-width="5"/>`,
  ]
  const band = `<path d="M8 40 L92 40 L92 54 L8 54 Z" fill="${b}" opacity="0.9"/>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shapes[i % 3]}${band}<text x="50" y="${i % 3 === 1 ? 62 : 64}" font-family="Arial, sans-serif" font-weight="900" font-size="34" text-anchor="middle" fill="${a}" stroke="${b}" stroke-width="1.5">${letter}</text></svg>`
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export function fixtureTable(count: number, empty = false) {
  const teams = TEAMS.slice(0, count)
  const games = (count - 1) * 1
  const rows = teams.map(([name], i) => {
    if (empty) return { teamId: `t${i}`, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }
    const played = Math.min(games, 9 - (i % 3 === 2 ? 1 : 0))
    const won = Math.max(0, Math.round((played * (count - i)) / count) - (i % 2))
    const drawn = Math.min(played - won, (i * 7) % 3)
    const lost = played - won - drawn
    const goalsFor = won * 3 + drawn + ((i * 5) % 7) + 4
    const goalsAgainst = lost * 3 + drawn + ((i * 3) % 5) + 3
    return { teamId: `t${i}`, played, won, drawn, lost, goalsFor, goalsAgainst, name }
  })
  const table: Standing[] = rows
    .map((r) => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst, points: r.won * 3 + r.drawn, position: 0, form: [] }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .map((s, i) => ({ ...s, position: i + 1 }))
  const teamMap = Object.fromEntries(teams.map(([name, primary, secondary], i) => [`t${i}`, { name, shortName: null, colors: { primary, secondary } }]))
  const crests = Object.fromEntries(teams.map(([name, a, b, has], i) => [`t${i}`, has ? crestSvg(name, a, b, i) : null]))
  return { table, teamMap, crests }
}

const LEAGUE_LOGO = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#0a0a0a" stroke="#ffffff" stroke-width="4"/><path d="M50 14 L60 40 L88 40 L65 56 L74 84 L50 67 L26 84 L35 56 L12 40 L40 40 Z" fill="#ffffff"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
})()

export function fixturePages(format: PosterFormat, count: number, opts: { empty?: boolean; noLogo?: boolean } = {}): PosterData[] {
  const { table, teamMap, crests } = fixtureTable(count, opts.empty)
  return buildPosterPages({
    table,
    teams: teamMap,
    crests,
    qualifyCount: 4,
    withdrawn: [],
    tournament: { name: 'Liga Municipal de Fútbol 7 · Apertura', startDate: '2026-08-01', endDate: null },
    leagueName: 'Liga Peñasco Interbarrios',
    logo: opts.noLogo ? null : LEAGUE_LOGO,
    lastRound: opts.empty ? null : { number: 9, label: 'Jornada 9' },
    lastPlayedDate: opts.empty ? null : '2026-10-18',
    groupLabel: null,
    format,
    formatDate: (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
  })
}

/**
 * 7B-B1 — partido de prueba entre dos equipos del banco (`teams=a,b`, índices de TEAMS). `pending`:
 * pospuesto sin horario; `noVenue`: sin sede.
 */
export function fixtureMatch(opts: { home?: number; away?: number; pending?: boolean; noVenue?: boolean; noLogo?: boolean } = {}): MatchPosterData {
  const [h, a] = [opts.home ?? 0, opts.away ?? 4]
  const team = (i: number) => ({ name: TEAMS[i]![0], shortName: null, colors: { primary: TEAMS[i]![1], secondary: TEAMS[i]![2] } })
  const crest = (i: number) => (TEAMS[i]![3] ? crestSvg(TEAMS[i]![0], TEAMS[i]![1], TEAMS[i]![2], i) : null)
  return buildMatchPoster({
    match: { round: 10, date: '2026-10-25', time: '16:00', venue: opts.noVenue ? null : 'Unidad Deportiva Peñasco · Cancha 2', status: opts.pending ? 'postponed' : 'scheduled', pendingSchedule: opts.pending },
    home: team(h),
    away: team(a),
    crests: { home: crest(h), away: crest(a) },
    tournament: { name: 'Liga Municipal de Fútbol 7 · Apertura', startDate: '2026-08-01', endDate: null },
    leagueName: 'Liga Peñasco Interbarrios',
    logo: opts.noLogo ? null : LEAGUE_LOGO,
    roundLabel: 'Jornada 10',
  })
}

/**
 * 7B-E — resultado final de prueba. `goals`: 'normal' (3-1 con doblete y autogol), 'many' (7-4, para
 * ver el ajuste de letra), 'none' (marcador sin detalle en el acta) o 'pens' (1-1 y penales 4-3).
 */
export function fixtureFinal(opts: { home?: number; away?: number; goals?: string; noLogo?: boolean } = {}): MatchPosterData {
  const [h, a] = [opts.home ?? 0, opts.away ?? 4]
  const team = (i: number) => ({ name: TEAMS[i]![0], shortName: null, colors: { primary: TEAMS[i]![1], secondary: TEAMS[i]![2] } })
  const crest = (i: number) => (TEAMS[i]![3] ? crestSvg(TEAMS[i]![0], TEAMS[i]![1], TEAMS[i]![2], i) : null)
  const NAMES = ['J. Hernández', 'L. Ñúñez', 'A. Castañeda', 'R. Villaseñor', 'M. Ibáñez', 'E. Zúñiga', 'O. Peña', 'S. Quintero', 'D. Montoya Altamirano', 'F. Ríos', 'C. Beltrán', 'G. Ochoa', 'H. Lugo', 'I. Sauceda']
  type S = [number, 'H' | 'A', number, number, number, number]
  const sets: Record<string, { score: [number, number]; stats: S[]; pens?: { home: number; away: number } }> = {
    normal: { score: [3, 1], stats: [[0, 'H', 2, 0, 1, 0], [1, 'H', 0, 0, 1, 0], [2, 'A', 1, 0, 0, 0], [3, 'A', 0, 1, 2, 1], [4, 'A', 0, 0, 0, 1]] },
    many: { score: [7, 4], stats: [[0, 'H', 3, 0, 0, 0], [1, 'H', 1, 0, 1, 0], [2, 'H', 1, 0, 0, 0], [8, 'H', 1, 0, 1, 0], [9, 'A', 2, 0, 1, 0], [10, 'A', 1, 0, 0, 0], [11, 'A', 0, 1, 0, 0], [12, 'A', 1, 0, 2, 1], [13, 'H', 0, 0, 0, 1], [3, 'A', 0, 0, 1, 0], [4, 'A', 0, 0, 1, 0]] },
    none: { score: [2, 2], stats: [] },
    pens: { score: [1, 1], stats: [[0, 'H', 1, 0, 0, 0], [5, 'A', 1, 0, 1, 0]], pens: { home: 4, away: 3 } },
  }
  const set = sets[opts.goals ?? 'normal'] ?? sets.normal!
  const ids = { H: 'h', A: 'a' }
  return buildMatchPoster({
    match: { round: 10, date: '2026-10-25', time: '16:00', venue: 'Unidad Deportiva Peñasco · Cancha 2', status: 'finished', homeTeamId: 'h', awayTeamId: 'a', homeScore: set.score[0], awayScore: set.score[1], penalties: set.pens ?? null },
    stats: set.stats.map(([n, t, goals, ownGoals, yellowCards, redCards]) => ({ playerId: String(n), teamId: ids[t], goals, ownGoals, yellowCards, redCards })),
    playerName: (id) => NAMES[Number(id)] ?? null,
    home: team(h),
    away: team(a),
    crests: { home: crest(h), away: crest(a) },
    tournament: { name: 'Liga Municipal de Fútbol 7 · Apertura', startDate: '2026-08-01', endDate: null },
    leagueName: 'Liga Peñasco Interbarrios',
    logo: opts.noLogo ? null : LEAGUE_LOGO,
    roundLabel: 'Jornada 10',
  })
}

/** 7B-C: jornada con `count` resultados (marcadores fijos, uno con penales y uno en grupo) y `pending` por jugar. */
export function fixtureResults(format: PosterFormat, count: number, opts: { pending?: number; noLogo?: boolean; twoDays?: boolean; fixtures?: boolean } = {}): ResultsPosterData[] {
  const SCORES: [number, number][] = [[3, 1], [0, 0], [2, 2], [1, 4], [5, 0], [2, 1], [1, 1], [0, 2], [3, 3], [4, 2], [1, 0], [2, 3]]
  const n = Math.min(count, 20)
  const matches = Array.from({ length: n + (opts.pending ?? 0) }, (_, i) => {
    const [hs, as] = SCORES[i % SCORES.length]!
    const played = i < n
    if (opts.fixtures) {
      // 7B-D: `count` por jugar (programados, cada 2 h) y `pending` pospuestos sin horario.
      return {
        id: `m${i}`,
        status: played ? 'scheduled' : 'postponed',
        pendingSchedule: !played,
        date: opts.twoDays && i % 2 ? '2026-10-26' : '2026-10-25',
        time: `${String(8 + ((i * 2) % 12)).padStart(2, '0')}:00`,
        venue: `Unidad Deportiva Peñasco · Cancha ${(i % 3) + 1}`,
        homeTeamId: `t${(i * 2) % 24}`,
        awayTeamId: `t${(i * 2 + 1) % 24}`,
        homeScore: null,
        awayScore: null,
        stage: i === 1 ? { group: 'A' } : null,
      }
    }
    return {
      id: `m${i}`,
      status: played ? 'finished' : 'scheduled',
      date: opts.twoDays && i % 2 ? '2026-10-26' : '2026-10-25',
      homeTeamId: `t${(i * 2) % 24}`,
      awayTeamId: `t${(i * 2 + 1) % 24}`,
      homeScore: played ? hs : null,
      awayScore: played ? as : null,
      penalties: played && i === 2 ? { home: 4, away: 3 } : null,
    }
  })
  const teams = Object.fromEntries(TEAMS.map((t, i) => [`t${i}`, { name: t[0], shortName: null, colors: { primary: t[1], secondary: t[2] } }]))
  const crests = Object.fromEntries(TEAMS.map((t, i) => [`t${i}`, t[3] ? crestSvg(t[0], t[1], t[2], i) : null]))
  return (opts.fixtures ? buildFixturePages : buildResultPages)({
    matches,
    teams,
    crests,
    tournament: { name: 'Liga Municipal de Fútbol 7 · Apertura', startDate: '2026-08-01', endDate: null },
    leagueName: 'Liga Peñasco Interbarrios',
    logo: opts.noLogo ? null : LEAGUE_LOGO,
    roundNumber: 10,
    roundLabel: 'Jornada 10',
    format,
  })
}
