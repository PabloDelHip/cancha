/**
 * 7B-A — medidas comunes: cada plantilla decide cuánto alto deja a la tabla en cada formato y de
 * aquí salen el alto de fila y los tamaños de letra, para que 8, 16 o 24 equipos se lean igual de
 * bien (con pocos equipos las filas no crecen sin límite).
 */
import { computed, type ComputedRef } from 'vue'
import { FORMATS, type MatchPosterData, type PosterData, type PosterFormat, type ResultsPosterData } from './data'

export interface PosterProps {
  data: PosterData
  format: PosterFormat
}

/** 7B-B1: props de un cartel de partido. */
export interface MatchPosterProps {
  data: MatchPosterData
  format: PosterFormat
}

/** 7B-E: cómo viste cada familia los goleadores y tarjetas del resultado final. */
export interface FinalEventsTheme {
  font: string
  /** Solo las fuentes que tienen ese peso. Por defecto 600. */
  weight?: number
  uppercase?: boolean
  /** Ancho medio de una letra (en em): las letras anchas (Inter, Exo 2…) achican antes los nombres largos. */
  charWidth?: number
  ink: string
  muted: string
  /** Balón y «×2». */
  accent: string
  /** Separador entre local y visita. */
  line: string
  /** Etiqueta de «Penales 4-3» / «Tiempo extra» (por defecto, el acento con letra negra). */
  detailBg?: string
  detailInk?: string
  detailFont?: string
  detailRadius?: string
  /** Peso de esa letra (Anton, Bebas… solo tienen 400). */
  detailWeight?: number
}

/**
 * 7B-E: en el resultado final el VS se vuelve el marcador («3 - 1» ocupa más que «VS»): la letra se
 * achica con las cifras para que no empuje a los equipos.
 */
export const scoreText = (f: { homeScore: number; awayScore: number }) => `${f.homeScore}-${f.awayScore}`
export const scoreSize = (vs: number, f: { homeScore: number; awayScore: number }) => Math.round(vs * Math.min(1, 3 / scoreText(f).length) * 1.15)

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

/** 7B-C: props de una imagen de resultados de la jornada. */
export interface ResultsPosterProps {
  data: ResultsPosterData
  format: PosterFormat
}

export interface ResultMetrics {
  width: number
  height: number
  rowH: number
  crest: number
  /** Letra del nombre del equipo. */
  name: number
  /** Letra del marcador. */
  score: number
  /** Con filas altas el nombre cabe en dos líneas. */
  nameLines: 1 | 2
  /** Letra de ESE nombre: los largos se achican antes de recortarse. */
  nameOf: (name: string) => number
  /** 1 = una fila por partido; 2 = la imagen se divide en dos columnas de tarjetas compactas. */
  columns: 1 | 2
  /** Filas de tarjetas por columna (con 2 columnas). */
  cardRows: number
  /** Alto de cada renglón de equipo dentro de la tarjeta compacta. */
  line: number
}

/** Partidos que caben en una columna; con más, la imagen se divide en dos (hasta MAX_RESULTS). */
export const SINGLE_COLUMN: Record<PosterFormat, number> = { story: 10, portrait: 7, square: 5 }

/** Cómo viste cada familia la tarjeta compacta de resultado (dos columnas). */
export interface ResultCardTheme {
  nameFont: string
  /** Igual que `scoreWeight`: por defecto 700. */
  nameWeight?: number
  uppercase?: boolean
  ink: string
  lost: string
  scoreFont: string
  /** Solo las fuentes que tienen ese peso (Anton o Bebas tienen uno: sin negrita falsa). */
  scoreWeight?: number
  scoreBg: string
  scoreInk: string
  scoreRadius?: string
  scoreClip?: string
  card: string
  cardBorder?: string
  cardRadius?: string
  cardClip?: string
  cardShadow?: string
  detail: string
  crestShape: 'circle' | 'shield' | 'square' | 'hex'
  crestFont: string
}

/**
 * Medidas de una lista de resultados: cada plantilla dice cuánto alto deja a la lista en cada
 * formato; con pocos partidos las filas no crecen sin límite.
 */
export function useResultMetrics(
  props: ResultsPosterProps,
  listHeight: Record<PosterFormat, number>,
  opts: { maxRow?: Partial<Record<PosterFormat, number>>; crestRatio?: number; maxCrest?: number; nameRatio?: number; maxName?: number; scoreRatio?: number; maxScore?: number; nameChars?: number } = {},
): ComputedRef<ResultMetrics> {
  return computed(() => {
    const { width, height } = FORMATS[props.format]
    const rows = Math.max(1, props.data.rows.length)
    if (rows > SINGLE_COLUMN[props.format]) {
      // Dos columnas: cada partido es una tarjeta de dos renglones (local y visita) con su marcador.
      const cardRows = Math.ceil(rows / 2)
      const rowH = Math.floor(Math.min(160, listHeight[props.format] / cardRows))
      // En horarios la tarjeta lleva además el renglón de cancha y día: renglones algo más bajos.
      const line = Math.round(rowH * (props.data.mode === 'fixtures' ? 0.34 : 0.4))
      // Las familias de letra ancha (menos `nameChars`) parten de una letra más chica.
      const name = Math.round(Math.max(18, Math.min(30, line * 0.5) * Math.min(1, (opts.nameChars ?? 11) / 11)))
      const cap = 20
      return {
        width,
        height,
        rowH,
        crest: Math.round(Math.min(56, line * 0.84)),
        name,
        score: Math.round(Math.max(22, Math.min(40, line * 0.64))),
        nameLines: 1,
        nameOf: (n: string) => Math.round(name * Math.max(0.62, Math.min(1, cap / Math.max(1, n.length)))),
        columns: 2,
        cardRows,
        line,
      }
    }
    const maxRow = opts.maxRow?.[props.format] ?? ({ story: 190, portrait: 150, square: 140 } as const)[props.format]
    const rowH = Math.floor(Math.min(maxRow, listHeight[props.format] / rows))
    // El ancho es el mismo en los tres formatos: escudo, marcador y nombre tienen tope por ancho
    // (en historia las filas ganan aire, no se comen el nombre).
    const name = Math.round(Math.max(22, Math.min(opts.maxName ?? 37, rowH * (opts.nameRatio ?? 0.25))))
    const nameLines = rowH >= 96 ? 2 : 1
    /** Caracteres que caben a la letra base (por línea); se estima por familia con `nameChars`. */
    const cap = (opts.nameChars ?? 11) * nameLines
    return {
      width,
      height,
      rowH,
      crest: Math.round(Math.min(opts.maxCrest ?? 86, rowH * (opts.crestRatio ?? 0.54))),
      name,
      score: Math.round(Math.max(34, Math.min(opts.maxScore ?? 66, rowH * (opts.scoreRatio ?? 0.44)))),
      nameLines,
      // Cabe por largo total y por su palabra más larga («Universitarios» no se puede partir).
      nameOf: (n: string) => {
        const word = Math.max(1, ...n.split(/\s+/).map((w) => w.length))
        return Math.round(name * Math.max(0.66, Math.min(1, cap / Math.max(1, n.length), (opts.nameChars ?? 11) / word)))
      },
      columns: 1,
      cardRows: rows,
      line: rowH,
    }
  })
}
