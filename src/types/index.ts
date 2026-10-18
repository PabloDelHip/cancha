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
  /** Fecha EFECTIVA: desde cuándo puede jugar con el equipo. */
  startDate: ISODate
  endDate: ISODate | null
  status: MembershipStatus
  /** Fecha REAL de la inscripción (3A). null = participación anterior a 3A (regla previa). */
  registeredAt?: ISODate | null
  /** 3C: equipo de origen si nació de un cambio de equipo (se puede anular si fue un error). */
  transferredFrom?: ID | null
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

/** RBAC: rol en un torneo (el propietario es implícito) y permisos que concede. */
export type TournamentRole = 'OWNER' | 'ADMIN' | 'COORDINATOR' | 'SCORER'
export type TournamentPermission =
  | 'VIEW'
  | 'SETTINGS'
  | 'LIFECYCLE'
  | 'DELETE'
  | 'MEMBERS'
  | 'TEAMS'
  | 'SCHEDULE'
  | 'ASSIGNMENTS'
  | 'RESULTS'
  | 'DISCIPLINE_MANAGE'
  | 'DISCIPLINE_VIEW'
  | 'LOGS_VIEW'
  | 'REFEREE_CONTACT'
  | 'INCIDENTS'
  | 'REFEREE_CORRECTIONS'
  | 'SHEET_CLOSE'
  | 'SHEET_REOPEN'
  | 'EVIDENCE_UPLOAD'
  | 'EVIDENCE_REMOVE'
  | 'REGISTRATION_EXCEPTIONS'
  | 'FINANCE_VIEW'
  | 'FINANCE_MANAGE'

