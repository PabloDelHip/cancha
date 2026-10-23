/**
 * 7B-A — catálogo de plantillas. Agregar una = crear su componente (recibe `data` y `format`, ver
 * layout.ts) y registrarla aquí con sus fuentes. Los datos, la paginación y la exportación son
 * comunes: ninguna plantilla los reimplementa.
 */
import type { Component } from 'vue'
import UrbanBlack from './UrbanBlack.vue'
import ChampionsGold from './ChampionsGold.vue'
import NeonLeague from './NeonLeague.vue'
import StadiumLights from './StadiumLights.vue'
import FireRed from './FireRed.vue'
import RetroFootball from './RetroFootball.vue'
import IceBlue from './IceBlue.vue'
import StreetFootball from './StreetFootball.vue'
import EliteWhite from './EliteWhite.vue'
import UltimateLeague from './UltimateLeague.vue'

export interface PosterTemplate {
  id: string
  name: string
  description: string
  fonts: string[]
  /** Dos colores para la miniatura del selector. */
  swatch: [string, string]
  component: Component
}

export const TEMPLATES: PosterTemplate[] = [
  { id: 'urban-black', name: 'Urban Black', description: 'Negro y blanco, brochazos y título enorme', fonts: ['Anton', 'Barlow Condensed'], swatch: ['#0a0a0a', '#ffffff'], component: UrbanBlack },
  { id: 'champions-gold', name: 'Champions Gold', description: 'Azul noche y dorado, elegante', fonts: ['Cinzel', 'Montserrat'], swatch: ['#0b1736', '#d4af37'], component: ChampionsGold },
  { id: 'neon-league', name: 'Neon League', description: 'Negro con verde neón, moderno', fonts: ['Orbitron', 'Rajdhani'], swatch: ['#050807', '#39ff88'], component: NeonLeague },
  { id: 'stadium-lights', name: 'Stadium Lights', description: 'Noche de estadio con reflectores', fonts: ['Bebas Neue', 'Inter'], swatch: ['#071226', '#e6f0ff'], component: StadiumLights },
  { id: 'fire-red', name: 'Fire Red', description: 'Rojo intenso con podio de los tres primeros', fonts: ['Teko', 'Oswald'], swatch: ['#1a0303', '#ff3b1f'], component: FireRed },
  { id: 'retro-football', name: 'Retro Football', description: 'Papel de los 70, franjas y medios tonos', fonts: ['Righteous', 'Oswald'], swatch: ['#f1e3c3', '#c2410c'], component: RetroFootball },
  { id: 'ice-blue', name: 'Ice Blue', description: 'Claro y helado, tarjetas blancas', fonts: ['Exo 2'], swatch: ['#e8f4ff', '#0b4f8a'], component: IceBlue },
  { id: 'street-football', name: 'Street Football', description: 'Concreto, cinta y marcador grafiti', fonts: ['Permanent Marker', 'Archivo Black', 'Barlow Condensed'], swatch: ['#2b2b2b', '#ffd400'], component: StreetFootball },
  { id: 'elite-white', name: 'Elite White', description: 'Editorial blanco, mínimo y limpio', fonts: ['Playfair Display', 'Inter'], swatch: ['#ffffff', '#111111'], component: EliteWhite },
  { id: 'ultimate-league', name: 'Ultimate League', description: 'Morado eléctrico, hexágonos y metal', fonts: ['Russo One', 'Chakra Petch'], swatch: ['#1a0b3b', '#ff3df5'], component: UltimateLeague },
]

export const templateOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!
