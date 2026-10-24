/**
 * Catálogo de FAMILIAS visuales. Cada familia es una identidad (paleta, fuentes, texturas) y tiene
 * una plantilla por TIPO de publicación: tabla de posiciones (las 10, 7B-A) y, desde 7B-B1, próximo
 * partido (las 10 desde 7B-B3) y, desde 7B-C/7B-D, la jornada (resultados u horarios: la misma plantilla). Agregar un tipo a una familia = crear su componente
 * (recibe `data` y `format`) y declararlo en `kinds`; los datos, la paginación y la exportación son
 * comunes. Ver docs/social-posters-7b-b1.md.
 */
import type { Component } from 'vue'
import UrbanBlack from './UrbanBlack.vue'
import UrbanBlackMatch from './urban-black/UrbanBlackMatch.vue'
import UrbanBlackRound from './urban-black/UrbanBlackRound.vue'
import ChampionsGold from './ChampionsGold.vue'
import NeonLeague from './NeonLeague.vue'
import StadiumLights from './StadiumLights.vue'
import FireRed from './FireRed.vue'
import RetroFootball from './RetroFootball.vue'
import IceBlue from './IceBlue.vue'
import StreetFootball from './StreetFootball.vue'
import EliteWhite from './EliteWhite.vue'
import UltimateLeague from './UltimateLeague.vue'
import StadiumLightsMatch from './stadium-lights/StadiumLightsMatch.vue'
import FireRedMatch from './fire-red/FireRedMatch.vue'
import EliteWhiteMatch from './elite-white/EliteWhiteMatch.vue'
import ChampionsGoldMatch from './champions-gold/ChampionsGoldMatch.vue'
import NeonLeagueMatch from './neon-league/NeonLeagueMatch.vue'
import RetroFootballMatch from './retro-football/RetroFootballMatch.vue'
import IceBlueMatch from './ice-blue/IceBlueMatch.vue'
import StreetFootballMatch from './street-football/StreetFootballMatch.vue'
import UltimateLeagueMatch from './ultimate-league/UltimateLeagueMatch.vue'
import ChampionsGoldRound from './champions-gold/ChampionsGoldRound.vue'
import NeonLeagueRound from './neon-league/NeonLeagueRound.vue'
import StadiumLightsRound from './stadium-lights/StadiumLightsRound.vue'
import FireRedRound from './fire-red/FireRedRound.vue'
import RetroFootballRound from './retro-football/RetroFootballRound.vue'
import IceBlueRound from './ice-blue/IceBlueRound.vue'
import StreetFootballRound from './street-football/StreetFootballRound.vue'
import EliteWhiteRound from './elite-white/EliteWhiteRound.vue'
import UltimateLeagueRound from './ultimate-league/UltimateLeagueRound.vue'
import { URBAN_BLACK } from './urban-black/tokens'

/** Tipos de publicación. Los que aún no existen (goleadores, campeones) se suman aquí. */
export type PosterKind = 'standings' | 'match' | 'results' | 'fixtures'

export interface PosterTemplate {
  id: string
  name: string
  description: string
  fonts: string[]
  /** Dos colores para la miniatura del selector. */
  swatch: [string, string]
  /** Plantilla de la familia para cada tipo de publicación que tiene (la tabla, siempre). */
  kinds: { standings: Component } & Partial<Record<Exclude<PosterKind, 'standings'>, Component>>
}

export const TEMPLATES: PosterTemplate[] = [
  { id: 'urban-black', name: 'Urban Black', description: 'Negro y blanco, brochazos y título enorme', fonts: URBAN_BLACK.fonts, swatch: URBAN_BLACK.swatch, kinds: { standings: UrbanBlack, match: UrbanBlackMatch, results: UrbanBlackRound, fixtures: UrbanBlackRound } },
  { id: 'champions-gold', name: 'Champions Gold', description: 'Azul noche y dorado, elegante', fonts: ['Cinzel', 'Montserrat'], swatch: ['#0b1736', '#d4af37'], kinds: { standings: ChampionsGold, match: ChampionsGoldMatch, results: ChampionsGoldRound, fixtures: ChampionsGoldRound } },
  { id: 'neon-league', name: 'Neon League', description: 'Negro con verde neón, moderno', fonts: ['Orbitron', 'Rajdhani'], swatch: ['#050807', '#39ff88'], kinds: { standings: NeonLeague, match: NeonLeagueMatch, results: NeonLeagueRound, fixtures: NeonLeagueRound } },
  { id: 'stadium-lights', name: 'Stadium Lights', description: 'Noche de estadio con reflectores', fonts: ['Bebas Neue', 'Inter'], swatch: ['#071226', '#e6f0ff'], kinds: { standings: StadiumLights, match: StadiumLightsMatch, results: StadiumLightsRound, fixtures: StadiumLightsRound } },
  { id: 'fire-red', name: 'Fire Red', description: 'Rojo intenso y cortes diagonales', fonts: ['Teko', 'Oswald'], swatch: ['#1a0303', '#ff3b1f'], kinds: { standings: FireRed, match: FireRedMatch, results: FireRedRound, fixtures: FireRedRound } },
  { id: 'retro-football', name: 'Retro Football', description: 'Papel de los 70, franjas y medios tonos', fonts: ['Righteous', 'Oswald'], swatch: ['#f1e3c3', '#c2410c'], kinds: { standings: RetroFootball, match: RetroFootballMatch, results: RetroFootballRound, fixtures: RetroFootballRound } },
  { id: 'ice-blue', name: 'Ice Blue', description: 'Claro y helado, tarjetas blancas', fonts: ['Exo 2'], swatch: ['#e8f4ff', '#0b4f8a'], kinds: { standings: IceBlue, match: IceBlueMatch, results: IceBlueRound, fixtures: IceBlueRound } },
  { id: 'street-football', name: 'Street Football', description: 'Concreto, cinta y marcador grafiti', fonts: ['Permanent Marker', 'Archivo Black', 'Barlow Condensed'], swatch: ['#2b2b2b', '#ffd400'], kinds: { standings: StreetFootball, match: StreetFootballMatch, results: StreetFootballRound, fixtures: StreetFootballRound } },
  { id: 'elite-white', name: 'Elite White', description: 'Editorial blanco, mínimo y limpio', fonts: ['Playfair Display', 'Inter'], swatch: ['#ffffff', '#111111'], kinds: { standings: EliteWhite, match: EliteWhiteMatch, results: EliteWhiteRound, fixtures: EliteWhiteRound } },
  { id: 'ultimate-league', name: 'Ultimate League', description: 'Morado eléctrico, hexágonos y metal', fonts: ['Russo One', 'Chakra Petch'], swatch: ['#1a0b3b', '#ff3df5'], kinds: { standings: UltimateLeague, match: UltimateLeagueMatch, results: UltimateLeagueRound, fixtures: UltimateLeagueRound } },
]

/** Familias que ya tienen ese tipo de publicación. */
export const templatesFor = (kind: PosterKind) => TEMPLATES.filter((t) => t.kinds[kind])

export const templateOf = (id: string, kind: PosterKind = 'standings') => {
  const list = templatesFor(kind)
  return list.find((t) => t.id === id) ?? list[0]!
}

/** Componente de esa familia para ese tipo. */
export const componentOf = (t: PosterTemplate, kind: PosterKind) => t.kinds[kind] ?? t.kinds.standings
