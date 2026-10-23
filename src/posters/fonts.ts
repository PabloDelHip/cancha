/**
 * 7B-A — fuentes de las publicaciones. Locales (OFL, paquetes @fontsource) y solo el subconjunto
 * latino (incluye acentos y ñ): la exportación no puede incrustar fuentes de otro origen (Google
 * Fonts), así que cada plantilla declara las suyas y se cargan solo esas, para la vista previa
 * (FontFace) y para el PNG (CSS con data URL).
 */
import anton400 from '@fontsource/anton/files/anton-latin-400-normal.woff2?url'
import barlowCondensed500 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2?url'
import barlowCondensed600 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2?url'
import barlowCondensed700 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2?url'
import barlowCondensed800 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2?url'
import barlowCondensed900 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff2?url'
import cinzel600 from '@fontsource/cinzel/files/cinzel-latin-600-normal.woff2?url'
import cinzel700 from '@fontsource/cinzel/files/cinzel-latin-700-normal.woff2?url'
import cinzel900 from '@fontsource/cinzel/files/cinzel-latin-900-normal.woff2?url'
import montserrat500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2?url'
import montserrat600 from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2?url'
import montserrat700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2?url'
import montserrat800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff2?url'
import orbitron500 from '@fontsource/orbitron/files/orbitron-latin-500-normal.woff2?url'
import orbitron700 from '@fontsource/orbitron/files/orbitron-latin-700-normal.woff2?url'
import orbitron900 from '@fontsource/orbitron/files/orbitron-latin-900-normal.woff2?url'
import rajdhani500 from '@fontsource/rajdhani/files/rajdhani-latin-500-normal.woff2?url'
import rajdhani600 from '@fontsource/rajdhani/files/rajdhani-latin-600-normal.woff2?url'
import rajdhani700 from '@fontsource/rajdhani/files/rajdhani-latin-700-normal.woff2?url'
import bebasNeue400 from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2?url'
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff2?url'
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff2?url'
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff2?url'
import inter800 from '@fontsource/inter/files/inter-latin-800-normal.woff2?url'
import teko500 from '@fontsource/teko/files/teko-latin-500-normal.woff2?url'
import teko600 from '@fontsource/teko/files/teko-latin-600-normal.woff2?url'
import teko700 from '@fontsource/teko/files/teko-latin-700-normal.woff2?url'
import oswald500 from '@fontsource/oswald/files/oswald-latin-500-normal.woff2?url'
import oswald600 from '@fontsource/oswald/files/oswald-latin-600-normal.woff2?url'
import oswald700 from '@fontsource/oswald/files/oswald-latin-700-normal.woff2?url'
import righteous400 from '@fontsource/righteous/files/righteous-latin-400-normal.woff2?url'
import exo2500 from '@fontsource/exo-2/files/exo-2-latin-500-normal.woff2?url'
import exo2600 from '@fontsource/exo-2/files/exo-2-latin-600-normal.woff2?url'
import exo2700 from '@fontsource/exo-2/files/exo-2-latin-700-normal.woff2?url'
import exo2800 from '@fontsource/exo-2/files/exo-2-latin-800-normal.woff2?url'
import exo2900 from '@fontsource/exo-2/files/exo-2-latin-900-normal.woff2?url'
import permanentMarker400 from '@fontsource/permanent-marker/files/permanent-marker-latin-400-normal.woff2?url'
import archivoBlack400 from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2?url'
import playfairDisplay600 from '@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff2?url'
import playfairDisplay700 from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2?url'
import playfairDisplay900 from '@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff2?url'
import russoOne400 from '@fontsource/russo-one/files/russo-one-latin-400-normal.woff2?url'
import chakraPetch500 from '@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff2?url'
import chakraPetch600 from '@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2?url'
import chakraPetch700 from '@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2?url'

export interface FontFile {
  family: string
  weight: number
  url: string
}

