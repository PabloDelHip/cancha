/**
 * 7B-A — catálogo de plantillas. Agregar una = crear su componente (recibe `data` y `format`, ver
 * layout.ts) y registrarla aquí con sus fuentes. Los datos, la paginación y la exportación son
 * comunes: ninguna plantilla los reimplementa.
 */
import type { Component } from 'vue'
import UrbanBlack from './UrbanBlack.vue'
import ChampionsGold from './ChampionsGold.vue'
import NeonLeague from './NeonLeague.vue'

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
]

export const templateOf = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!
