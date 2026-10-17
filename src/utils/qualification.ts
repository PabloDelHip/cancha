import type { ID, TournamentStructure } from '@/types'

/**
 * 3D/3E (P1) — clasificados EFECTIVOS de la tabla de la fase `index`: si la eliminatoria siguiente
 * ya se generó, son los equipos que entraron en ella (su siembra o, en un cuadro armado a mano, los
 * de la primera ronda), aunque alguno se haya retirado después. null = todavía no hay eliminatoria
 * guardada: la tabla marca la zona de clasificación con su regla (los retirados no ocupan plaza).
 */
export function effectiveQualified(structure: TournamentStructure, index: number): ID[] | null {
  const next = structure.phases.find((p) => p.index === index + 1)
  if (!next || next.type !== 'knockout' || !next.generated) return null
  if (next.seeds.length) return next.seeds.map((s) => s.teamId)
  const first = next.rounds[0]?.ties ?? []
  return first.flatMap((t) => [t.homeTeamId, t.awayTeamId]).filter((id): id is ID => Boolean(id))
}
