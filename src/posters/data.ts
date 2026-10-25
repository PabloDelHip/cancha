/**
 * 7B-A — datos de una publicación de tabla de posiciones. Todo sale de Kisokar: la tabla es la que
 * calcula el servidor (`PhaseView.table`, la misma del panel); aquí solo se ordena en páginas y se
 * preparan los textos. Nada se inventa ni se recalcula.
 */
import type { ID, Standing, TeamColors } from '@/types'

export type PosterFormat = 'story' | 'portrait' | 'square'

export const FORMATS: Record<PosterFormat, { label: string; width: number; height: number; hint: string }> = {
  story: { label: 'Historia', width: 1080, height: 1920, hint: '1080 × 1920 · estados e historias' },
  portrait: { label: 'Publicación vertical', width: 1080, height: 1350, hint: '1080 × 1350 · feed' },
  square: { label: 'Cuadrada', width: 1080, height: 1080, hint: '1080 × 1080 · feed y WhatsApp' },
}

/** Máximo de filas legibles por imagen; con más equipos se reparten en varias imágenes. */
export const MAX_ROWS: Record<PosterFormat, number> = { story: 24, portrait: 16, square: 10 }

export interface PosterRow {
  position: number
  teamId: ID
  name: string
  /** Iniciales para el escudo de reserva (equipos sin escudo o con escudo que no carga). */
  initials: string
  /** Escudo como data URL (o null: se dibuja el de reserva). */
  crest: string | null
  colors: { primary: string; secondary: string }
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  /** Clasifica (zona marcada en la tabla del torneo). */
  qualifies: boolean
  withdrawn: boolean
}

export interface PosterData {
  tournamentName: string
  leagueName: string | null
  season: string
  /** «Jornada 9», «Grupo A · Jornada 3»… o «Antes de la jornada 1». */
  roundLabel: string
  /** Número de la jornada para títulos grandes (null = aún sin partidos). */
  roundNumber: number | null
  groupLabel: string | null
  /** «Actualizado al 6 mar 2027». */
  cutLabel: string | null
  logo: string | null
  logoInitials: string
  rows: PosterRow[]
  page: { index: number; total: number }
  /** Todos los equipos de la tabla (para «Posiciones 9–16 de 16»). */
  totalTeams: number
}

const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'fc', 'cf', 'club', 'deportivo', 'atlético', 'atletico'])

