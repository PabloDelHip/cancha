/**
 * Traducción entre los contratos de la API (NestJS) y el modelo de dominio del frontend.
 * Es el único lugar que conoce las diferencias de nomenclatura:
 *   - enums en MAYÚSCULAS (GOALKEEPER, FOOTBALL_7, SCHEDULED…) ↔ valores cortos del front;
 *   - jerseyNumber ↔ shirtNumber, format ↔ modality, membership.active ↔ status;
 *   - estadísticas con played=false (el front cuenta cada registro como partido jugado).
 * Las vistas y los stores siguen trabajando con los types de `@/types`.
 */
import type {
  TeamTournamentRecord,
  PlayerGoalkeeping,
  TeamPlayerStat,
  KnockoutTiebreak,
  PlayerCandidate,
  TrackedSummary,
  BracketTieView,
  KnockoutSeed,
  PhaseView,
  Qualification,
  SlotSource,
  TieLeg,
  TournamentStructure,
  FormResult,
  ID,
  Match,
  MatchInput,
  MatchStage,
  MatchStatus,
  Player,
  PlayerDetails,
  PlayerInput,
  PlayerProfile,
  PlayerHonor,
  RegistrationRequestSummary,
  RegistrationRequestDetail,
  RegistrationRequestStatus,
  RegistrationClosedReason,
  RegistrationAdminState,
  PublicRegistration,
  MyRegistrationTeam,
  SelectionProblemCode,
  PlayerHonorType,
  MilestoneType,
  PlayerRecords,
  ProfileMatch,
  ProfileTeamParticipation,
  PlayerMatchStats,
  PlayerPosition,
  Round,
  Standing,
  StatLine,
  Team,
  TeamHonor,
  TeamInput,
  TeamMatch,
  TeamProfile,
  TeamRecord,
  TeamRef,
  TeamMembership,
  Tournament,
  TournamentInput,
  TournamentModality,
  TournamentRef,
  TournamentSettings,
  TournamentStatus,
  TournamentTeam,
} from '@/types'
import { defaultSettings } from '@/utils/labels'

// ─── Contratos de la API ────────────────────────────────────────────────────

type ApiPosition = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD'
type ApiFormat = 'FOOTBALL_7' | 'FOOTBALL_11'
type ApiTournamentStatus = 'DRAFT' | 'ACTIVE' | 'FINISHED'
type ApiMatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED'

interface ApiTimestamps {
  createdAt: string
  updatedAt: string
}

type ApiSystem = 'LEAGUE' | 'KNOCKOUT' | 'GROUPS_KNOCKOUT' | 'LEAGUE_PLAYOFFS'

type ApiTiebreak = 'PENALTIES' | 'EXTRA_TIME' | 'BETTER_POSITION'
const toTiebreak = (t: ApiTiebreak | null | undefined): KnockoutTiebreak | null => (t ? (t.toLowerCase() as KnockoutTiebreak) : null)
const fromTiebreak = (t: KnockoutTiebreak | null): ApiTiebreak | null => (t ? (t.toUpperCase() as ApiTiebreak) : null)

export interface ApiTournamentSettings {
  system: ApiSystem
  pointsForWin: number
  pointsForDraw: number
  pointsForLoss: number
  pointsForShootoutWin?: number | null
  knockoutTiebreak?: ApiTiebreak
  finalTiebreak?: ApiTiebreak | null
  reseed?: boolean
  roundRobinLegs?: 1 | 2
  knockoutLegs?: 1 | 2
  groupCount?: number | null
  qualifiersPerGroup?: number | null
  playoffTeams?: number | null
}

export interface ApiTournament extends ApiTimestamps {
  id: string
  leagueId?: string | null
  name: string
  format: ApiFormat
  category: string
  startDate: string
  endDate: string | null
  status: ApiTournamentStatus
  venue: string | null
  /** Ausente en torneos anteriores a Torneo Real V1: se asume Liga 3/1/0. */
  settings?: ApiTournamentSettings
  /** 6F. El servidor siempre lo envía (FULL si el documento es antiguo). */
  dataCoverage?: 'FULL' | 'PARTIAL'
  /** 6G. Vacío en FULL. */
  trackedTeamIds?: string[]
}

export interface ApiRound extends ApiTimestamps {
  id: string
  tournamentId: string
  number: number
  name: string | null
  date: string | null
}

export interface ApiTournamentTeam {
  id: string
  tournamentId: string
  teamId: string
  createdAt: string
}

export interface ApiTeam extends ApiTimestamps {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  colors: { primary: string; secondary: string }
  city: string | null
}