export const FONT_FILES: FontFile[] = [
  { family: 'Anton', weight: 400, url: anton400 },
  { family: 'Barlow Condensed', weight: 500, url: barlowCondensed500 },
  { family: 'Barlow Condensed', weight: 600, url: barlowCondensed600 },
  { family: 'Barlow Condensed', weight: 700, url: barlowCondensed700 },
  { family: 'Barlow Condensed', weight: 800, url: barlowCondensed800 },
  { family: 'Barlow Condensed', weight: 900, url: barlowCondensed900 },
  { family: 'Cinzel', weight: 600, url: cinzel600 },
  { family: 'Cinzel', weight: 700, url: cinzel700 },
  { family: 'Cinzel', weight: 900, url: cinzel900 },
  { family: 'Montserrat', weight: 500, url: montserrat500 },
  { family: 'Montserrat', weight: 600, url: montserrat600 },
  { family: 'Montserrat', weight: 700, url: montserrat700 },
  { family: 'Montserrat', weight: 800, url: montserrat800 },
  { family: 'Orbitron', weight: 500, url: orbitron500 },
  { family: 'Orbitron', weight: 700, url: orbitron700 },
  { family: 'Orbitron', weight: 900, url: orbitron900 },
  { family: 'Rajdhani', weight: 500, url: rajdhani500 },
  { family: 'Rajdhani', weight: 600, url: rajdhani600 },
  { family: 'Rajdhani', weight: 700, url: rajdhani700 },
  { family: 'Bebas Neue', weight: 400, url: bebasNeue400 },
  { family: 'Inter', weight: 500, url: inter500 },
  { family: 'Inter', weight: 600, url: inter600 },
  { family: 'Inter', weight: 700, url: inter700 },
  { family: 'Inter', weight: 800, url: inter800 },
  { family: 'Teko', weight: 500, url: teko500 },
  { family: 'Teko', weight: 600, url: teko600 },
  { family: 'Teko', weight: 700, url: teko700 },
  { family: 'Oswald', weight: 500, url: oswald500 },
  { family: 'Oswald', weight: 600, url: oswald600 },
  { family: 'Oswald', weight: 700, url: oswald700 },
  { family: 'Righteous', weight: 400, url: righteous400 },
  { family: 'Exo 2', weight: 500, url: exo2500 },
  { family: 'Exo 2', weight: 600, url: exo2600 },
  { family: 'Exo 2', weight: 700, url: exo2700 },
  { family: 'Exo 2', weight: 800, url: exo2800 },
  { family: 'Exo 2', weight: 900, url: exo2900 },
  { family: 'Permanent Marker', weight: 400, url: permanentMarker400 },
  { family: 'Archivo Black', weight: 400, url: archivoBlack400 },
  { family: 'Playfair Display', weight: 600, url: playfairDisplay600 },
  { family: 'Playfair Display', weight: 700, url: playfairDisplay700 },
  { family: 'Playfair Display', weight: 900, url: playfairDisplay900 },
  { family: 'Russo One', weight: 400, url: russoOne400 },
  { family: 'Chakra Petch', weight: 500, url: chakraPetch500 },
  { family: 'Chakra Petch', weight: 600, url: chakraPetch600 },
  { family: 'Chakra Petch', weight: 700, url: chakraPetch700 },
]

export type FontFamily = (typeof FONT_FILES)[number]['family']

const filesOf = (families: string[]) => FONT_FILES.filter((f) => families.includes(f.family))
const loaded = new Map<string, Promise<void>>()

/** Carga (una vez) las fuentes de una plantilla en el documento. */
export function loadFonts(families: string[]): Promise<void> {
  return Promise.all(
    filesOf(families).map((f) => {
      const key = `${f.family}|${f.weight}`
      if (!loaded.has(key)) {
        const face = new FontFace(f.family, `url(${f.url}) format('woff2')`, { weight: String(f.weight), style: 'normal', display: 'block' })
        loaded.set(key, face.load().then((ok) => void document.fonts.add(ok)))
      }
      return loaded.get(key)!
    }),
  ).then(() => undefined)
}

const embedded = new Map<string, Promise<string>>()

async function dataUrlOf(url: string) {
  const blob = await (await fetch(url)).blob()
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** CSS @font-face con las fuentes incrustadas, para html-to-image (sin pedir nada externo). */
export async function fontEmbedCss(families: string[]): Promise<string> {
  const rules = await Promise.all(
    filesOf(families).map((f) => {
      const key = `${f.family}|${f.weight}`
      if (!embedded.has(key)) {
        embedded.set(key, dataUrlOf(f.url).then((data) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;font-display:block;src:url(${data}) format('woff2');}`))
      }
      return embedded.get(key)!
    }),
  )
  return rules.join('\n')
}