/** Iniciales legibles: «Club Deportivo Águilas del Norte» → «AN»; «Leones» → «LEO». */
export function initialsOf(name: string, shortName?: string | null): string {
  if (shortName && shortName.trim().length <= 4) return shortName.trim().toUpperCase()
  const words = name.replace(/\./g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const meaningful = words.filter((w) => !STOP.has(w.toLowerCase()))
  const use = meaningful.length ? meaningful : words
  if (use.length === 1) return use[0]!.slice(0, 3).toUpperCase()
  return use
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

/** Temporada a partir de las fechas del torneo: «2027» o «2026–2027». */
export function seasonOf(startDate: string, endDate: string | null): string {
  const a = startDate.slice(0, 4)
  const b = endDate?.slice(0, 4)
  return b && b !== a ? `${a}–${b}` : a
}

/** Reparte las filas en páginas parejas (16 en cuadrada → 8 + 8, no 10 + 6). */
export function paginate<T>(rows: T[], format: PosterFormat, max = MAX_ROWS[format]): T[][] {
  if (rows.length <= max) return [rows]
  const pages = Math.ceil(rows.length / max)
  const size = Math.ceil(rows.length / pages)
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

export interface BuildInput {
  table: Standing[]
  teams: Record<ID, { name: string; shortName?: string | null; colors?: TeamColors } | undefined>
  crests: Record<ID, string | null>
  qualifyCount: number
  withdrawn: ID[]
  tournament: { name: string; startDate: string; endDate: string | null }
  leagueName: string | null
  logo: string | null
  /** Última jornada con algún partido finalizado (null = ninguno). */
  lastRound: { number: number; label: string } | null
  lastPlayedDate: string | null
  groupLabel: string | null
  format: PosterFormat
  formatDate: (iso: string) => string
  /** Textos que el organizador puede ajustar (solo texto plano). */
  overrides?: { title?: string; season?: string; roundLabel?: string }
}

/** Una PosterData por imagen. */
export function buildPosterPages(input: BuildInput): PosterData[] {
  const rows: PosterRow[] = input.table.map((s) => {
    const team = input.teams[s.teamId]
    const name = team?.name?.trim() || 'Equipo'
    return {
      position: s.position,
      teamId: s.teamId,
      name,
      initials: initialsOf(name, team?.shortName),
      crest: input.crests[s.teamId] ?? null,
      colors: { primary: team?.colors?.primary || '#3f3f46', secondary: team?.colors?.secondary || '#ffffff' },
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalDifference,
      points: s.points,
      qualifies: s.position <= input.qualifyCount,
      withdrawn: input.withdrawn.includes(s.teamId),
    }
  })
  const base = input.lastRound ? input.lastRound.label : 'Antes de la jornada 1'
  const roundLabel = input.overrides?.roundLabel?.trim() || (input.groupLabel ? `${input.groupLabel} · ${base}` : base)
  const pages = paginate(rows, input.format)
  return pages.map((page, index) => ({
    tournamentName: input.overrides?.title?.trim() || input.tournament.name,
    leagueName: input.leagueName,
    season: input.overrides?.season?.trim() || seasonOf(input.tournament.startDate, input.tournament.endDate),
    roundLabel,
    roundNumber: input.lastRound?.number ?? null,
    groupLabel: input.groupLabel,
    cutLabel: input.lastPlayedDate ? `Actualizado al ${input.formatDate(input.lastPlayedDate)}` : null,
    logo: input.logo,
    logoInitials: initialsOf(input.tournament.name),
    rows: page,
    page: { index, total: pages.length },
    totalTeams: rows.length,
  }))
}

/** «+12», «0», «−3» (signo menos tipográfico). */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0')

/** Nombre de archivo seguro: «tabla-liga-primavera-j9-1de2.png». */
export function fileNameOf(data: Pick<PosterData, 'tournamentName' | 'roundNumber' | 'page'>, template: string) {
  const slug = data.tournamentName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const page = data.page.total > 1 ? `-${data.page.index + 1}de${data.page.total}` : ''
  return `tabla-${slug || 'torneo'}${data.roundNumber ? `-j${data.roundNumber}` : ''}-${template}${page}.png`
}

/** Una tabla que se puede publicar: la de la liga (o fase regular) o la de cada grupo. */
export interface TableOption {
  key: string
  label: string
  /** Para el título (null = liga, sin grupo). */
  groupLabel: string | null
  phase: number
  group: string | null
  table: Standing[]
  qualifyCount: number
}

type PhaseLike =
  | { index: number; type: 'league'; table: Standing[]; qualification: { count: number } | null }
  | { index: number; type: 'groups'; groups: { key: string; table: Standing[]; qualification: { count: number } }[] }
  | { index: number; type: 'knockout' }

/** Tablas de la estructura del torneo, tal como las calcula el servidor (solo las que tienen equipos). */
export function tableOptions(phases: PhaseLike[]): TableOption[] {
  const out: TableOption[] = []
  for (const p of phases) {
    if (p.type === 'league' && p.table.length) {
      out.push({ key: `p${p.index}`, label: phases.length > 1 ? 'Fase regular' : 'Tabla general', groupLabel: null, phase: p.index, group: null, table: p.table, qualifyCount: p.qualification?.count ?? 0 })
    }
    if (p.type === 'groups') {
      for (const g of p.groups) if (g.table.length) out.push({ key: `p${p.index}-${g.key}`, label: `Grupo ${g.key}`, groupLabel: `Grupo ${g.key}`, phase: p.index, group: g.key, table: g.table, qualifyCount: g.qualification.count })
    }
  }
  return out
}

/**
 * Corte de resultados: la última jornada con algún partido FINALIZADO de esa tabla y la fecha del
 * último. Sin partidos jugados, null (el título dice «Antes de la jornada 1»).
 */
export function lastPlayed(
  matches: { status: string; round: number; date: string; stage?: { phase: number; group: string | null } | null }[],
  option: Pick<TableOption, 'phase' | 'group'>,
): { round: number; date: string } | null {
  const played = matches.filter((m) => m.status === 'finished' && (m.stage ? m.stage.phase === option.phase && (option.group === null || m.stage.group === option.group) : option.phase === 0 && option.group === null))
  if (!played.length) return null
  return { round: Math.max(...played.map((m) => m.round)), date: played.map((m) => m.date).sort().at(-1)! }
}

/** «Liga Norte · 2027», salvo que el texto ya diga la temporada («Liga Norte 2027» no se repite). */
export const withSeason = (text: string, season: string) => (season && !text.includes(season) ? `${text} · ${season}` : text)

// ─── 7B-B1: próximo partido ──────────────────────────────────────────────────

/** Un equipo en el cartel de un partido. */
export interface PosterTeam {
  name: string
  initials: string
  crest: string | null
  colors: { primary: string; secondary: string }
}

export interface MatchPosterData {
  tournamentName: string
  leagueName: string | null
  season: string
  /** «Jornada 9», «Grupo A · Jornada 3» o el nombre propio de la jornada. */
  roundLabel: string
  roundNumber: number
  groupLabel: string | null
  home: PosterTeam
  away: PosterTeam
  /** «Domingo 25 de octubre» (null = sin horario confirmado). */
  dateLabel: string | null
  /** «16:00» (null = sin hora). */
  timeLabel: string | null
  /** Sede (y cancha) tal como está en el partido; null = no se muestra. */
  venue: string | null
  /** Aviso cuando falta la programación: «Fecha y hora por confirmar». */
  scheduleNote: string | null
  logo: string | null
  logoInitials: string
  /** 7B-E: el partido ya terminó (null = cartel de próximo partido). */
  final: FinalResult | null
}

/** 7B-E: un goleador en el cartel de resultado final. `own`: autogol (suma al otro equipo). */
export interface FinalGoal {
  name: string
  count: number
  own: boolean
}

/** 7B-E: amonestado o expulsado (un rectángulo por tarjeta, en el orden en que se ven). */
export interface FinalCard {
  name: string
  yellow: number
  red: number
}

export interface FinalSide {
  goals: FinalGoal[]
  cards: FinalCard[]
}

export interface FinalResult {
  homeScore: number
  awayScore: number
  /** Quién ganó (por marcador o, igualado, por penales); null = empate. */
  winner: 'home' | 'away' | null
  /** «Penales 4-3» o «Tiempo extra» (null = nada que aclarar). */
  detail: string | null
  home: FinalSide
  away: FinalSide
  /** Renglones del lado más largo (goles + tarjetas): con él cada plantilla ajusta la letra. */
  lines: number
}

/** Estadística de un jugador en el partido, tal como la guarda el acta. */
export interface FinalStat {
  playerId: ID
  teamId: ID
  goals: number
  ownGoals?: number
  yellowCards: number
  redCards: number
}

export interface MatchBuildInput {
  match: {
    round: number
    date: string
    time: string
    venue: string | null
    status: string
    pendingSchedule?: boolean
    stage?: { group: string | null } | null
    homeTeamId?: ID
    awayTeamId?: ID
    homeScore?: number | null
    awayScore?: number | null
    penalties?: { home: number; away: number } | null
    extraTime?: boolean
  }
  /** 7B-E: estadísticas del partido terminado y el nombre corto de cada jugador (null = no se muestra). */
  stats?: FinalStat[]
  playerName?: (playerId: ID) => string | null
  home: { name: string; shortName?: string | null; colors?: TeamColors } | undefined
  away: { name: string; shortName?: string | null; colors?: TeamColors } | undefined
  crests: { home: string | null; away: string | null }
  tournament: { name: string; startDate: string; endDate: string | null }
  leagueName: string | null
  logo: string | null
  roundLabel: string
  overrides?: { title?: string; season?: string; roundLabel?: string }
}

/** Partidos que se pueden anunciar: programados y pospuestos (estos, sin fecha). */
export const canAnnounce = (m: { status: string }) => m.status === 'scheduled' || m.status === 'postponed'

const posterTeam = (t: MatchBuildInput['home'], crest: string | null): PosterTeam => {
  const name = t?.name?.trim() || 'Equipo'
  return { name, initials: initialsOf(name, t?.shortName), crest, colors: { primary: t?.colors?.primary || '#3f3f46', secondary: t?.colors?.secondary || '#ffffff' } }
}

/** «Domingo 25 de octubre» (la fecha del partido es local, sin zona horaria). */
export function matchDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const text = new Date(y!, m! - 1, d!).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Datos del cartel. Solo se muestra el horario de un partido programado: un pospuesto (o uno que
 * nunca tuvo horario, `pendingSchedule`) conserva una fecha de referencia que NO es su horario, así
 * que sale «por confirmar». Sede vacía = no se muestra. Nada se inventa.
 */
export function buildMatchPoster(input: MatchBuildInput): MatchPosterData {
  const { match } = input
  const final = isFinal(match) ? buildFinal(input) : null
  const confirmed = (match.status === 'scheduled' && !match.pendingSchedule) || final !== null
  const time = confirmed && /^\d{2}:\d{2}$/.test(match.time) ? match.time : null
  const group = match.stage?.group ? `Grupo ${match.stage.group}` : null
  const base = input.overrides?.roundLabel?.trim() || input.roundLabel
  return {
    tournamentName: input.overrides?.title?.trim() || input.tournament.name,
    leagueName: input.leagueName,
    season: input.overrides?.season?.trim() || seasonOf(input.tournament.startDate, input.tournament.endDate),
    roundLabel: base,
    roundNumber: match.round,
    groupLabel: group,
    home: posterTeam(input.home, input.crests.home),
    away: posterTeam(input.away, input.crests.away),
    dateLabel: confirmed && match.date ? matchDayLabel(match.date) : null,
    // Ya jugado: el día basta (la hora de inicio no aporta al resultado).
    timeLabel: final ? null : time,
    venue: match.venue?.trim() || null,
    scheduleNote: final ? null : confirmed ? (time ? null : 'Hora por confirmar') : 'Fecha y hora por confirmar',
    logo: input.logo,
    logoInitials: initialsOf(input.tournament.name),
    final,
  }
}

/** 7B-E: partido que admite el cartel de resultado final: finalizado y con marcador capturado. */
export const isFinal = (m: { status: string; homeScore?: number | null; awayScore?: number | null }) =>
  m.status === 'finished' && m.homeScore != null && m.awayScore != null

/**
 * 7B-E: marcador, goleadores y tarjetas, tal como están en el acta. Los autogoles van del lado del
 * equipo al que sumaron. Sin minutos (el acta no los guarda) y sin inventar: un jugador sin nombre
 * no se muestra y, si el acta no tiene el detalle, solo queda el marcador.
 */
function buildFinal(input: MatchBuildInput): FinalResult {
  const m = input.match
  const hs = m.homeScore!
  const as = m.awayScore!
  const pens = m.penalties ?? null
  const winner = hs > as ? 'home' : as > hs ? 'away' : pens && pens.home !== pens.away ? (pens.home > pens.away ? 'home' : 'away') : null
  const side = (): FinalSide => ({ goals: [], cards: [] })
  const sides = { home: side(), away: side() }
  for (const st of input.stats ?? []) {
    const own = st.teamId === m.homeTeamId ? 'home' : st.teamId === m.awayTeamId ? 'away' : null
    const name = own ? input.playerName?.(st.playerId)?.trim() : null
    if (!own || !name) continue
    const other = own === 'home' ? 'away' : 'home'
    if (st.goals > 0) sides[own].goals.push({ name, count: st.goals, own: false })
    if ((st.ownGoals ?? 0) > 0) sides[other].goals.push({ name, count: st.ownGoals!, own: true })
    if (st.yellowCards > 0 || st.redCards > 0) sides[own].cards.push({ name, yellow: st.yellowCards, red: st.redCards })
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'es')
  for (const x of [sides.home, sides.away]) {
    // Más goles primero; los autogoles al final. Expulsados antes que amonestados.
    x.goals.sort((a, b) => Number(a.own) - Number(b.own) || b.count - a.count || byName(a, b))
    x.cards.sort((a, b) => b.red - a.red || b.yellow - a.yellow || byName(a, b))
  }
  const lines = Math.max(...[sides.home, sides.away].map((x) => x.goals.length + x.cards.length))
  return { homeScore: hs, awayScore: as, winner, detail: pens ? `Penales ${pens.home}-${pens.away}` : m.extraTime ? 'Tiempo extra' : null, ...sides, lines }
}

const slugOf = (s: string, max = 40) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max)

/** «partido-halcones-vs-leones-j9-urban-black.png». */
export const matchFileNameOf = (d: MatchPosterData, template: string) =>
  `${d.final ? 'resultado' : 'partido'}-${slugOf(d.home.name, 24) || 'local'}-vs-${slugOf(d.away.name, 24) || 'visita'}-j${d.roundNumber}-${template}.png`

// ─── 7B-C: resultados de la jornada ──────────────────────────────────────────

export interface ResultRow {
  kind: 'result'
  id: ID
  home: PosterTeam
  away: PosterTeam
  homeScore: number
  awayScore: number
  /** Quién ganó (por marcador o, igualado, por penales); null = empate. */
  winner: 'home' | 'away' | null
  /** «Grupo A · Penales 4-3», «Tiempo extra»… (null = nada que aclarar). */
  detail: string | null
}

/** 7B-D: un partido por jugar en la imagen de horarios de la jornada. */
export interface FixtureRow {
  kind: 'fixture'
  id: ID
  home: PosterTeam
  away: PosterTeam
  /** «16:00» solo si el partido está programado con hora; null = «Por confirmar». */
  time: string | null
  /** Siempre null: aún no hay ganador (comparte la forma de ResultRow). */
  winner: null
  /** «Sáb 24 oct · Unidad Deportiva · Cancha 2 · Grupo A» (null = nada que aclarar). */
  detail: string | null
}

export type RoundRow = ResultRow | FixtureRow

/** Imagen de una jornada: sus resultados (7B-C) o sus horarios (7B-D); las mismas plantillas. */
export interface RoundPosterData {
  mode: 'results' | 'fixtures'
  tournamentName: string
  leagueName: string | null
  season: string
  roundLabel: string
  roundNumber: number
  /** «Domingo 25 de octubre» si todos son (o fueron) el mismo día (si no, null). */
  dateLabel: string | null
  /** Nota al pie: «2 partidos por jugar» (resultados) o «1 partido ya jugado» (horarios). */
  note: string | null
  rows: RoundRow[]
  page: { index: number; total: number }
  logo: string | null
  logoInitials: string
}

/** Compatibilidad con 7B-C. */
export type ResultsPosterData = RoundPosterData

type ResultMatch = {
  id: ID
  status: string
  date: string
  homeTeamId: ID
  awayTeamId: ID
  homeScore: number | null
  awayScore: number | null
  penalties?: { home: number; away: number } | null
  extraTime?: boolean
  stage?: { group: string | null } | null
  time?: string
  venue?: string | null
  pendingSchedule?: boolean
}

export interface ResultsBuildInput {
  /** Todos los partidos de la jornada (en el orden del calendario). */
  matches: ResultMatch[]
  teams: Record<ID, { name: string; shortName?: string | null; colors?: TeamColors } | undefined>
  crests: Record<ID, string | null>
  tournament: { name: string; startDate: string; endDate: string | null }
  leagueName: string | null
  logo: string | null
  roundNumber: number
  roundLabel: string
  format: PosterFormat
  overrides?: { title?: string; season?: string; roundLabel?: string }
}

/**
 * Resultados por imagen. Con más de los que caben en una columna, la imagen se divide en dos
 * columnas (ver `SINGLE_COLUMN` en layout.ts); solo pasado este máximo se reparten en varias.
 */
export const MAX_RESULTS: Record<PosterFormat, number> = { story: 20, portrait: 14, square: 10 }

/** Un resultado publicable: partido finalizado con marcador capturado. */
const isResult = (m: ResultMatch) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null

/** Hay algo que publicar en esa jornada. */
export const hasResults = (matches: ResultMatch[]) => matches.some(isResult)

/**
 * Datos de la imagen de resultados. Solo partidos FINALIZADOS con marcador, tal como están
 * capturados: los que faltan no se muestran, se avisa cuántos quedan por jugar (los cancelados no
 * cuentan). Nada se inventa.
 */
export function buildResultPages(input: ResultsBuildInput): ResultsPosterData[] {
  const played = input.matches.filter(isResult)
  const pending = input.matches.filter((m) => !isResult(m) && m.status !== 'cancelled').length
  const rows: ResultRow[] = played.map((m) => {
    const hs = m.homeScore!
    const as = m.awayScore!
    const pens = m.penalties ?? null
    const winner = hs > as ? 'home' : as > hs ? 'away' : pens && pens.home !== pens.away ? (pens.home > pens.away ? 'home' : 'away') : null
    const detail = [m.stage?.group ? `Grupo ${m.stage.group}` : null, pens ? `Penales ${pens.home}-${pens.away}` : m.extraTime ? 'Tiempo extra' : null].filter(Boolean).join(' · ')
    return {
      kind: 'result' as const,
      id: m.id,
      home: posterTeam(input.teams[m.homeTeamId], input.crests[m.homeTeamId] ?? null),
      away: posterTeam(input.teams[m.awayTeamId], input.crests[m.awayTeamId] ?? null),
      homeScore: hs,
      awayScore: as,
      winner,
      detail: detail || null,
    }
  })
  const dates = new Set(played.map((m) => m.date).filter(Boolean))
  return roundPages(input, 'results', rows, dates.size === 1 ? matchDayLabel([...dates][0]!) : null, pending ? `${pending} ${pending === 1 ? 'partido' : 'partidos'} por jugar` : null)
}

function roundPages(input: ResultsBuildInput, mode: RoundPosterData['mode'], rows: RoundRow[], dateLabel: string | null, note: string | null): RoundPosterData[] {
  const pages = paginate(rows, input.format, MAX_RESULTS[input.format])
  return pages.map((page, index) => ({
    mode,
    tournamentName: input.overrides?.title?.trim() || input.tournament.name,
    leagueName: input.leagueName,
    season: input.overrides?.season?.trim() || seasonOf(input.tournament.startDate, input.tournament.endDate),
    roundLabel: input.overrides?.roundLabel?.trim() || input.roundLabel,
    roundNumber: input.roundNumber,
    dateLabel,
    note,
    rows: page,
    page: { index, total: pages.length },
    logo: input.logo,
    logoInitials: initialsOf(input.tournament.name),
  }))
}

// ─── 7B-D: horarios de la jornada ────────────────────────────────────────────

/** Programado con fecha y hora reales (no un pospuesto ni uno que nunca tuvo horario). */
const isConfirmed = (m: ResultMatch) => m.status === 'scheduled' && !m.pendingSchedule

/** Hay partidos por jugar que anunciar en esa jornada (programados o pospuestos). */
export const hasFixtures = (matches: ResultMatch[]) => matches.some(canAnnounce)

/** «Sáb 24 oct». */
export function shortDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  const day = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  const month = date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${d} ${month}`
}

/**
 * Datos de la imagen de horarios. Solo partidos por jugar (programados o pospuestos). Un
 * programado muestra su hora y su cancha; un pospuesto o uno sin horario (`pendingSchedule`) dice
 * «Por confirmar» y no muestra su fecha ni su cancha de referencia (no son su horario). Los
 * confirmados van primero, en orden de fecha y hora. Nada se inventa.
 */
export function buildFixturePages(input: ResultsBuildInput): RoundPosterData[] {
  const upcoming = input.matches.filter(canAnnounce)
  // Sin hora válida, al final de su día.
  const at = (m: ResultMatch) => `${m.date} ${m.time && /^\d{2}:\d{2}$/.test(m.time) ? m.time : '99:99'}`
  const confirmed = upcoming.filter(isConfirmed).sort((a, b) => at(a).localeCompare(at(b)))
  const unconfirmed = upcoming.filter((m) => !isConfirmed(m))
  const days = new Set(confirmed.map((m) => m.date).filter(Boolean))
  const rows: FixtureRow[] = [...confirmed, ...unconfirmed].map((m) => {
    const ok = isConfirmed(m)
    const time = ok && m.time && /^\d{2}:\d{2}$/.test(m.time) ? m.time : null
    const detail = [ok && days.size > 1 && m.date ? shortDayLabel(m.date) : null, ok ? m.venue?.trim() || null : null, m.stage?.group ? `Grupo ${m.stage.group}` : null].filter(Boolean).join(' · ')
    return {
      kind: 'fixture' as const,
      id: m.id,
      home: posterTeam(input.teams[m.homeTeamId], input.crests[m.homeTeamId] ?? null),
      away: posterTeam(input.teams[m.awayTeamId], input.crests[m.awayTeamId] ?? null),
      time,
      winner: null,
      detail: detail || null,
    }
  })
  const played = input.matches.filter(isResult).length
  return roundPages(input, 'fixtures', rows, days.size === 1 ? matchDayLabel([...days][0]!) : null, played ? `${played} ${played === 1 ? 'partido ya jugado' : 'partidos ya jugados'}` : null)
}

/** «horarios-liga-norte-j9-urban-black.png». */
export const fixturesFileNameOf = (d: RoundPosterData, template: string) =>
  `horarios-${slugOf(d.tournamentName) || 'torneo'}-j${d.roundNumber}-${template}${d.page.total > 1 ? `-${d.page.index + 1}de${d.page.total}` : ''}.png`

/** «resultados-liga-norte-j9-urban-black-1de2.png». */
export const resultsFileNameOf = (d: ResultsPosterData, template: string) =>
  `resultados-${slugOf(d.tournamentName) || 'torneo'}-j${d.roundNumber}-${template}${d.page.total > 1 ? `-${d.page.index + 1}de${d.page.total}` : ''}.png`