/** Representación pública: edad derivada, nunca la fecha de nacimiento. */
export interface ApiPlayer extends ApiTimestamps {
  id: string
  firstName: string
  lastName: string
  nickname?: string | null
  age: number | null
  position: ApiPosition
  photoUrl: string | null
}

/** Lo que recibe el custodio de la ficha (create/update, `/admin/players` con canEdit). */
export interface ApiPlayerDetails extends ApiPlayer {
  birthDate: string | null
}

export interface ApiMembership extends ApiTimestamps {
  id: string
  playerId: string
  teamId: string
  tournamentId: string
  jerseyNumber: number | null
  startDate: string
  endDate: string | null
  active: boolean
}

export interface ApiMatch extends ApiTimestamps {
  id: string
  tournamentId: string
  round: number
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  venue: string | null
  status: ApiMatchStatus
  homeScore: number | null
  awayScore: number | null
  stage?: MatchStage | null
  penalties?: { home: number; away: number } | null
  extraTime?: boolean
}

export interface ApiPlayerMatchStats {
  id: string
  matchId: string
  playerId: string
  teamId: string
  played: boolean
  goals: number
  assists: number
  ownGoals?: number
  yellowCards: number
  redCards: number
}

// ─── Enums ──────────────────────────────────────────────────────────────────

const POSITION: Record<PlayerPosition, ApiPosition> = { GK: 'GOALKEEPER', DEF: 'DEFENDER', MID: 'MIDFIELDER', FWD: 'FORWARD' }
const MODALITY: Record<TournamentModality, ApiFormat> = { F7: 'FOOTBALL_7', F11: 'FOOTBALL_11' }
const T_STATUS: Record<TournamentStatus, ApiTournamentStatus> = { draft: 'DRAFT', active: 'ACTIVE', finished: 'FINISHED' }
const M_STATUS: Record<MatchStatus, ApiMatchStatus> = {
  scheduled: 'SCHEDULED',
  live: 'LIVE',
  finished: 'FINISHED',
  postponed: 'POSTPONED',
  cancelled: 'CANCELLED',
}

function invert<K extends string, V extends string>(map: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<V, K>
}
const POSITION_IN = invert(POSITION)
export const MODALITY_IN = invert(MODALITY)
export const T_STATUS_IN = invert(T_STATUS)
const M_STATUS_IN = invert(M_STATUS)

/** Solo incluye en el payload las claves presentes (para PATCH parciales). */
function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

// ─── API → dominio ──────────────────────────────────────────────────────────

