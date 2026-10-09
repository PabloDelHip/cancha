export const CONTACT_FIELDS = [
  { key: 'name', label: 'Nombre del contacto' },
  { key: 'phone', label: 'Teléfono / WhatsApp' },
  { key: 'email', label: 'Correo electrónico' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'notes', label: 'Información adicional' },
] as const

export type ContactField = (typeof CONTACT_FIELDS)[number]['key']

export interface TournamentSchedule {
  days: number[]
  startTime: string | null
  endTime: string | null
  durationMinutes: number | null
  notes: string | null
  variable: boolean
}

export interface TournamentEnrollment {
  opensOn: string | null
  teamFee: number | null
  playerFee: number | null
  paymentMode: 'free' | 'paid' | null
  instructions: string | null
}

export interface TournamentCosts {
  currency: string
  refereeFee: number | null
  refereeBilling: 'team' | 'match'
  venueFee: number | null
  adminFee: number | null
  adminDescription: string | null
  paymentNotes: string | null
}

export interface TournamentRules {
  text: string | null
  notes: string | null
}

export interface TournamentAwards {
  champion: string | null
  runnerUp: string | null
  topScorer: string | null
  other: string | null
  description: string | null
}

export interface TournamentContact {
  name: string | null
  phone: string | null
  email: string | null
  facebook: string | null
  instagram: string | null
  notes: string | null
  publicFields: ContactField[]
}

export interface TournamentInformation {
  season: string | null
  description: string | null
  city: string | null
  state: string | null
  schedule: TournamentSchedule
  enrollment: TournamentEnrollment
  costs: TournamentCosts
  rules: TournamentRules
  awards: TournamentAwards
  contact: TournamentContact
}

export interface TournamentRegistrationInfo { deadline: string | null; maxTeams: number | null }

export function defaultTournamentInformation(value?: Partial<TournamentInformation> | null): TournamentInformation {
  return {
    season: value?.season ?? null,
    description: value?.description ?? null,
    city: value?.city ?? null,
    state: value?.state ?? null,
    schedule: { days: [], startTime: null, endTime: null, durationMinutes: null, notes: null, variable: false, ...value?.schedule },
    enrollment: { opensOn: null, teamFee: null, playerFee: null, paymentMode: null, instructions: null, ...value?.enrollment },
    costs: { currency: 'MXN', refereeFee: null, refereeBilling: 'match', venueFee: null, adminFee: null, adminDescription: null, paymentNotes: null, ...value?.costs },
    rules: { text: null, notes: null, ...value?.rules },
    awards: { champion: null, runnerUp: null, topScorer: null, other: null, description: null, ...value?.awards },
    contact: { name: null, phone: null, email: null, facebook: null, instagram: null, notes: null, publicFields: [], ...value?.contact },
  }
}

export function publicTournament<T extends { information?: TournamentInformation | null }>(tournament: T): T {
  if (!tournament.information) return tournament
  const info = defaultTournamentInformation(tournament.information)
  for (const { key } of CONTACT_FIELDS) if (!info.contact.publicFields.includes(key)) info.contact[key] = null
  return { ...tournament, information: info }
}

export const WEEKDAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
] as const
