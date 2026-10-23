/**
 * 7B-A — medidas comunes: cada plantilla decide cuánto alto deja a la tabla en cada formato y de
 * aquí salen el alto de fila y los tamaños de letra, para que 8, 16 o 24 equipos se lean igual de
 * bien (con pocos equipos las filas no crecen sin límite).
 */
import { computed, type ComputedRef } from 'vue'
import { FORMATS, type MatchPosterData, type PosterData, type PosterFormat } from './data'

export interface PosterProps {
  data: PosterData
  format: PosterFormat
}

/** 7B-B1: props de un cartel de partido. */
export interface MatchPosterProps {
  data: MatchPosterData
  format: PosterFormat
}

export interface Metrics {
  width: number
  height: number
  rowH: number
  /** Letra de los números y del nombre. */
  font: number
  /** Letra de la cabecera de columnas. */
  headFont: number
  crest: number
  rows: number
  /** Nombre del equipo: con filas altas cabe en dos líneas (no se recorta tanto). */
  nameFont: number
  nameLines: 1 | 2
  /** Ancho fijo de cada columna numérica y de la de puntos (no crece con la letra). */
  statW: number
  ptsW: number
  /** DIF lleva signo y dos cifras: un poco más ancha. */
  difW: number
}

/**
 * `tableHeight`: alto que la plantilla reserva a las filas en cada formato. `maxRow`: alto máximo
 * (en historia, con pocos equipos, las filas pueden ser más altas para no dejar huecos).
 */
export function useMetrics(
  props: PosterProps,
  tableHeight: Record<PosterFormat, number>,
  opts: { maxRow?: number | Partial<Record<PosterFormat, number>>; fontRatio?: number; crestRatio?: number; maxFont?: number; statW?: number; ptsW?: number; maxCrest?: number } = {},
): ComputedRef<Metrics> {
  return computed(() => {
    const { width, height } = FORMATS[props.format]
    const rows = Math.max(1, props.data.rows.length)
    const maxRow = typeof opts.maxRow === 'number' ? opts.maxRow : (opts.maxRow?.[props.format] ?? (props.format === 'story' ? 124 : 96))
    const rowH = Math.floor(Math.min(maxRow, tableHeight[props.format] / rows))
    const font = Math.round(Math.max(20, Math.min(opts.maxFont ?? 34, rowH * (opts.fontRatio ?? 0.44))))
    const nameLines = rowH >= 66 ? 2 : 1
    const nameFont = nameLines === 2 ? Math.round(Math.min(font, rowH * 0.3)) : font
    return {
      width,
      height,
      rowH,
      font,
      headFont: Math.round(Math.max(16, Math.min(24, font * 0.62))),
      crest: Math.round(Math.min(opts.maxCrest ?? 72, rowH * (opts.crestRatio ?? 0.66))),
      rows,
      nameFont,
      nameLines,
      statW: opts.statW ?? 56,
      ptsW: opts.ptsW ?? 78,
      difW: (opts.statW ?? 56) + 12,
    }
  })
}

/** Columnas numéricas (siempre las mismas, en el mismo orden). */
export const STAT_COLUMNS = [
  { key: 'played', label: 'PJ' },
  { key: 'won', label: 'G' },
  { key: 'drawn', label: 'E' },
  { key: 'lost', label: 'P' },
  { key: 'goalsFor', label: 'GF' },
  { key: 'goalsAgainst', label: 'GC' },
  { key: 'goalDifference', label: 'DIF' },
] as const

/** Columnas de la rejilla: posición, escudo, nombre, PJ…GC, DIF y puntos. */
export const statGrid = (m: Metrics, pos: number, crest: number) => `${pos}px ${crest}px minmax(0,1fr) repeat(6, ${m.statW}px) ${m.difW}px ${m.ptsW}px`

export const pageLabel = (d: PosterData) => (d.page.total > 1 ? `${d.rows[0]?.position}–${d.rows.at(-1)?.position} de ${d.totalTeams}` : null)
