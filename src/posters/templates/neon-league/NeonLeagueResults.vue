<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import NeonLeagueBackdrop from './NeonLeagueBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Neon League — Resultados de la jornada. El «J10» en contorno neón de la tabla; cada resultado en
 * una fila inclinada con el filo verde y el marcador en el bloque neón de los puntos.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 470, foot: 120, big: 250, meta: 26 },
  portrait: { head: 300, foot: 90, big: 160, meta: 22 },
  square: { head: 230, foot: 76, big: 116, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 470 - 120 - 110, portrait: 1350 - 300 - 90 - 84, square: 1080 - 230 - 76 - 72 }, { nameChars: 10 })
/** «J10» en grande si la jornada se llama así; un nombre propio va entero, más chico. */
const big = computed(() => {
  const d = props.data
  if (d.roundLabel === `Jornada ${d.roundNumber}`) return { text: `J${String(d.roundNumber).padStart(2, '0')}`, size: s.value.big }
  return { text: d.roundLabel, size: Math.round(Math.min(s.value.big * 0.5, (s.value.big * 4.4) / Math.max(8, d.roundLabel.length))) }
})
const kicker = computed(() => (big.value.text === props.data.roundLabel ? 'Resultados' : `Resultados · ${props.data.roundLabel}`))
const subtitle = computed(() => (props.data.leagueName ? withSeason(props.data.tournamentName, props.data.season) : props.data.season))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Rajdhani', ink: '#eafff2', lost: '#8fbfa3', scoreFont: 'Orbitron', scoreWeight: 900, scoreBg: '#39ff88', scoreInk: '#031a0c', scoreClip: 'polygon(14% 0, 100% 0, 86% 100%, 0 100%)', card: 'linear-gradient(90deg, rgb(57 255 136 / 0.16), rgb(3 8 6 / 0.9) 60%)', cardBorder: '1px solid rgb(57 255 136 / 0.35)', detail: '#39ff88', crestShape: 'hex', crestFont: 'Orbitron' }
</script>

<template>
  <div class="nlr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <NeonLeagueBackdrop :width="m.width" :height="m.height" />

    <header class="nlr-head" :style="{ height: `${s.head}px` }">
      <span class="nlr-big" :style="{ fontSize: `${big.size}px` }">{{ big.text }}</span>
      <div class="nlr-meta-head">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.big * 0.42)" shape="hex" :colors="{ primary: '#06140d', secondary: '#39ff88' }" font="Orbitron" />
        <div class="nlr-text">
          <p class="nlr-kicker" :style="{ fontSize: `${Math.round(s.big * 0.12)}px` }">{{ kicker }}</p>
          <p class="nlr-league" :style="{ fontSize: `${Math.round(s.big * 0.16)}px` }">{{ data.leagueName ?? data.tournamentName }}</p>
          <p v-if="subtitle" class="nlr-sub" :style="{ fontSize: `${Math.round(s.big * 0.1)}px` }">{{ subtitle }}</p>
        </div>
      </div>
    </header>

    <section class="nlr-list" :class="{ 'nlr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="nlr-slot" :style="{ height: `${m.rowH}px` }">
          <div class="nlr-row">
            <div class="nlr-team nlr-home" :class="{ 'nlr-lost': r.winner === 'away' }">
              <span class="nlr-name" :class="{ 'nlr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
              <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="hex" font="Orbitron" />
            </div>
            <div class="nlr-score" :style="{ fontSize: `${Math.round(m.score * 0.82)}px` }">
              <span class="nlr-box">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</span>
              <small v-if="r.detail">{{ r.detail }}</small>
            </div>
            <div class="nlr-team" :class="{ 'nlr-lost': r.winner === 'home' }">
              <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="hex" font="Orbitron" />
              <span class="nlr-name" :class="{ 'nlr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
            </div>
          </div>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <footer class="nlr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 20, square: 17 })[format]}px` }">
      <span class="nlr-live">●</span>
      <span class="nlr-foot-text">{{ meta || 'Resultados' }}</span>
      <span class="nlr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.nlr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #030605;
  color: #eafff2;
  font-family: 'Rajdhani', sans-serif;
}
.nlr-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 60px 0;
}
.nlr-big {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  color: transparent;
  -webkit-text-stroke: 4px #39ff88;
  text-shadow: 0 0 24px rgb(57 255 136 / 0.55), 0 0 60px rgb(57 255 136 / 0.3);
}
.nlr-meta-head {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-top: 18px;
  min-width: 0;
}
.nlr-text {
  min-width: 0;
}
.nlr-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #39ff88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlr-league {
  margin: 0.05em 0 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlr-sub {
  margin: 0.2em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nlr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 48px;
}
.nlr-slot {
  display: flex;
  align-items: center;
  padding: 4px 0;
  box-sizing: border-box;
}
.nlr-row {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  padding: 0 22px;
}
/* La fila inclinada de la tabla, con el filo verde */
.nlr-row::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: skewX(-14deg);
  background: linear-gradient(90deg, rgb(57 255 136 / 0.14), rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0.03)), rgb(3 8 6 / 0.88);
  border-left: 4px solid #39ff88;
}
.nlr-row > * {
  position: relative;
}
.nlr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.nlr-home {
  justify-content: flex-end;
  text-align: right;
}
.nlr-name {
  min-width: 0;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.1;
}
.nlr-lost .nlr-name {
  color: #8fbfa3;
}
.nlr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1em;
}
.nlr-box {
  min-width: 2.9em;
  padding: 0.12em 0.5em;
  text-align: center;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  line-height: 1.1;
  color: #031a0c;
  background: #39ff88;
  clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%);
  box-shadow: 0 0 20px rgb(57 255 136 / 0.6);
  white-space: nowrap;
}
.nlr-box i {
  margin: 0 0.12em;
  font-style: normal;
}
.nlr-score small {
  font-size: 0.32em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #39ff88;
  white-space: nowrap;
}

.nlr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 60px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
}
.nlr-foot-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlr-live {
  color: #39ff88;
  text-shadow: 0 0 10px #39ff88;
}
.nlr-mark {
  margin-left: auto;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  letter-spacing: 0.24em;
  color: #39ff88;
}
.nlr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
</style>
