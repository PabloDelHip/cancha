import type { TournamentInformation, TournamentRegistrationInfo } from './tournamentInformation'
export type { TournamentInformation, TournamentRegistrationInfo, ContactField } from './tournamentInformation'
/**
 * Modelo de dominio.
 *
 * Relaciones conceptuales (ver README):
 *   Player ─< TeamMembership >─ Team        (un jugador cambia de equipo sin perder su historial)
 *   Tournament ─< TournamentTeam >─ Team    (un equipo puede jugar varios torneos)
 *   Match ─< PlayerMatchStats >─ Player     (las estadísticas pertenecen al contexto de un partido)
 *   User ─ ─ ─ Player (opcional)            (un jugador puede reclamar su perfil con una cuenta)
 *
 * Los ids son strings para mapear directamente a ObjectId de MongoDB.
 */

export type ID = string
/** Fecha ISO `YYYY-MM-DD`. */
export type ISODate = string
/** Fecha-hora ISO 8601. */
export type ISODateTime = string

interface Timestamps {
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

// ─── Usuarios ───────────────────────────────────────────────────────────────

/** Por ahora toda cuenta es de organizador. Sin RBAC: la autorización se basa en ownership. */
/**
 * LEGACY: rol de plataforma de V1 (toda cuenta es ORGANIZER). No es un tipo de cuenta y no se muestra:
 * los roles de una persona salen de sus relaciones (organiza un torneo, administra un equipo…).
 */
export type UserRole = 'ORGANIZER'

/**
 * Cuenta del sistema (quien inicia sesión). NO es un Player: un organizador registra
 * jugadores que nunca crean cuenta. Nunca contiene la contraseña.
 * Vincular User ↔ Player (reclamar perfil) queda para una etapa posterior.
 */
export interface User {
  id: ID
  firstName: string
  lastName: string
  email: string
  role: UserRole
}

// ─── Jugadores ──────────────────────────────────────────────────────────────

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

/**
 * Identidad deportiva (representación PÚBLICA). Existe aunque la persona no tenga cuenta.
 * No conoce su equipo: esa relación vive en TeamMembership.
 * De la fecha de nacimiento solo se publica la edad; la fecha exacta solo la ve el custodio
 * de la ficha (ver `PlayerDetails`).
 */
export interface Player extends Timestamps {
  id: ID
  firstName: string
  lastName: string
  /** Apodo opcional ("Bigotes"): se busca y se muestra; no identifica a nadie por sí solo. */
  nickname: string | null
  /** Edad derivada por el servidor; null si no se registró la fecha de nacimiento. */
  age: number | null
  position: PlayerPosition
  photoUrl: string | null
  /** Se llenará cuando un User reclame este perfil (no implementado todavía). */
  userId: ID | null
  /** Usuario que registró la ficha (custodio). No es dueño de su historia deportiva. */
  createdBy?: ID | null
}

export type MembershipStatus = 'active' | 'ended'

/**
 * Participación de un jugador (global) con un equipo (global) DENTRO de un torneo.
 * La administra el organizador del torneo. Un jugador puede participar a la vez en varios
 * torneos con equipos distintos; dentro de un mismo torneo, con un solo equipo a la vez.
 */
export interface TeamMembership extends Timestamps {
  id: ID
  playerId: ID
  teamId: ID
  tournamentId: ID
  shirtNumber: number | null
  startDate: ISODate
  endDate: ISODate | null
  status: MembershipStatus
}

// ─── Equipos ────────────────────────────────────────────────────────────────

export interface TeamColors {
  primary: string
  secondary: string
}

export interface CoverPosition {
  x: number
  y: number
}

export interface Team extends Timestamps {
  id: ID
  name: string
  shortName: string
  logoUrl: string | null
  colors: TeamColors
  city: string | null
  /** Foto de portada del perfil; sin ella se ve la portada con los colores del equipo. */
  coverUrl?: string | null
  /** Encuadre de la portada: punto de la foto (en %) que queda al centro. */
  coverPosition?: CoverPosition
  /** Usuario que registró el equipo (auditoría). NO es su propietario: eso es TeamAdmin (6A). */
  createdBy?: ID | null
}

// ─── Torneos ────────────────────────────────────────────────────────────────

export type TournamentModality = 'F7' | 'F11'
/**
 * Ciclo de vida: draft (configuración) → active (en curso) → finished (histórico, solo lectura).
 */
export type TournamentStatus = 'draft' | 'active' | 'finished'

/** Formato de competición: una secuencia de fases (liga, grupos, eliminatoria). */
export type CompetitionSystem = 'league' | 'knockout' | 'groups_knockout' | 'league_playoffs'

export interface PointsRule {
  win: number
  draw: number
  loss: number
  /** Empate definido en penales: puntos EXTRA para el ganador de la tanda. null = sin penales en empates. */
  shootoutWin?: number | null
}

/**
 * Llave de eliminatoria igualada: penales directo, tiempos extra (y penales si sigue igualada) o pasa
 * el mejor posicionado de la fase regular (solo liga + playoffs).
 */
export type KnockoutTiebreak = 'penalties' | 'extra_time' | 'better_position'

/** Configuración deportiva del torneo. Desempate de tablas fijo: puntos → DG → GF. */
export interface TournamentSettings {
  system: CompetitionSystem
  points: PointsRule
  /** Vueltas de liga o de grupos. */
  roundRobinLegs: 1 | 2
  /** Partidos por eliminatoria: 1 = partido único, 2 = ida y vuelta. */
  knockoutLegs: 1 | 2
  /** Regla de las llaves igualadas y, si es distinta, la de la final (null = la misma). */
  knockoutTiebreak: KnockoutTiebreak
  finalTiebreak: KnockoutTiebreak | null
  /** Reacomodo (liguilla): la 1ª ronda sale de la siembra y las siguientes las arma el organizador. false = cuadro fijo. */
  reseed: boolean
  groupCount: number | null
  qualifiersPerGroup: number | null
  playoffTeams: number | null
}

export type DataCoverage = 'full'

export interface Tournament extends Timestamps {
  id: ID
  /** Liga a la que pertenece (todo torneo vive en una; el modo demo no tiene ligas). */
  leagueId?: ID | null
  name: string
  modality: TournamentModality
  category: string
  startDate: ISODate
  endDate: ISODate | null
  status: TournamentStatus
  venue: string | null
  settings: TournamentSettings
  information?: TournamentInformation | null
  registration?: TournamentRegistrationInfo
  logoUrl?: string | null
  /** Campo de compatibilidad: siempre cobertura completa. */
  dataCoverage: DataCoverage
  /** Campo obsoleto de compatibilidad: siempre vacío. */
  trackedTeamIds: ID[]
  /**
   * Organizador propietario: decide QUIÉN lo administra, no quién lo ve (la lectura es pública).
   * Lo asigna el sistema a partir de la sesión; nunca se elige en un formulario.
   * Solo lo trae el modo mock: la API no lo expone (el panel usa /admin/tournaments).
   */
  organizerId?: ID
}

/** Inscripción de un equipo en un torneo. */
export interface TournamentTeam {
  id: ID
  tournamentId: ID
  teamId: ID
  joinedAt: ISODateTime
}

/**
 * Jornada: organización deportiva (qué partidos forman la fecha N del torneo).
 * La programación real (fecha/hora) vive en cada Match. El número enlaza con `Match.round`;
 * este registro solo añade metadatos opcionales (nombre, fecha de referencia).
 */
export interface Round {
  id: ID
  tournamentId: ID
  number: number
  name: string | null
  date: ISODate | null
}

// ─── Partidos ───────────────────────────────────────────────────────────────

/**
 * - scheduled: programado. live: en juego. finished: con resultado (única que cuenta en la tabla).
 * - postponed: pospuesto; conserva su identidad y se reprograma. cancelled: no se jugará.
 */
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'

export interface Match extends Timestamps {
  id: ID
  tournamentId: ID
  /** Jornada. */
  round: number
  homeTeamId: ID
  awayTeamId: ID
  date: ISODate
  /** `HH:mm` */
  time: string
  venue: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null  /** Lugar en la estructura: fase, grupo y llave. null = liga clásica. */
  stage?: MatchStage | null
  /** Tanda de penales: decidió una eliminatoria igualada o el punto extra de un empate de liga. */
  penalties?: { home: number; away: number } | null
  /** Se jugaron tiempos extra (el marcador ya los incluye). */
  extraTime?: boolean
}

/**
 * Participación de un jugador en un partido. Guarda el equipo con el que jugó
 * para que el historial sea correcto aunque luego cambie de club.
 * La existencia del registro cuenta como partido jugado.
 */
export interface PlayerMatchStats {
  id: ID
  matchId: ID
  playerId: ID
  teamId: ID
  goals: number
  assists: number
  /** Autogoles: suman al marcador del rival, nunca como goles del jugador. */
  ownGoals?: number
  yellowCards: number
  redCards: number
  /**
   * Tipo de expulsión. null = sin expulsión. undefined = captura anterior sin clasificar
   * (roja o dos amarillas que no se interpretan automáticamente).
   */
  sendOff?: SendOff | null
}

export type SendOff = 'direct' | 'second_yellow'

// ─── Datos derivados (calculados, no persistidos) ───────────────────────────

export type FormResult = 'W' | 'D' | 'L'

export interface Standing {
  position: number
  teamId: ID
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  /** Últimos resultados, del más antiguo al más reciente. */
  form: FormResult[]
}

export interface PlayerTotals {
  matches: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export interface TopScorer extends PlayerTotals {
  position: number
  playerId: ID
  teamId: ID
}

// ─── Payloads (contratos de escritura hacia la API) ─────────────────────────

export type TournamentInput = Pick<
  Tournament,
  'name' | 'modality' | 'category' | 'startDate' | 'endDate' | 'status' | 'venue' | 'settings' | 'dataCoverage'
> & {
  /** Liga (del organizador) donde vive el torneo. */
  leagueId?: ID | null
  /** Crear una liga nueva con este nombre y poner ahí el torneo (en lugar de `leagueId`). */
  newLeagueName?: string
  information?: TournamentInformation
  registration?: TournamentRegistrationInfo
  /** Solo al editar (al crear aún no hay inscritos). */
  trackedTeamIds?: ID[]
}

export type RoundInput = Pick<Round, 'number' | 'name' | 'date'>

/**
 * Datos editables del equipo. El logo NO es un campo del formulario: se sube a Cloudinary con
 * teamService.uploadLogo (la URL la genera el servidor). `logoUrl` queda opcional por compatibilidad.
 */
export type TeamInput = Pick<Team, 'name' | 'shortName' | 'colors' | 'city'> & { logoUrl?: string | null }

/** Ficha tal como la ve su custodio (quien la registró): incluye la fecha de nacimiento exacta. */
export interface PlayerDetails extends Player {
  birthDate: ISODate | null
}

/**
 * Datos editables de la ficha. La foto NO es un campo del formulario: se sube a Cloudinary con
 * playerService.uploadPhoto (la URL la genera el servidor). `photoUrl` queda opcional por compatibilidad.
 */
/** `birthDate` ausente = no cambiarla (quien edita sin conocerla: es privada). */
export type PlayerInput = Pick<PlayerDetails, 'firstName' | 'lastName' | 'position'> & { birthDate?: ISODate | null; nickname?: string | null; photoUrl?: string | null }

/** Jugador existente que podría ser la misma persona que se intenta registrar (lo decide quien registra). */
export interface PlayerCandidate {
  player: Pick<Player, 'id' | 'firstName' | 'lastName' | 'nickname' | 'position' | 'photoUrl' | 'age'>
  teams: TeamRef[]
  tournaments: { id: ID; name: string; status: TournamentStatus }[]
  appearances: number
  /** exact: mismo nombre y apellidos · similar: parecido. */
  match: 'exact' | 'similar'
}

/** Progreso de una subida, 0–100. */
export type UploadProgress = (percent: number) => void

/** Registro de un jugador en un equipo de un torneo (participación). */
export interface RosterAssignment {
  tournamentId: ID
  teamId: ID
  shirtNumber: number | null
}

export type MatchInput = Pick<
  Match,
  'tournamentId' | 'round' | 'homeTeamId' | 'awayTeamId' | 'date' | 'time' | 'venue' | 'status'
>

export type PlayerMatchStatsInput = Omit<PlayerMatchStats, 'id' | 'matchId'>

export interface MatchResultInput {
  homeScore: number
  awayScore: number
  status: MatchStatus
  stats: PlayerMatchStatsInput[]
  /** Partido que cierra una eliminatoria igualada, o empate de liga con punto extra por penales. */
  penalties?: { home: number; away: number } | null
  /** Solo en la llave cuya regla es tiempos extra. */
  extraTime?: boolean
}

// ─── Perfil del jugador (GET /players/:id/profile) ──────────────────────────
//
// Agregado calculado por el backend (fuente de verdad): la UI solo lo representa.

/** Equipo tal como se embebe en respuestas públicas. */
export type TeamRef = Pick<Team, 'id' | 'name' | 'shortName' | 'logoUrl' | 'colors'>

export interface TournamentRef {
  id: ID
  name: string
  status: TournamentStatus
  category: string
  modality: TournamentModality
  startDate: ISODate
  endDate: ISODate | null
  dataCoverage: DataCoverage
}

/** Estadística oficial: solo partidos finalizados. */
export interface StatLine {
  appearances: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export interface ProfileMatch {
  id: ID
  date: ISODate
  time: string
  round: number
  tournament: { id: ID; name: string } | null
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
  homeScore: number
  awayScore: number
  /** Equipo con el que jugó ese partido. */
  playerTeamId: ID
  result: FormResult
  stats: Omit<StatLine, 'appearances'>
}

export interface ProfileTeamParticipation {
  team: TeamRef | null
  shirtNumber: number | null
  startDate: ISODate | null
  /** null = sigue. */
  endDate: ISODate | null
  /** Activa en una competición no finalizada. */
  current: boolean
  stats: StatLine
  /**
   * Resultado oficial del equipo en un torneo FINALIZADO, solo si el jugador disputó al menos un
   * partido con él (estar en la plantilla sin jugar no da títulos). null en torneos en curso.
   */
  outcome: ProfileOutcome | null
}

export interface ProfileOutcome {
  champion: boolean
  runnerUp: boolean
  /** Formatos con eliminatoria: "Campeón", "Final", "Semifinal"… o "Fase de grupos" / "Fase regular". */
  reached: string | null
  /** Solo liga clásica, cuando la posición final es verificable. */
  finalPosition: { position: number; teams: number } | null
}

export type PlayerHonorType = 'champion' | 'top_scorer' | 'runner_up'

/** Palmarés del jugador: resultados oficiales de torneos finalizados (lo calcula el servidor). */
export interface PlayerHonor {
  type: PlayerHonorType
  tournament: { id: ID; name: string }
  /** Equipo con el que lo logró (null en goleador: es individual). */
  team: TeamRef | null
  year: number
  decidedBy?: 'league_table' | 'final'
  goals?: number
  shared?: boolean
}

export type MilestoneType = 'first_match' | 'first_goal' | 'first_assist' | 'goals' | 'matches' | 'first_brace' | 'first_hat_trick' | 'first_clean_sheet' | 'clean_sheets'

/** Línea de PORTERO: goles que recibió su equipo en los partidos que jugó y porterías en cero. */
export interface KeeperLine {
  appearances: number
  conceded: number
  cleanSheets: number
  concededPerMatch: number | null
  /** % de partidos en cero (0–100). */
  cleanSheetRate: number | null
}

export interface PlayerGoalkeeping {
  career: KeeperLine
  longestCleanSheetStreak: { value: number; from: ISODate; to: ISODate } | null
  byYear: (KeeperLine & { year: string })[]
  byTeam: (KeeperLine & { team: TeamRef | null })[]
  byTournament: (KeeperLine & { tournamentId: ID })[]
  milestones: PlayerMilestone[]
  /** Porterías en cero: victorias primero, luego la más reciente. */
  bestMatches: ProfileMatch[]
}

export interface PlayerMilestone {
  type: MilestoneType
  /** La marca: gol #25, partido #50 (null en los "primeros"). */
  value: number | null
  match: ProfileMatch
}

export interface PlayerRecords {
  mostGoalsInMatch: { value: number; match: ProfileMatch } | null
  mostAssistsInMatch: { value: number; match: ProfileMatch } | null
  longestScoringStreak: { value: number; from: ISODate; to: ISODate } | null
  mostMatchesInYear: { value: number; year: string } | null
  hatTricks: number
  braces: number
}

export interface PlayerProfile {
  player: Pick<Player, 'id' | 'firstName' | 'lastName' | 'nickname' | 'position' | 'photoUrl' | 'age'>
  /** Plural: puede jugar a la vez en varias competiciones. */
  currentParticipations: { tournament: TournamentRef; team: TeamRef | null; shirtNumber: number | null; startDate: ISODate | null; stats: StatLine }[]
  career: StatLine & {
    goalsPerMatch: number | null
    assistsPerMatch: number | null
    competitions: number
    /** Equipos distintos con los que jugó partidos oficiales. */
    teams: number
    titles: number
  }
  /** Últimos resultados, del más antiguo al más reciente. */
  form: FormResult[]
  competitions: {
    tournament: TournamentRef
    system: CompetitionSystem | null
    stats: StatLine
    teams: ProfileTeamParticipation[]
    /** Goleador del torneo finalizado (empate → compartido). */
    topScorer: { goals: number; shared: boolean } | null
  }[]
  history: {
    year: string
    participations: (Omit<ProfileTeamParticipation, 'stats' | 'outcome'> & { tournament: Pick<TournamentRef, 'id' | 'name' | 'status'> })[]
  }[]
  recentMatches: ProfileMatch[]
  honors: PlayerHonor[]
  /** Año natural de la fecha del partido, más reciente primero. */
  byYear: { year: string; stats: StatLine; competitions: number }[]
  /** Equipo representado en cada partido; más partidos primero. */
  byTeam: { team: TeamRef | null; stats: StatLine; competitions: number; firstDate: ISODate; lastDate: ISODate }[]
  /** Más reciente primero. */
  milestones: PlayerMilestone[]
  records: PlayerRecords
  /** Goles → asistencias → más reciente. La primera es el partido destacado. */
  bestPerformances: ProfileMatch[]
  /** Solo porteros (posición GK); null para el resto. */
  goalkeeping: PlayerGoalkeeping | null
}

// ─── Perfil del equipo (GET /teams/:id/profile) ─────────────────────────────
//
// Agregado calculado por el backend (fuente de verdad); en modo mock lo sirve
// mocks/teamProfile.ts con las mismas reglas. La UI solo lo representa.

/** Balance de un equipo: solo partidos finalizados con marcador. */
export interface TeamRecord {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

/** Posición en la tabla de un torneo (tal como la calcula el servidor). */
export interface TeamStanding {
  position: number
  teams: number
  points: number
}

/** Jugador en el contexto de UNA competición (no es una plantilla global). */
export interface SquadEntry {
  player: Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'photoUrl' | 'age'>
  shirtNumber: number | null
  /** Sigue en la plantilla de esa competición (participación activa). */
  active: boolean
  /** Con este equipo, en esta competición. */
  appearances: number
  goals: number
}

export interface TeamMatch {
  id: ID
  date: ISODate
  time: string
  round: number
  status: MatchStatus
  tournament: { id: ID; name: string } | null
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
  homeScore: number | null
  awayScore: number | null
  /** Desde el lado del equipo del perfil; null si no está finalizado. */
  result: FormResult | null
}

export interface TeamCompetition {
  tournament: TournamentRef
  /** Inscrito en un torneo en curso o por empezar. */
  current: boolean
  record: TeamRecord
  /** Torneo en curso: posición actual. */
  standing: TeamStanding | null
  /** Torneo finalizado: posición final SOLO si es verificable (ver buildTeamProfile). */
  finalStanding: TeamStanding | null
  squad: SquadEntry[]
}

/** Torneo del equipo en sus récords (mejor / peor), con su balance y puntos por partido (3/1/0). */
export interface TeamTournamentRecord {
  tournament: TournamentRef
  record: TeamRecord
  finalStanding: TeamStanding | null
  champion: boolean
  pointsPerMatch: number
}

export interface TeamRecords {
  biggestWin: { match: TeamMatch; goalsFor: number; goalsAgainst: number } | null
  biggestLoss: { match: TeamMatch; goalsFor: number; goalsAgainst: number } | null
  cleanSheets: { count: number; played: number; rate: number | null }
  bestTournament: TeamTournamentRecord | null
  worstTournament: TeamTournamentRecord | null
}

export interface TeamTopScorer {
  player: SquadEntry['player']
  /** Solo lo hecho con ESTE equipo, en todas sus competiciones. */
  goals: number
  assists: number
  appearances: number
}

export interface TeamPlayerStat {
  player: SquadEntry['player']
  appearances: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  /** Goles que recibió el equipo con él en cancha y partidos en cero (para porteros). */
  conceded: number
  cleanSheets: number
  /** Partidos en que vio tarjeta (más reciente primero). */
  cards: { match: { id: ID; date: ISODate; tournament: { id: ID; name: string } | null; opponent: TeamRef | null }; yellow: number; red: number }[]
}

/** Título derivado de datos oficiales (hoy: campeón de liga con tabla final completa y sin empate). */
export interface TeamHonor {
  type: 'CHAMPION'
  tournament: { id: ID; name: string }
  year: number
  /** Tabla final de una liga completa o final ganada en el cuadro. */
  decidedBy: 'league_table' | 'final'
}

export interface TeamProfile {
  team: TeamRef & { city: string | null; coverUrl?: string | null; coverPosition?: CoverPosition }
  record: TeamRecord & { competitions: number }
  /** Últimos resultados, del más antiguo al más reciente. */
  form: FormResult[]
  competitions: TeamCompetition[]
  topScorers: TeamTopScorer[]
  /** Asistencias dadas con esta camiseta (6F), mismo formato que los goleadores. */
  topAssists: TeamTopScorer[]
  /** Todos los que jugaron con el equipo: tops (goles, asistencias, promedio, tarjetas) y "ver más". */
  playerStats: TeamPlayerStat[]
  records: TeamRecords
  /** Finales perdidas (no son títulos). */
  runnerUps: { tournament: { id: ID; name: string }; year: number }[]
  recentMatches: TeamMatch[]
  upcomingMatches: TeamMatch[]
  history: { year: string; competitions: (Pick<TeamCompetition, 'record' | 'finalStanding' | 'current'> & { tournament: Pick<TournamentRef, 'id' | 'name' | 'status'> })[] }[]
  honors: TeamHonor[]
  /**
   * Plantilla GLOBAL actual (TeamRoster ACTIVE): quién pertenece al equipo hoy. Distinta de las
   * plantillas por competición (dentro de cada TeamCompetition). No implica partidos jugados.
   */
  currentRoster: { player: SquadEntry['player']; joinedAt: ISODate }[]
}

// ─── Estructura de competición (GET /tournaments/:id/structure) ──────────────

export interface MatchStage {
  phase: number
  group: string | null
  tie: { round: number; slot: number; leg: number } | null
}

export type PhaseType = 'league' | 'groups' | 'knockout'

export interface KnockoutSeed {
  seed: number
  teamId: ID
  /** "A1", "3º fase regular", "Cabeza de serie 2". */
  origin: string
}

export type TieStatus = 'waiting' | 'ready' | 'playing' | 'needs_penalties' | 'decided'

export interface TieLeg {
  leg: number
  matchId: ID | null
  homeTeamId: ID
  awayTeamId: ID
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus | null
  penalties: { home: number; away: number } | null
  extraTime: boolean
  date: ISODate | null
  time: string | null
}

/** Origen de un lado de la llave: cabeza de serie, ganador de otra llave o equipo elegido a mano. */
export type SlotSource = { type: 'seed'; seed: number } | { type: 'winner'; round: number; slot: number } | { type: 'team'; teamId: ID }

export interface BracketTieView {
  round: number
  slot: number
  homeSource: SlotSource
  awaySource: SlotSource
  homeTeamId: ID | null
  awayTeamId: ID | null
  bye: boolean
  legs: TieLeg[]
  aggregate: { home: number; away: number } | null
  /** Regla de desempate de la ronda de esta llave. */
  tiebreak: KnockoutTiebreak
  winnerTeamId: ID | null
  decidedBy: 'bye' | 'score' | 'penalties' | 'position' | null
  status: TieStatus
}

export interface Qualification {
  count: number
  teamIds: ID[] | null
  unresolved: { teamIds: ID[]; positions: [number, number] }[]
}

export type PhaseView =
  | { index: number; type: 'league'; generated: boolean; complete: boolean; pending: number; table: Standing[]; qualification: Qualification | null }
  | {
      index: number
      type: 'groups'
      generated: boolean
      complete: boolean
      pending: number
      groups: { key: string; teamIds: ID[]; table: Standing[]; qualification: Qualification }[]
    }
  | {
      index: number
      type: 'knockout'
      generated: boolean
      /** Cuadro armado a mano: el organizador elige cada cruce. */
      manual: boolean
      /** Reacomodo: la 1ª ronda por siembra; las siguientes las arma el organizador. */
      reseed: boolean
      complete: boolean
      legs: 1 | 2
      seeds: KnockoutSeed[]
      rounds: { round: number; name: string; ties: BracketTieView[] }[]
      championTeamId: ID | null
    }

export interface TournamentStructure {
  tournamentId: ID
  status: TournamentStatus
  settings: Omit<TournamentSettings, 'points'>
  phases: PhaseView[]
  next: { index: number; type: PhaseType; ready: boolean; blockers: string[]; seeds: KnockoutSeed[] | null } | null
  championTeamId: ID | null
  tiebreaks: { phase: number; scope: string; order: ID[] }[]
  teams: Record<ID, TeamRef>
}

/** Eliminatoria que se generaría con los clasificados (POST …/phases/advance/preview): nada se guarda. */
export interface AdvancePreview {
  seeds: KnockoutSeed[]
  /** Reacomodo: después de la primera ronda los cruces los arma el organizador. */
  reseed: boolean
  rounds: { name: string; ties: { slot: number; home: SlotSource; away: SlotSource }[] }[]
  /** Partidos que se crearían ya (los de quienes pasan directo esperan a su rival). */
  matches: { homeTeamId: ID; awayTeamId: ID; date: ISODate; time: string; roundName: string | null }[]
  teams: Record<string, TeamRef>
}

export interface AdvancePhaseInput {
  /** Armar la eliminatoria a mano (sin fechas ni clasificados automáticos). */
  manual?: boolean
  /** A mano: equipos de la primera ronda (8 = cuartos). */
  bracketSize?: number
  startDate: ISODate
  daysBetweenRounds: number
  firstKickoff: string
  minutesBetweenMatches: number
  venue: string | null
  tiebreaks: { scope: string; order: ID[] }[]
}

// ─── Administración global del equipo (Etapa 6: 6A roles + 6B plantilla global) ──
//
// Un rol es una RELACIÓN con un equipo concreto, no un tipo de cuenta: la misma persona puede ser
// propietaria de un equipo, delegada de otro, jugadora y organizadora de un torneo.

/** OWNER = Propietario · MANAGER = Delegado (etiquetas humanas en la UI). */
export type TeamRole = 'owner' | 'manager'

/** Fila de GET /admin/teams. `myRole` null + `canEdit` = custodia provisional (registró la ficha, sin propietario). */
export interface AdministeredTeam {
  team: Team
  myRole: TeamRole | null
  canEdit: boolean
  /** Jugadores en la plantilla GLOBAL actual. */
  globalRosterSize: number
}

export interface TeamAdminEntry {
  userId: ID
  firstName: string
  lastName: string
  role: TeamRole
  since: string
}

export interface TeamAdmins {
  owner: TeamAdminEntry | null
  managers: TeamAdminEntry[]
}

/** Periodo de pertenencia a la plantilla GLOBAL (no es una inscripción a torneo). */
export interface RosterPeriod {
  periodId: ID
  player: Player
  status: 'active' | 'inactive'
  joinedAt: ISODate
  leftAt: ISODate | null
}

export type RosterView = 'active' | 'inactive' | 'all'

/** Un torneo donde está inscrito MI equipo, con la plantilla del equipo en ese torneo. */
export interface TeamTournamentEntry {
  tournament: Pick<Tournament, 'id' | 'name' | 'modality' | 'category' | 'status' | 'startDate' | 'endDate' | 'dataCoverage'>
  minPlayers: number | null
  maxPlayers: number | null
  /** false si está finalizado (inmutable). */
  editable: boolean
  players: { player: Player; jerseyNumber: number | null }[]
}

// ─── Inscripción de equipos por link (Etapa 7) ──────────────────────────────

export interface RegistrationSettings {
  enabled: boolean
  /** Siempre true en V1 (no hay auto-aprobación). */
  approvalRequired: boolean
  minPlayers: number | null
  maxPlayers: number | null
  maxTeams: number | null
  /** Fecha límite inclusiva (YYYY-MM-DD). */
  deadline: ISODate | null
}

export type RegistrationClosedReason = 'finished' | 'disabled' | 'deadline' | 'full'
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** Vista del organizador (GET /tournaments/:id/registration). */
export interface RegistrationAdminState {
  registration: RegistrationSettings
  open: boolean
  closedReason: RegistrationClosedReason | null
  enrolledTeams: number
  link: { token: string; createdAt: string } | null
  counts: Record<RegistrationRequestStatus, number>
}

export interface RegistrationRequestSummary {
  id: ID
  team: TeamRef | null
  status: RegistrationRequestStatus
  playerCount: number
  /** Solo el nombre de quien envió (nunca su correo ni su id de cuenta). */
  submittedBy: { firstName: string; lastName: string } | null
  submittedAt: string
  reviewedAt: string | null
  rejectionReason: string | null
  cancelledAt: string | null
}

export type SelectionProblemCode = 'TEAM_NOT_FOUND' | 'ALREADY_ENROLLED' | 'FULL' | 'PLAYER_NOT_FOUND' | 'NOT_IN_ROSTER' | 'OTHER_TEAM' | 'TOO_FEW' | 'TOO_MANY'

export interface RegistrationRequestDetail extends RegistrationRequestSummary {
  players: { player: Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'photoUrl' | 'age'> | null; problem: SelectionProblemCode | null }[]
  /** Problemas ACTUALES si sigue pendiente (se revalida al aprobar). */
  problems: { code: SelectionProblemCode; message: string; playerIds?: ID[] }[]
}

/** Resolución pública del enlace. */
export interface PublicRegistration {
  tournament: { id: ID; name: string; modality: TournamentModality; category: string; startDate: ISODate; endDate: ISODate | null; venue: string | null; status: TournamentStatus }
  registration: {
    open: boolean
    closedReason: RegistrationClosedReason | null
    deadline: ISODate | null
    minPlayers: number | null
    maxPlayers: number | null
    maxTeams: number | null
    spotsLeft: number | null
  }
}

/** Un equipo que la persona administra, con su estado en el torneo del enlace. */
export interface MyRegistrationTeam {
  team: TeamRef & { city: string | null }
  myRole: TeamRole
  rosterSize: number
  enrolled: boolean
  /** Más reciente primero. */
  requests: RegistrationRequestSummary[]
}

// ─── Panel según capacidades de la cuenta ───────────────────────────────────

/** Paso guardado de una inscripción por enlace aún no enviada. */
export type RegistrationDraftStep = 'team' | 'players' | 'review'

export interface RegistrationDraft {
  teamId: ID | null
  playerIds: ID[]
  step: RegistrationDraftStep
  updatedAt: string
}

/** Inscripción incompleta, para el panel y el aviso al entrar. */
export interface RegistrationDraftSummary {
  tournament: { id: ID; name: string; status: TournamentStatus }
  team: TeamRef | null
  step: RegistrationDraftStep
  playerCount: number
  updatedAt: string
  /** null: el enlace ya no está activo (solo se puede cancelar). */
  token: string | null
}

/** Solicitud enviada de uno de mis equipos, esperando al organizador. */
export interface PendingRegistrationSummary {
  id: ID
  tournament: { id: ID; name: string; status: TournamentStatus }
  team: TeamRef | null
  playerCount: number
  submittedAt: string
  token: string | null
}

/** Lo que la cuenta puede hacer realmente (nunca User.role). */
export interface UserHome {
  organizer: { canOrganize: boolean; enabled: boolean; tournaments: number }
  teams: { total: number; owner: number; manager: number }
  registrations: { drafts: RegistrationDraftSummary[]; pendingRequests: PendingRegistrationSummary[] }
}

/** Cruce de un cuadro armado a mano. */
export interface TieInput {
  round: number
  /** Local del primer partido (el único, o la ida). */
  homeTeamId: ID
  awayTeamId: ID
  legs: { date: ISODate; time: string; venue: string | null }[]
}

// ─── Ligas ──────────────────────────────────────────────────────────────────
// Una liga agrupa los torneos de un organizador (Apertura, Clausura, copas…) y su histórico.

export interface League {
  id: ID
  name: string
  city: string | null
  description: string | null
  /** Creada por el sistema para los torneos que no tenían liga (se puede renombrar). */
  isDefault: boolean
}

export type LeagueInput = Pick<League, 'name' | 'city' | 'description'>

/** Mis ligas (panel) o el listado público, con su número de torneos. */
export interface LeagueSummary extends League {
  tournaments: number
  lastStartDate?: ISODate
}

export interface LeagueTournament {
  id: ID
  name: string
  status: TournamentStatus
  category: string
  modality: TournamentModality
  startDate: ISODate
  endDate: ISODate | null
  system: CompetitionSystem
}

export interface LeagueDetail extends League {
  tournaments: LeagueTournament[]
}

export interface LeagueMatchRef {
  id: ID
  date: ISODate
  tournament: { id: ID; name: string } | null
  homeTeam: TeamRef | null
  awayTeam: TeamRef | null
  homeScore: number
  awayScore: number
}

export interface LeagueHistory {
  summary: { tournaments: number; finished: number; matches: number; goals: number; goalsPerMatch: number | null; teams: number; players: number; firstYear: number | null }
  champions: {
    tournament: { id: ID; name: string }
    year: number
    champion: TeamRef | null
    runnerUp: TeamRef | null
    decidedBy: 'league_table' | 'final'
    topScorer: { player: SquadEntry['player']; goals: number } | null
  }[]
  teams: {
    team: TeamRef
    played: number
    won: number
    drawn: number
    lost: number
    goalsFor: number
    goalsAgainst: number
    goalDifference: number
    points: number
    cleanSheets: number
    tournaments: number
    titles: number
    runnerUps: number
  }[]
  players: LeaguePlayerStat[]
  keepers: LeaguePlayerStat[]
  records: { biggestWin: LeagueMatchRef | null; highestScoring: LeagueMatchRef | null }
}

export interface LeaguePlayerStat {
  player: SquadEntry['player']
  team: TeamRef | null
  appearances: number
  goals: number
  assists: number
  ownGoals: number
  yellowCards: number
  redCards: number
  conceded: number
  cleanSheets: number
  teams: number
  tournaments: number
}

// ─── Disciplina (GET /tournaments/:id/discipline) ───────────────────────────
//
// Solo del organizador. Las sanciones automáticas las calcula el servidor con las tarjetas y el
// calendario actuales; `ref` identifica cada sanción (id de la manual o clave de la automática).

export type EligibilityMode = 'warn' | 'block'
export type SanctionKind = 'auto' | 'manual'
export type SanctionCause = 'accumulation' | 'direct_red' | 'second_yellow' | 'manual'
export type SanctionStatus = 'active' | 'pending' | 'served' | 'annulled'
export type DisciplineAction =
  | 'rules_updated'
  | 'sanction_created'
  | 'sanction_updated'
  | 'sanction_annulled'
  | 'sanction_restored'
  | 'played_while_suspended'

export interface DisciplineRules {
  enabled: boolean
  /** Cada cuántas amarillas se suspende; null = sin acumulación. */
  yellowsForSuspension: number | null
  accumulationMatches: number
  directRedMatches: number
  secondYellowMatches: number
  resetAccumulationOnPhaseChange: boolean
  eligibility: EligibilityMode
}

export interface Sanction {
  ref: string
  kind: SanctionKind
  cause: SanctionCause
  playerId: ID
  teamId: ID
  /** Automática: partido que la originó. Manual: partido desde el que aplica. */
  matchId: ID
  matches: number
  ruleMatches: number | null
  adjusted: boolean
  reason: string | null
  served: number
  remaining: number
  status: SanctionStatus
  coveredMatchIds: ID[]
  upcomingMatchIds: ID[]
  incidentMatchIds: ID[]
  /** Pospuestos con su fecha original dentro de su alcance: no cuentan hasta corregirla. */
  staleMatchIds: ID[]
}

export interface OrphanSanction {
  ref: string
  cause: SanctionCause
  playerId: ID
  teamId: ID
  matchId: ID
  matches: number | null
  annulled: boolean
}

export interface PlayerDiscipline {
  playerId: ID
  teamId: ID
  yellows: number
  towardNext: number
  directReds: number
  secondYellows: number
  unclassified: number
  remaining: number
  suspended: boolean
}

export interface DisciplineMatchRef {
  id: ID
  homeTeamId: ID
  awayTeamId: ID
  status: MatchStatus
  date: ISODate
  time: string
  round: number
  phase: number
}

export interface DisciplineOverview {
  rules: DisciplineRules
  readOnly: boolean
  sanctions: Sanction[]
  orphans: OrphanSanction[]
  players: PlayerDiscipline[]
  unclassified: { matchId: ID; playerId: ID; teamId: ID; yellowCards: number; redCards: number }[]
  incidents: { ref: string; matchId: ID; playerId: ID; teamId: ID }[]
  /** Pospuestos reprogramados o capturados con su fecha original. */
  staleMatchIds: ID[]
  refs: {
    players: Record<ID, { id: ID; firstName: string; lastName: string; photoUrl: string | null }>
    teams: Record<ID, TeamRef>
    matches: Record<ID, DisciplineMatchRef>
  }
}

export interface DisciplineLogEntry {
  id: ID
  action: DisciplineAction
  ref: string | null
  playerId: ID | null
  matchId: ID | null
  by: { id: ID; name: string | null }
  justification: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: ISODateTime
}

export interface MatchEligibility {
  mode: EligibilityMode
  /** Pospuesto con su fecha original: no cuenta para las suspensiones hasta corregirla. */
  staleDate: boolean
  suspended: { ref: string; playerId: ID; teamId: ID; cause: SanctionCause; matches: number; remaining: number; reason: string | null }[]
}