export function toTournament(t: ApiTournament): Tournament {
  return {
    id: t.id,
    leagueId: t.leagueId ?? null,
    name: t.name,
    modality: MODALITY_IN[t.format],
    category: t.category,
    startDate: t.startDate,
    endDate: t.endDate,
    status: T_STATUS_IN[t.status],
    venue: t.venue,
    settings: t.settings ? toSettings(t.settings) : defaultSettings(),
    dataCoverage: t.dataCoverage === 'PARTIAL' ? 'partial' : 'full',
    trackedTeamIds: t.dataCoverage === 'PARTIAL' ? (t.trackedTeamIds ?? []) : [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

const SYSTEM: Record<TournamentSettings['system'], ApiSystem> = {
  league: 'LEAGUE',
  knockout: 'KNOCKOUT',
  groups_knockout: 'GROUPS_KNOCKOUT',
  league_playoffs: 'LEAGUE_PLAYOFFS',
}
const SYSTEM_IN = invert(SYSTEM)
/** Sistema de competición desde el texto de la API (respuestas ligeras, p. ej. torneos de una liga). */
export const SYSTEM_IN_PUBLIC = (s: string): TournamentSettings['system'] => SYSTEM_IN[s as ApiSystem] ?? 'league'

function toSettings(s: ApiTournamentSettings): TournamentSettings {
  return {
    system: SYSTEM_IN[s.system] ?? 'league',
    points: { win: s.pointsForWin, draw: s.pointsForDraw, loss: s.pointsForLoss, shootoutWin: s.pointsForShootoutWin ?? null },
    roundRobinLegs: s.roundRobinLegs ?? 1,
    knockoutLegs: s.knockoutLegs ?? 1,
    knockoutTiebreak: toTiebreak(s.knockoutTiebreak) ?? 'penalties',
    finalTiebreak: toTiebreak(s.finalTiebreak),
    reseed: s.reseed ?? false,
    groupCount: s.groupCount ?? null,
    qualifiersPerGroup: s.qualifiersPerGroup ?? null,
    playoffTeams: s.playoffTeams ?? null,
  }
}

export function fromSettings(s: TournamentSettings): ApiTournamentSettings {
  const groups = s.system === 'groups_knockout'
  return {
    system: SYSTEM[s.system],
    pointsForWin: s.points.win,
    pointsForDraw: s.points.draw,
    pointsForLoss: s.points.loss,
    pointsForShootoutWin: s.points.shootoutWin ?? null,
    knockoutTiebreak: fromTiebreak(s.knockoutTiebreak) ?? 'PENALTIES',
    finalTiebreak: fromTiebreak(s.finalTiebreak),
    reseed: s.reseed,
    roundRobinLegs: s.roundRobinLegs,
    knockoutLegs: s.knockoutLegs,
    groupCount: groups ? s.groupCount : null,
    qualifiersPerGroup: groups ? s.qualifiersPerGroup : null,
    playoffTeams: s.system === 'league_playoffs' ? s.playoffTeams : null,
  }
}

export function toRound(r: ApiRound): Round {
  return { id: r.id, tournamentId: r.tournamentId, number: r.number, name: r.name, date: r.date }
}

export function toTournamentTeam(e: ApiTournamentTeam): TournamentTeam {
  return { id: e.id, tournamentId: e.tournamentId, teamId: e.teamId, joinedAt: e.createdAt }
}

export function toTeam(t: ApiTeam): Team {
  return {
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    logoUrl: t.logoUrl,
    colors: t.colors,
    city: t.city,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

export function toPlayerDetails(p: ApiPlayerDetails): PlayerDetails {
  return { ...toPlayer(p), birthDate: p.birthDate }
}

export function toPlayer(p: ApiPlayer): Player {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    nickname: p.nickname ?? null,
    age: p.age,
    position: POSITION_IN[p.position],
    photoUrl: p.photoUrl,
    // Reclamar perfiles aún no existe en el backend.
    userId: null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

export function toMembership(m: ApiMembership): TeamMembership {
  return {
    id: m.id,
    playerId: m.playerId,
    teamId: m.teamId,
    tournamentId: m.tournamentId,
    shirtNumber: m.jerseyNumber,
    startDate: m.startDate,
    endDate: m.endDate,
    status: m.active ? 'active' : 'ended',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

export function toMatch(m: ApiMatch): Match {
  return {
    id: m.id,
    tournamentId: m.tournamentId,
    round: m.round,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    date: m.date,
    time: m.time,
    venue: m.venue,
    status: M_STATUS_IN[m.status],
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    stage: m.stage ?? null,
    penalties: m.penalties ?? null,
    extraTime: m.extraTime ?? false,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

/** Fila de GET /tournaments/:id/standings: la tabla la calcula el backend (fuente de verdad). */
export interface ApiStanding {
  position: number
  teamId: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  form: FormResult[]
}

export function toStanding(s: ApiStanding): Standing {
  return {
    position: s.position,
    teamId: s.teamId,
    played: s.played,
    won: s.wins,
    drawn: s.draws,
    lost: s.losses,
    goalsFor: s.goalsFor,
    goalsAgainst: s.goalsAgainst,
    goalDifference: s.goalDifference,
    points: s.points,
    form: s.form,
  }
}

/** El frontend interpreta cada registro como partido jugado: se descartan los played=false. */
export function toPlayerMatchStats(rows: ApiPlayerMatchStats[]): PlayerMatchStats[] {
  return rows
    .filter((s) => s.played)
    .map((s) => ({
      id: s.id,
      matchId: s.matchId,
      playerId: s.playerId,
      teamId: s.teamId,
      goals: s.goals,
      assists: s.assists,
      ownGoals: s.ownGoals ?? 0,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
    }))
}

// ─── dominio → API ──────────────────────────────────────────────────────────

/**
 * El estado solo viaja al crear: después cambia con POST /tournaments/:id/start y /finish
 * (el PATCH del backend lo rechaza).
 */
export function fromTournamentInput(input: Partial<TournamentInput>, { withStatus = false } = {}) {
  return defined({
    leagueId: input.leagueId ?? undefined,
    name: input.name,
    format: input.modality && MODALITY[input.modality],
    category: input.category,
    startDate: input.startDate,
    endDate: input.endDate,
    status: withStatus && input.status ? T_STATUS[input.status] : undefined,
    venue: input.venue,
    settings: input.settings && fromSettings(input.settings),
    dataCoverage: input.dataCoverage && (input.dataCoverage === 'partial' ? 'PARTIAL' : 'FULL'),
    trackedTeamIds: input.trackedTeamIds,
  })
}

export function fromTeamInput(input: Partial<TeamInput>) {
  return defined({ ...input })
}

export function fromPlayerInput(input: Partial<PlayerInput>) {
  return defined({ ...input, position: input.position && POSITION[input.position] })
}

export function fromMatchInput(input: Partial<MatchInput>) {
  return defined({ ...input, status: input.status && M_STATUS[input.status] })
}

export function fromMatchStatus(status: MatchStatus): ApiMatchStatus {
  return M_STATUS[status]
}

// ─── Perfil del jugador ─────────────────────────────────────────────────────

interface ApiTournamentRef {
  id: string
  name: string
  status: ApiTournamentStatus
  category: string
  format: ApiFormat
  startDate: string
  endDate: string | null
  dataCoverage?: 'FULL' | 'PARTIAL'
}

type ApiTeamParticipation = Omit<ProfileTeamParticipation, 'shirtNumber'> & { jerseyNumber: number | null }

interface ApiProfileMatch extends Omit<ProfileMatch, 'tournament'> {
  tournament: { id: string; name: string } | null
  status: ApiMatchStatus
}

export interface ApiPlayerProfile {
  player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>
  currentParticipations: { tournament: ApiTournamentRef; team: TeamRef | null; jerseyNumber: number | null; startDate: string | null; stats: StatLine }[]
  career: PlayerProfile['career']
  form: FormResult[]
  competitions: {
    tournament: ApiTournamentRef
    system: ApiSystem | null
    stats: StatLine
    teams: ApiTeamParticipation[]
    topScorer: { goals: number; shared: boolean } | null
  }[]
  history: {
    year: string
    participations: (Omit<ApiTeamParticipation, 'stats'> & {
      tournament: { id: string; name: string; status: ApiTournamentStatus }
    })[]
  }[]
  recentMatches: ApiProfileMatch[]
  honors: (Omit<PlayerHonor, 'type' | 'decidedBy'> & { type: Uppercase<PlayerHonorType>; decidedBy?: 'LEAGUE_TABLE' | 'FINAL' })[]
  byYear: PlayerProfile['byYear']
  byTeam: PlayerProfile['byTeam']
  milestones: { type: Uppercase<MilestoneType>; value: number | null; match: ApiProfileMatch }[]
  records: Omit<PlayerRecords, 'mostGoalsInMatch' | 'mostAssistsInMatch'> & {
    mostGoalsInMatch: { value: number; match: ApiProfileMatch } | null
    mostAssistsInMatch: { value: number; match: ApiProfileMatch } | null
  }
  bestPerformances: ApiProfileMatch[]
  goalkeeping?: (Omit<PlayerGoalkeeping, 'milestones' | 'bestMatches'> & {
    milestones: { type: Uppercase<MilestoneType>; value: number | null; match: ApiProfileMatch }[]
    bestMatches: ApiProfileMatch[]
  }) | null
}

function toTournamentRef(t: ApiTournamentRef): TournamentRef {
  return {
    id: t.id,
    name: t.name,
    status: T_STATUS_IN[t.status],
    category: t.category,
    modality: MODALITY_IN[t.format],
    startDate: t.startDate,
    endDate: t.endDate,
    dataCoverage: t.dataCoverage === 'PARTIAL' ? 'partial' : 'full',
  }
}

function toProfileMatch(m: ApiProfileMatch): ProfileMatch {
  const { tournament, homeTeam, awayTeam, homeScore, awayScore, playerTeamId, result, stats } = m
  return { id: m.id, date: m.date, time: m.time, round: m.round, tournament, homeTeam, awayTeam, homeScore, awayScore, playerTeamId, result, stats }
}

/** jerseyNumber (API) ↔ shirtNumber (front), como en las memberships. */
function withShirt<T extends { jerseyNumber: number | null }>({ jerseyNumber, ...rest }: T) {
  return { ...rest, shirtNumber: jerseyNumber }
}

/** GET /players/:id/profile → modelo del front (solo nomenclatura; el cálculo es del backend). */
export function toPlayerProfile(p: ApiPlayerProfile): PlayerProfile {
  return {
    player: { ...p.player, nickname: p.player.nickname ?? null, position: POSITION_IN[p.player.position] },
    currentParticipations: p.currentParticipations.map((c) => ({ ...withShirt(c), tournament: toTournamentRef(c.tournament) })),
    career: p.career,
    form: p.form,
    competitions: p.competitions.map((c) => ({
      ...c,
      system: c.system ? SYSTEM_IN[c.system] : null,
      tournament: toTournamentRef(c.tournament),
      teams: c.teams.map(withShirt),
    })),
    history: p.history.map((h) => ({
      year: h.year,
      participations: h.participations.map((x) => ({ ...withShirt(x), tournament: { ...x.tournament, status: T_STATUS_IN[x.tournament.status] } })),
    })),
    recentMatches: p.recentMatches.map(toProfileMatch),
    honors: p.honors.map((h) => ({
      ...h,
      type: h.type.toLowerCase() as PlayerHonorType,
      decidedBy: h.decidedBy ? (h.decidedBy === 'FINAL' ? 'final' : 'league_table') : undefined,
    })),
    byYear: p.byYear,
    byTeam: p.byTeam,
    milestones: p.milestones.map((m) => ({ type: m.type.toLowerCase() as MilestoneType, value: m.value, match: toProfileMatch(m.match) })),
    records: {
      ...p.records,
      mostGoalsInMatch: p.records.mostGoalsInMatch && { value: p.records.mostGoalsInMatch.value, match: toProfileMatch(p.records.mostGoalsInMatch.match) },
      mostAssistsInMatch: p.records.mostAssistsInMatch && { value: p.records.mostAssistsInMatch.value, match: toProfileMatch(p.records.mostAssistsInMatch.match) },
    },
    bestPerformances: p.bestPerformances.map(toProfileMatch),
    goalkeeping: p.goalkeeping
      ? {
          ...p.goalkeeping,
          milestones: p.goalkeeping.milestones.map((m) => ({ type: m.type.toLowerCase() as MilestoneType, value: m.value, match: toProfileMatch(m.match) })),
          bestMatches: p.goalkeeping.bestMatches.map(toProfileMatch),
        }
      : null,
  }
}

/** Fila de GET /players/:id/matches (forma V1) → mismo modelo que los partidos del perfil. */
export interface ApiPlayerMatchRow {
  match: ApiMatch
  stats: ApiPlayerMatchStats
  isHome: boolean
  tournament: { id: string; name: string | null }
  team: TeamRef | null
  opponent: TeamRef | null
  result: FormResult
}

export function toProfileMatchFromRow(r: ApiPlayerMatchRow): ProfileMatch {
  return {
    id: r.match.id,
    date: r.match.date,
    time: r.match.time,
    round: r.match.round,
    tournament: r.tournament.name ? { id: r.tournament.id, name: r.tournament.name } : null,
    homeTeam: r.isHome ? r.team : r.opponent,
    awayTeam: r.isHome ? r.opponent : r.team,
    homeScore: r.match.homeScore ?? 0,
    awayScore: r.match.awayScore ?? 0,
    playerTeamId: r.stats.teamId as ID,
    result: r.result,
    stats: { goals: r.stats.goals, assists: r.stats.assists, yellowCards: r.stats.yellowCards, redCards: r.stats.redCards },
  }
}

// ─── Perfil del equipo ──────────────────────────────────────────────────────

interface ApiTeamRecord {
  matchesPlayed: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

export interface ApiTeamMatch {
  id: string
  date: string
  time: string
  round: number
  status: ApiMatchStatus
  tournament: { id: string; name: string } | null
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
  homeScore: number | null
  awayScore: number | null
  result: FormResult | null
}

type ApiStanding3 = { position: number; teams: number; points: number } | null

export interface ApiTeamProfile {
  team: TeamRef & { city: string | null }
  career: ApiTeamRecord & { competitions: number }
  form: FormResult[]
  currentParticipations: { tournament: ApiTournamentRef; standing: ApiStanding3 }[]
  competitions: { tournament: ApiTournamentRef; current: boolean; record: ApiTeamRecord; standing: ApiStanding3; finalStanding: ApiStanding3 }[]
  rosters: {
    tournament: { id: string; name: string; status: ApiTournamentStatus }
    players: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; jerseyNumber: number | null; active: boolean; appearances: number; goals: number }[]
  }[]
  topScorers: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; goals: number; assists: number; appearances: number }[]
  topAssists?: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; goals: number; assists: number; appearances: number }[]
  playerStats?: (Omit<TeamPlayerStat, 'player'> & { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'> })[]
  runnerUps?: { tournament: { id: string; name: string }; year: number }[]
  records?: {
    biggestWin: { match: ApiTeamMatch; goalsFor: number; goalsAgainst: number } | null
    biggestLoss: { match: ApiTeamMatch; goalsFor: number; goalsAgainst: number } | null
    cleanSheets: { count: number; played: number; rate: number | null }
    bestTournament: ApiTeamTournamentRecord | null
    worstTournament: ApiTeamTournamentRecord | null
  }
  recentMatches: ApiTeamMatch[]
  upcomingMatches: ApiTeamMatch[]
  history: {
    year: string
    competitions: { tournament: { id: string; name: string; status: ApiTournamentStatus }; record: ApiTeamRecord; finalStanding: ApiStanding3; current: boolean }[]
  }[]
  honors: (Omit<TeamHonor, 'decidedBy'> & { decidedBy: 'LEAGUE_TABLE' | 'FINAL' })[]
  /** 6B: plantilla global actual (opcional por compatibilidad con respuestas anteriores). */
  currentRoster?: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; joinedAt: string }[]
}

function toTeamRecord(r: ApiTeamRecord): TeamRecord {
  return {
    played: r.matchesPlayed,
    won: r.wins,
    drawn: r.draws,
    lost: r.losses,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    goalDifference: r.goalDifference,
  }
}

const toProfilePlayer = (p: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>) => ({
  id: p.id,
  firstName: p.firstName,
  lastName: p.lastName,
  position: POSITION_IN[p.position],
  photoUrl: p.photoUrl,
  age: p.age,
})

export function toTeamMatch(m: ApiTeamMatch): TeamMatch {
  return { ...m, status: M_STATUS_IN[m.status] }
}

/** GET /teams/:id/profile → modelo del front (solo nomenclatura; el cálculo es del backend). */
type ApiTeamTournamentRecord = { tournament: ApiTournamentRef; record: ApiTeamRecord; finalStanding: ApiStanding3; champion: boolean; pointsPerMatch: number }
const toTournamentRecord = (c: ApiTeamTournamentRecord | null | undefined): TeamTournamentRecord | null =>
  c ? { tournament: toTournamentRef(c.tournament), record: toTeamRecord(c.record), finalStanding: c.finalStanding, champion: c.champion, pointsPerMatch: c.pointsPerMatch } : null

export function toTeamProfile(p: ApiTeamProfile): TeamProfile {
  // La API agrupa plantillas aparte; la UI las muestra dentro de su competición (mismo torneo).
  const squads = new Map(
    p.rosters.map((r) => [
      r.tournament.id,
      r.players.map((e) => ({
        player: toProfilePlayer(e.player),
        shirtNumber: e.jerseyNumber,
        active: e.active,
        appearances: e.appearances,
        goals: e.goals,
      })),
    ]),
  )
  return {
    team: p.team,
    record: { ...toTeamRecord(p.career), competitions: p.career.competitions },
    form: p.form,
    competitions: p.competitions.map((c) => ({
      tournament: toTournamentRef(c.tournament),
      current: c.current,
      record: toTeamRecord(c.record),
      standing: c.standing,
      finalStanding: c.finalStanding,
      squad: squads.get(c.tournament.id) ?? [],
    })),
    topScorers: p.topScorers.map((s) => ({ player: toProfilePlayer(s.player), goals: s.goals, assists: s.assists, appearances: s.appearances })),
    topAssists: (p.topAssists ?? []).map((s) => ({ player: toProfilePlayer(s.player), goals: s.goals, assists: s.assists, appearances: s.appearances })),
    playerStats: (p.playerStats ?? []).map((s) => ({ ...s, player: toProfilePlayer(s.player) })),
    runnerUps: p.runnerUps ?? [],
    records: {
      biggestWin: p.records?.biggestWin ? { ...p.records.biggestWin, match: toTeamMatch(p.records.biggestWin.match) } : null,
      biggestLoss: p.records?.biggestLoss ? { ...p.records.biggestLoss, match: toTeamMatch(p.records.biggestLoss.match) } : null,
      cleanSheets: p.records?.cleanSheets ?? { count: 0, played: 0, rate: null },
      bestTournament: toTournamentRecord(p.records?.bestTournament),
      worstTournament: toTournamentRecord(p.records?.worstTournament),
    },
    recentMatches: p.recentMatches.map(toTeamMatch),
    upcomingMatches: p.upcomingMatches.map(toTeamMatch),
    history: p.history.map((h) => ({
      year: h.year,
      competitions: h.competitions.map((c) => ({
        tournament: { ...c.tournament, status: T_STATUS_IN[c.tournament.status] },
        record: toTeamRecord(c.record),
        finalStanding: c.finalStanding,
        current: c.current,
      })),
    })),
    currentRoster: (p.currentRoster ?? []).map((r) => ({ player: toProfilePlayer(r.player), joinedAt: r.joinedAt })),
    honors: p.honors.map((h) => ({ ...h, decidedBy: h.decidedBy === 'FINAL' ? 'final' : 'league_table' })),
  }
}

// ─── Estructura de competición ───────────────────────────────────────────────

type ApiSource = { type: 'SEED'; seed: number } | { type: 'WINNER'; round: number; slot: number } | { type: 'TEAM'; teamId: string }
interface ApiTie {
  round: number
  slot: number
  homeSource: ApiSource
  awaySource: ApiSource
  homeTeamId: string | null
  awayTeamId: string | null
  bye: boolean
  legs: (Omit<TieLeg, 'status'> & { status: ApiMatchStatus | null })[]
  aggregate: { home: number; away: number } | null
  tiebreak: ApiTiebreak
  winnerTeamId: string | null
  decidedBy: 'BYE' | 'SCORE' | 'PENALTIES' | 'POSITION' | null
  status: 'WAITING' | 'READY' | 'PLAYING' | 'NEEDS_PENALTIES' | 'DECIDED'
}
type ApiPhase =
  | { index: number; type: 'LEAGUE'; generated: boolean; complete: boolean; pending: number; table: ApiStanding[]; qualification: Qualification | null }
  | { index: number; type: 'GROUPS'; generated: boolean; complete: boolean; pending: number; groups: { key: string; teamIds: string[]; table: ApiStanding[]; qualification: Qualification }[] }
  | { index: number; type: 'KNOCKOUT'; generated: boolean; manual: boolean; reseed?: boolean; complete: boolean; legs: 1 | 2; seeds: KnockoutSeed[]; rounds: { round: number; name: string; ties: ApiTie[] }[]; championTeamId: string | null }

export interface ApiStructure {
  tournamentId: string
  status: ApiTournamentStatus
  settings: Omit<ApiTournamentSettings, 'pointsForWin' | 'pointsForDraw' | 'pointsForLoss'>
  phases: ApiPhase[]
  next: { index: number; type: 'LEAGUE' | 'GROUPS' | 'KNOCKOUT'; ready: boolean; blockers: string[]; seeds: KnockoutSeed[] | null } | null
  championTeamId: string | null
  tiebreaks: { phase: number; scope: string; order: string[] }[]
  teams: Record<string, TeamRef>
}

const lower = <T extends string>(s: T) => s.toLowerCase() as Lowercase<T>
const toSource = (s: ApiSource): SlotSource =>
  s.type === 'SEED' ? { type: 'seed', seed: s.seed } : s.type === 'TEAM' ? { type: 'team', teamId: s.teamId } : { type: 'winner', round: s.round, slot: s.slot }

function toTie(t: ApiTie): BracketTieView {
  return {
    ...t,
    homeSource: toSource(t.homeSource),
    awaySource: toSource(t.awaySource),
    legs: t.legs.map((l) => ({ ...l, extraTime: l.extraTime ?? false, status: l.status ? M_STATUS_IN[l.status] : null })),
    tiebreak: toTiebreak(t.tiebreak) ?? 'penalties',
    decidedBy: t.decidedBy ? lower(t.decidedBy) : null,
    status: lower(t.status),
  }
}

function toPhase(p: ApiPhase): PhaseView {
  if (p.type === 'LEAGUE') return { ...p, type: 'league', table: p.table.map(toStanding) }
  if (p.type === 'GROUPS') return { ...p, type: 'groups', groups: p.groups.map((g) => ({ ...g, table: g.table.map(toStanding) })) }
  return { ...p, type: 'knockout', reseed: p.reseed ?? false, rounds: p.rounds.map((r) => ({ ...r, ties: r.ties.map(toTie) })) }
}

/** GET /tournaments/:id/structure → modelo del front (solo nomenclatura). */
export function toStructure(s: ApiStructure): TournamentStructure {
  const { system, roundRobinLegs, knockoutLegs, knockoutTiebreak, finalTiebreak, reseed, groupCount, qualifiersPerGroup, playoffTeams } = toSettings({
    ...s.settings,
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
  })
  const rest = { system, roundRobinLegs, knockoutLegs, knockoutTiebreak, finalTiebreak, reseed, groupCount, qualifiersPerGroup, playoffTeams }
  return {
    tournamentId: s.tournamentId,
    status: T_STATUS_IN[s.status],
    settings: rest,
    phases: s.phases.map(toPhase),
    next: s.next ? { ...s.next, type: lower(s.next.type) } : null,
    championTeamId: s.championTeamId,
    tiebreaks: s.tiebreaks,
    teams: s.teams,
  }
}

// ─── Inscripción por link (Etapa 7) ─────────────────────────────────────────

type ApiRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
type ApiClosedReason = 'FINISHED' | 'DISABLED' | 'DEADLINE' | 'FULL'
export type ApiRequestSummary = Omit<RegistrationRequestSummary, 'status'> & { status: ApiRequestStatus }
export type ApiRequestDetail = Omit<RegistrationRequestDetail, 'status' | 'players'> & {
  status: ApiRequestStatus
  players: { player: (Omit<ApiPlayer, 'createdAt' | 'updatedAt'>) | null; problem: SelectionProblemCode | null }[]
}
export interface ApiRegistrationAdminState extends Omit<RegistrationAdminState, 'closedReason' | 'counts'> {
  closedReason: ApiClosedReason | null
  counts: Record<ApiRequestStatus, number>
}
export interface ApiPublicRegistration {
  tournament: { id: string; name: string; format: ApiFormat; category: string; startDate: string; endDate: string | null; venue: string | null; status: ApiTournamentStatus }
  registration: Omit<PublicRegistration['registration'], 'closedReason'> & { closedReason: ApiClosedReason | null }
}
export interface ApiMyRegistrationTeam extends Omit<MyRegistrationTeam, 'myRole' | 'requests'> {
  myRole: 'OWNER' | 'MANAGER'
  requests: ApiRequestSummary[]
}

const lowerCase = <T extends string>(v: string) => v.toLowerCase() as T
export const toRequestSummary = (r: ApiRequestSummary): RegistrationRequestSummary => ({ ...r, status: lowerCase<RegistrationRequestStatus>(r.status) })
export const toRequestDetail = (r: ApiRequestDetail): RegistrationRequestDetail => ({
  ...r,
  status: lowerCase<RegistrationRequestStatus>(r.status),
  players: r.players.map((p) => ({ player: p.player && toProfilePlayer(p.player), problem: p.problem })),
})
export const toRegistrationAdminState = (s: ApiRegistrationAdminState): RegistrationAdminState => ({
  ...s,
  closedReason: s.closedReason && lowerCase<RegistrationClosedReason>(s.closedReason),
  counts: Object.fromEntries(Object.entries(s.counts).map(([k, v]) => [k.toLowerCase(), v])) as RegistrationAdminState['counts'],
})
export const toPublicRegistration = (p: ApiPublicRegistration): PublicRegistration => ({
  tournament: {
    id: p.tournament.id,
    name: p.tournament.name,
    modality: MODALITY_IN[p.tournament.format],
    category: p.tournament.category,
    startDate: p.tournament.startDate,
    endDate: p.tournament.endDate,
    venue: p.tournament.venue,
    status: T_STATUS_IN[p.tournament.status],
  },
  registration: { ...p.registration, closedReason: p.registration.closedReason && lowerCase<RegistrationClosedReason>(p.registration.closedReason) },
})
export const toMyRegistrationTeam = (t: ApiMyRegistrationTeam): MyRegistrationTeam => ({
  ...t,
  myRole: t.myRole === 'OWNER' ? 'owner' : 'manager',
  requests: t.requests.map(toRequestSummary),
})

// ─── 6G: resumen de equipos en seguimiento ──────────────────────────────────

export interface ApiTrackedSummary {
  tournamentId: string
  trackedTeams: {
    team: TeamRef
    record: ApiTeamRecord
    form: FormResult[]
    lastMatch: ApiTeamMatch | null
    nextMatch: ApiTeamMatch | null
    topScorer: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; goals: number } | null
    topAssist: { player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>; assists: number } | null
    squadSize: number
  }[]
}

/** GET /tournaments/:id/tracked-summary → modelo del front (solo nomenclatura). */
export function toTrackedSummary(s: ApiTrackedSummary): TrackedSummary {
  return {
    tournamentId: s.tournamentId,
    trackedTeams: s.trackedTeams.map((c) => ({
      team: c.team,
      record: toTeamRecord(c.record),
      form: c.form,
      lastMatch: c.lastMatch && toTeamMatch(c.lastMatch),
      nextMatch: c.nextMatch && toTeamMatch(c.nextMatch),
      topScorer: c.topScorer && { player: toProfilePlayer(c.topScorer.player), goals: c.topScorer.goals },
      topAssist: c.topAssist && { player: toProfilePlayer(c.topAssist.player), assists: c.topAssist.assists },
      squadSize: c.squadSize,
    })),
  }
}

// ─── Posibles duplicados al registrar un jugador ────────────────────────────

export interface ApiPlayerCandidate {
  player: Omit<ApiPlayer, 'createdAt' | 'updatedAt'>
  teams: TeamRef[]
  tournaments: { id: string; name: string; status: ApiTournamentStatus }[]
  appearances: number
  match: 'EXACT' | 'SIMILAR'
}

export function toPlayerCandidate(c: ApiPlayerCandidate): PlayerCandidate {
  return {
    player: { ...c.player, nickname: c.player.nickname ?? null, position: POSITION_IN[c.player.position] },
    teams: c.teams,
    tournaments: c.tournaments.map((t) => ({ ...t, status: T_STATUS_IN[t.status] })),
    appearances: c.appearances,
    match: c.match === 'EXACT' ? 'exact' : 'similar',
  }
}