export interface Tournament extends Timestamps {
  id: ID
  /** Solo en el panel (/admin/tournaments): mi rol y lo que me permite. */
  myRole?: TournamentRole | null
  permissions?: TournamentPermission[]
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

/**
 * 3D — bloqueo administrativo de un jugador en un torneo (no es una sanción). Vigente desde `since`
 * hasta `until` (exclusive; null = vigente). El motivo y los autores solo llegan a quien
 * administra la plantilla del torneo.
 */
export interface PlayerBlock {
  id: ID
  tournamentId: ID
  playerId: ID
  since: ISODate
  until: ISODate | null
  active: boolean
  reason?: string
  liftReason?: string | null
}

/** Inscripción de un equipo en un torneo. */
export interface TournamentTeam {
  id: ID
  tournamentId: ID
  teamId: ID
  joinedAt: ISODateTime
  /** 3D: fecha del retiro (abandonó después de jugar). null = participa con normalidad. */
  withdrawnAt: ISODate | null
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
/** suspended = no pudo continuar; pendiente de decisión (2C-2). */
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled' | 'suspended'

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
  /** Texto de la sede. Con cancha asignada es "Sede · Cancha". */
  venue: string | null
  /** Cancha de una sede del organizador (null = sin cancha). */
  fieldId?: ID | null
  venueId?: ID | null
  /** Árbitros asignados (solo ids y roles; los nombres, en /referees). */
  referees?: RefereeAssignment[]
  /** Nombre del árbitro central en funciones (público). */
  centralReferee?: string | null
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null  /** Lugar en la estructura: fase, grupo y llave. null = liga clásica. */
  stage?: MatchStage | null
  /** Tanda de penales: decidió una eliminatoria igualada o el punto extra de un empate de liga. */
  penalties?: { home: number; away: number } | null
  /** Se jugaron tiempos extra (el marcador ya los incluye). */
  extraTime?: boolean
  /** Ficha técnica cerrada (2D): información deportiva congelada. */
  sheetClosed?: { at: ISODateTime } | null
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
  /** Cambio de equipo explícito: su equipo actual en el torneo. Sin él, si ya juega con otro → 409. */
  fromTeamId?: ID
  /** Fecha efectiva (por defecto hoy). Anterior a hoy = retroactiva: exige `retroactiveReason`. */
  startDate?: ISODate
  retroactiveReason?: string
  /** Excepción para superar el máximo de jugadores por equipo (solo propietario/administrador). */
  overLimitReason?: string
  /** 3C: motivo del cambio de equipo (obligatorio con `fromTeamId`). */
  transferReason?: string
  /** 3C: excepción para cambiar de equipo con la eliminatoria iniciada (solo propietario/administrador). */
  knockoutReason?: string
}

export type MatchInput = Pick<
  Match,
  'tournamentId' | 'round' | 'homeTeamId' | 'awayTeamId' | 'date' | 'time' | 'venue' | 'status' | 'fieldId'
> & {
  /** Solo al editar: motivo de reprogramar, posponer o cancelar (obligatorio con el torneo en curso). */
  reason?: string | null
  /** Reprogramación confirmada: libera exactamente lo que mostró la vista previa (2C-2). */
  release?: { field: boolean; assignmentIds: ID[] }
}

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
  /** 3A: corrección administrativa (jugador con dos equipos en la misma fecha deportiva). */
  sameDateReason?: string
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
  /** 3D: equipos retirados (siguen en las tablas; no clasifican). */
  withdrawnTeamIds: ID[]
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
  /** false si está finalizado (inmutable) o el equipo se retiró. */
  editable: boolean
  /** 3D: el equipo se retiró del torneo (fecha). */
  withdrawnAt: ISODate | null
  /** `blocked` (3D): bloqueo administrativo vigente en ese torneo (sin el motivo). */
  players: { player: Player; jerseyNumber: number | null; blocked: boolean }[]
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
  /** 3C: último día para cambiar jugadores de equipo (inclusivo). null = sin límite. */
  transferDeadline: ISODate | null
  /** 3C: sin cambios de equipo desde el primer partido de eliminatoria (salvo excepción). */
  lockTransfersOnKnockout: boolean
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

export type SelectionProblemCode = 'TEAM_NOT_FOUND' | 'ALREADY_ENROLLED' | 'FULL' | 'PLAYER_NOT_FOUND' | 'NOT_IN_ROSTER' | 'OTHER_TEAM' | 'PREVIOUS_TEAM' | 'BLOCKED' | 'TOO_FEW' | 'TOO_MANY'

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

// ─── Sedes y canchas (Módulo 2A) ────────────────────────────────────────────
//
// Del organizador: se reutilizan en todas sus ligas y torneos.

export interface FieldAvailability {
  /** Ventanas por día (0 = domingo). Vacío = sin restricción. `to` admite `24:00`. */
  weekly: { day: number; from: string; to: string }[]
  closedDates: ISODate[]
}

export interface VenueField {
  id: ID
  name: string
  active: boolean
  availability: FieldAvailability
  /** Partidos que la usan (todos) y pendientes (programados, en juego o pospuestos). */
  matches: number
  pendingMatches: number
}

export interface Venue {
  id: ID
  name: string
  address: string | null
  /** Minutos de cambio entre partidos (se suman a la duración). */
  bufferMinutes: number
  active: boolean
  fields: VenueField[]
}

export interface FieldConflict {
  matchId: ID
  tournamentId: ID
  tournamentName: string
  date: ISODate
  time: string
  endTime: string
  homeTeam: string
  awayTeam: string
}

export interface SlotCheck {
  start: string
  end: string
  /** Hora en que la cancha queda libre (fin + margen). */
  freeAt: string
  crossesMidnight: boolean
  conflicts: FieldConflict[]
  warnings: string[]
}

// ─── Árbitros (Módulo 2B) ───────────────────────────────────────────────────

export type RefereeRole = 'central' | 'assistant_1' | 'assistant_2' | 'fourth' | 'scorekeeper'

export interface RefereeAssignment {
  id: ID
  refereeId: ID
  role: RefereeRole
  /**
   * absent = no se presentó (se conserva); su sustituto lleva `substituteFor`. void = anulada por
   * una corrección (se registró por error); released = liberada al reprogramar. Nada se borra.
   */
  status: RefereeAssignmentStatus
  substituteFor: ID | null
  absenceNote: string | null
  /** Corrección que la anuló (solo en la vista del organizador). */
  voided?: Correction | null
  /** Ausencias anuladas: sí se presentó. */
  absenceVoided?: (Correction & { absentAt: ISODateTime | null; absenceNote: string | null })[]
  /** Solo en la vista del organizador. */
  name?: string | null
}

/** Árbitro del organizador (vista privada: incluye contacto). */
export interface Referee {
  id: ID
  firstName: string
  lastName: string
  name: string
  phone: string | null
  email: string | null
  active: boolean
  availability: FieldAvailability
  matches: number
  pendingMatches: number
}

export interface RefereeOption {
  id: ID
  name: string
  conflicts: { matchId: ID; tournamentName: string; date: ISODate; time: string; endTime: string; homeTeam: string; awayTeam: string }[]
  warnings: string[]
}

export interface MatchReferees {
  centralReferee: string | null
  referees: RefereeAssignment[]
  warnings: string[]
}

export type RefereeAssignmentStatus = 'assigned' | 'absent' | 'void' | 'released'

/** Quién corrigió un registro, cuándo y por qué. */
export interface Correction {
  at: ISODateTime
  by: ID
  role: TournamentRole | null
  reason: string
}

export interface RefereeHistoryEntry {
  assignmentId: ID
  role: RefereeRole
  status: RefereeAssignmentStatus
  absenceNote: string | null
  replacedBy: string | null
  substituteFor: string | null
  match: {
    id: ID
    tournamentId: ID
    tournamentName: string | null
    date: ISODate
    time: string
    status: MatchStatus
    venue: string | null
    homeTeam: string | null
    awayTeam: string | null
    homeScore: number | null
    awayScore: number | null
  }
}

// ─── Historial de partidos (Módulo 2C) ──────────────────────────────────────

export type MatchLogAction =
  | 'CREATED'
  | 'RESCHEDULED'
  | 'STATUS_CHANGED'
  | 'FIELD_CHANGED'
  | 'TEAMS_CHANGED'
  | 'UPDATED'
  | 'RESULT_CAPTURED'
  | 'RESULT_CORRECTED'
  | 'REFEREE_ASSIGNED'
  | 'REFEREE_REMOVED'
  | 'REFEREE_ABSENT'
  | 'REFEREE_CORRECTED'
  | 'INCIDENT_REPORTED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_VOIDED'
  | 'SUSPENSION_RESOLVED'
  | 'SHEET_LINEUP_SAVED'
  | 'SHEET_OBSERVATIONS_SAVED'
  | 'SHEET_CLOSED'
  | 'SHEET_REOPENED'
  | 'EVIDENCE_ADDED'
  | 'EVIDENCE_REMOVED'
  | 'ELIGIBILITY_OVERRIDE'
  | 'DELETED'
  | 'SCHEDULE_REPLACED'

export interface MatchLogReleased {
  matchId: ID
  fieldId: ID | null
  venue: string | null
  referees: { refereeId: ID; role: string }[]
}

/** Entrada tal como la guarda el servidor (los enums, en mayúsculas). */
export interface MatchLogEntry {
  id: ID
  matchId: ID | null
  action: MatchLogAction
  source: 'USER' | 'SYSTEM'
  cause: 'MANUAL' | 'SCHEDULE_REGENERATED' | 'FORMAT_CHANGED' | 'TIE_REMOVED' | 'BRACKET_SYNC' | null
  actorId: ID
  /** Rol del responsable en el torneo en ese momento (R1). */
  actorRole?: TournamentRole | null
  reason: string | null
  changes: Record<string, { from: unknown; to: unknown }> | null
  snapshot: Record<string, unknown> | null
  deleted?: Record<string, unknown>[]
  released: MatchLogReleased[] | null
  createdAt: ISODateTime
}

export interface MatchLog {
  entries: MatchLogEntry[]
  refs: { teams: Record<ID, string>; referees: Record<ID, string>; users: Record<ID, string> }
}

// ─── Historial de plantillas (3E) ──────────────────────────────────────────

export type RosterEventAction =
  | 'REGISTERED'
  | 'REJOINED'
  | 'TRANSFER'
  | 'TRANSFER_ANNULLED'
  | 'UNREGISTERED'
  | 'EXCEPTION'
  | 'JERSEY_CHANGED'
  | 'BLOCKED'
  | 'UNBLOCKED'
  | 'TEAM_WITHDRAWN'
  | 'TEAM_REINSTATED'
  | 'TEAM_REMOVED'

/** Un movimiento de la plantilla del torneo, derivado por el servidor (solo propietario y administradores). */
export interface RosterEvent {
  id: string
  action: RosterEventAction
  /** Cuándo se registró. null = registro anterior a 3A: solo se conoce `date`. */
  at: ISODateTime | null
  /** Fecha efectiva (inicio o fin de la participación, desde o hasta del bloqueo…). */
  date: ISODate
  playerId: ID | null
  teamId: ID | null
  fromTeamId: ID | null
  reason: string | null
  /** null = sin registro de autor. `role`: rol en el torneo, `TEAM` (el equipo) o `REQUEST` (inscripción por enlace). */
  by: { userId: ID; role: string | null } | null
  legacy: boolean
  details: {
    kind?: 'RETROACTIVE' | 'OVER_LIMIT' | 'KNOCKOUT' | 'SAME_DATE'
    from?: number | string | null
    to?: number | string | null
    annulled?: boolean
    removedTeam?: boolean
    teamWithdrawn?: boolean
    afterUnregister?: boolean
    viaRequest?: boolean
    retroactive?: boolean
    jerseyCleared?: number | null
    cancelledMatches?: number
    closedMemberships?: number
    memberships?: number
    max?: number
    count?: number
  }
}

export interface RosterHistoryFilter {
  playerId?: ID
  teamId?: ID
  action?: RosterEventAction[]
  from?: ISODate
  to?: ISODate
  page?: number
  limit?: number
}

export interface RosterHistoryPage {
  data: RosterEvent[]
  meta: { page: number; limit: number; total: number; totalPages: number }
  refs: { players: Record<ID, string>; teams: Record<ID, string>; users: Record<ID, string> }
}

// ─── Colaboradores e invitaciones (RBAC R2) ─────────────────────────────────

export type CollaboratorRole = Exclude<TournamentRole, 'OWNER'>

export interface Collaborators {
  owner: { userId: ID; name: string | null; email?: string | null }
  members: { userId: ID; name: string | null; email?: string | null; role: CollaboratorRole; since: ISODateTime }[]
  limit: number
}

/** Invitación vista por el propietario. `token` solo viene al crear un enlace (se muestra una vez). */
export interface OwnerInvitation {
  id: ID
  kind: 'LINK' | 'ACCOUNT'
  role: CollaboratorRole
  email: string | null
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED'
  createdAt: ISODateTime
  expiresAt: ISODateTime
  token?: string
}

/** Invitación vista por quien la recibe (vista previa del enlace o en su panel). */
export interface ReceivedInvitation {
  id: ID
  tournament: { id: ID; name: string; status: string } | null
  role: CollaboratorRole
  invitedBy: string | null
  status: OwnerInvitation['status']
  expiresAt: ISODateTime
}

/** Contacto de un árbitro del propietario, visible para ADMIN/COORDINATOR del torneo (RBAC R3). */
export interface RefereeContact {
  id: ID
  name: string
  phone: string | null
  email: string | null
  active: boolean
}

// ─── Incidencias y reprogramación segura (2C-2) ─────────────────────────────

export type IncidentType = 'DELAY' | 'SUSPENSION' | 'FACILITIES' | 'SECURITY' | 'OTHER'
export type SuspensionDecision = 'RESUMED' | 'RESCHEDULED' | 'POSTPONED' | 'CANCELLED' | 'FINISHED'

interface IncidentClose {
  at: ISODateTime
  by: ID
  role: TournamentRole | null
  note: string | null
}

export interface MatchIncident {
  id: ID
  matchId: ID
  type: IncidentType
  description: string
  occurredAt: ISODateTime
  status: 'OPEN' | 'RESOLVED' | 'VOID'
  reportedBy: ID
  reportedRole: TournamentRole | null
  resolution: (IncidentClose & { decision: SuspensionDecision | null }) | null
  voided: IncidentClose | null
  createdAt: ISODateTime
}

export interface MatchIncidents {
  incidents: MatchIncident[]
  /** Nombres de quienes registraron, resolvieron o anularon. */
  users: Record<ID, string>
}

export interface ResourceConflict {
  matchId: ID
  tournamentName: string
  date: ISODate
  time: string
  endTime: string
  homeTeam: string
  awayTeam: string
}

/** Qué se conserva y qué se libera si el partido pasa a otro horario. */
export interface ReschedulePreview {
  date: ISODate
  time: string
  reserves: boolean
  field: { fieldId: ID; label: string; action: 'KEEP' | 'RELEASE'; conflicts: ResourceConflict[]; warnings: string[] } | null
  referees: { assignmentId: ID; refereeId: ID; name: string | null; role: string; action: 'KEEP' | 'RELEASE'; conflicts: ResourceConflict[]; warnings: string[] }[]
  release: { field: boolean; assignmentIds: ID[] }
  needsConfirmation: boolean
}

// ─── Agenda global (2C-3) ───────────────────────────────────────────────────

/** Torneo de la agenda con mi rol y permisos (los decide el servidor). */
export interface AgendaTournament {
  id: ID
  name: string
  status: TournamentStatus
  myRole: TournamentRole | null
  permissions: TournamentPermission[]
}

export interface AgendaItem {
  match: Match
  tournament: { id: ID; name: string; status: TournamentStatus }
  homeTeam: string | null
  awayTeam: string | null
  roundName: string | null
}

export interface AgendaPage {
  items: AgendaItem[]
  meta: { page: number; limit: number; total: number; totalPages: number }
  tournaments: AgendaTournament[]
}

export interface AgendaQuery {
  from?: ISODate
  to?: ISODate
  tournamentId?: ID
  status?: MatchStatus[]
  venueId?: ID
  fieldId?: ID
  refereeId?: ID
  includeFinished?: boolean
  page?: number
  limit?: number
}

export interface AgendaOptions {
  tournaments: AgendaTournament[]
  venues: { id: ID; name: string; fields: { id: ID; name: string }[] }[]
  referees: { id: ID; name: string }[]
}

// ─── Ficha técnica digital (2D) ─────────────────────────────────────────────

export type EvidenceKind = 'REFEREE_REPORT' | 'LINEUP' | 'INCIDENT' | 'SCOREBOARD' | 'OTHER'

export interface MatchEvidence {
  id: ID
  kind: EvidenceKind
  description: string | null
  incidentId: ID | null
  format: string
  bytes: number
  status: 'ACTIVE' | 'REMOVED'
  uploadedBy: ID
  uploadedRole: TournamentRole | null
  createdAt: ISODateTime
  removed: { at: ISODateTime; by: ID; role: TournamentRole | null; reason: string } | null
}

export interface SheetLineupPlayer {
  playerId: ID
  name: string | null
  position: string | null
  jerseyNumber: number | null
  starter: boolean
  captain: boolean
  participated: boolean
  enteredAt: number | null
  leftAt: number | null
}

export interface SheetSubstitution {
  outPlayerId: ID
  inPlayerId: ID
  minute: number
  outName?: string | null
  inName?: string | null
}

export interface SheetTeamSide {
  side: 'home' | 'away'
  team: { id: ID; name: string | null; shortName: string | null; logoUrl: string | null }
  lineup: { updatedAt: ISODateTime | null; players: SheetLineupPlayer[]; substitutions: SheetSubstitution[] } | null
  stats: { playerId: ID; name: string | null; jerseyNumber: number | null; played: boolean; goals: number; assists: number; ownGoals: number; yellowCards: number; redCards: number; sendOff?: string | null }[]
  consistency: { consistent: boolean; missing: (string | null)[]; extra: (string | null)[] } | null
}

/** Documento de la ficha (versionado: base de un PDF futuro). Estados y enums tal como los da el API. */
export interface MatchSheet {
  schemaVersion: number
  generatedAt: ISODateTime
  tournament: { id: ID; name: string; status: 'DRAFT' | 'ACTIVE' | 'FINISHED' }
  myRole: TournamentRole | null
  permissions: TournamentPermission[]
  match: {
    id: ID
    status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'SUSPENDED'
    date: ISODate
    time: string
    round: number
    roundName: string | null
    stage: MatchStage | null
    venue: string | null
    fieldId: ID | null
    homeScore: number | null
    awayScore: number | null
    penalties: { home: number; away: number } | null
    extraTime: boolean
  }
  closure: { closed: false } | { closed: true; at: ISODateTime; by: string | null; role: TournamentRole | null; homeScore: number | null; awayScore: number | null }
  referees: { id: ID; refereeId: ID; name: string | null; role: string; status: string; substituteFor: ID | null; absenceNote: string | null }[]
  centralReferee: string | null
  teams: [SheetTeamSide, SheetTeamSide]
  incidents: MatchIncidents
  observations: string | null
  evidence: MatchEvidence[]
  history: MatchLog
  /** Solo al guardar una alineación: avisos (p. ej. suspendidos con reglamento que solo avisa). */
  warnings?: string[]
}

export interface SheetTeamInput {
  players: { playerId: ID; jerseyNumber?: number | null; starter: boolean; captain?: boolean }[]
  substitutions: { outPlayerId: ID; inPlayerId: ID; minute: number }[]
  reason?: string | null
  /** 3A: corrección administrativa (jugador con dos equipos en la misma fecha deportiva). */
  sameDateReason?: string
}
