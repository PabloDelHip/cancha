<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import NeonLeagueBackdrop from './NeonLeagueBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Neon League — Próximo partido. El lenguaje de la tabla: número de jornada enorme en contorno
 * neón, escudos hexagonales, paneles inclinados con el filo verde y la hora en el bloque neón de
 * los puntos, sobre el piso de rejilla.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 560, foot: 140, crest: 330, name: 50, vs: 150, big: 280, info: 42 },
  portrait: { head: 340, foot: 96, crest: 260, name: 40, vs: 120, big: 180, info: 34 },
  square: { head: 250, foot: 78, crest: 196, name: 32, vs: 96, big: 128, info: 28 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, crest: Math.round(b.crest * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Rajdhani', charWidth: 0.6, weight: 700, ink: '#e9fff2', muted: '#7fa892', accent: '#39ff88', line: 'rgb(57 255 136 / 0.25)', detailFont: 'Orbitron', detailWeight: 700, detailBg: '#39ff88', detailInk: '#04120a' }
const dims = computed(() => FORMATS[props.format])
/** «J10» en grande, como la tabla, si la jornada se llama así; un nombre propio va entero. */
const big = computed(() => {
  const d = props.data
  if (d.roundNumber && d.roundLabel === `Jornada ${d.roundNumber}`) return { text: `J${String(d.roundNumber).padStart(2, '0')}`, size: s.value.big }
  return { text: d.roundLabel, size: Math.round(Math.min(s.value.big * 0.5, (s.value.big * 4.4) / Math.max(8, d.roundLabel.length))) }
})
const kicker = computed(() => (big.value.text === props.data.roundLabel ? tag.value : `${tag.value} · ${props.data.roundLabel}`))
const subtitle = computed(() => [props.data.leagueName ? withSeason(props.data.tournamentName, props.data.season) : props.data.season, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="nlm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <NeonLeagueBackdrop :width="dims.width" :height="dims.height" />

    <header class="nlm-head" :style="{ height: `${s.head}px` }">
      <span class="nlm-big" :style="{ fontSize: `${big.size}px` }">{{ big.text }}</span>
      <div class="nlm-meta">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.big * 0.42)" shape="hex" :colors="{ primary: '#06140d', secondary: '#39ff88' }" font="Orbitron" />
        <div class="nlm-text">
          <p class="nlm-kicker" :style="{ fontSize: `${Math.round(s.big * 0.12)}px` }">{{ kicker }}</p>
          <p class="nlm-name" :style="{ fontSize: `${Math.round(s.big * 0.16)}px` }">{{ data.leagueName ?? data.tournamentName }}</p>
          <p v-if="subtitle" class="nlm-sub" :style="{ fontSize: `${Math.round(s.big * 0.1)}px` }">{{ subtitle }}</p>
        </div>
      </div>
    </header>

    <!-- Duelo: dos paneles inclinados con el filo neón -->
    <section class="nlm-duel">
      <div class="nlm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="nlm-team" :class="{ 'nlm-lost': final?.winner && final.winner !== x.side }">
            <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="s.crest" shape="hex" font="Orbitron" />
            <span class="nlm-side" :style="{ fontSize: `${Math.round(s.name * 0.5)}px` }">{{ x.label }}</span>
            <span class="nlm-team-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="nlm-vs" :class="{ 'nlm-score': final }" :style="{ fontSize: `${vsSize}px`, marginTop: `${Math.round((s.crest - vsSize) / 2 + 30)}px` }">{{ vs ?? 'VS' }}</div>
        </template>
      </div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="nlm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="nlm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="nlm-when">
        <template v-if="data.dateLabel">
          <span class="nlm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="nlm-time">{{ data.timeLabel }}</span>
        </template>
        <span v-if="data.scheduleNote" class="nlm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="nlm-venue">{{ data.venue }}</p>
    </section>

    <footer class="nlm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 20, square: 17 })[format]}px` }">
      <span class="nlm-live">●</span>
      <span>{{ tag }}</span>
      <span class="nlm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.nlm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #030605;
  color: #eafff2;
  font-family: 'Rajdhani', sans-serif;
}
.nlm-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 60px 0;
}
.nlm-big {
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
.nlm-meta {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-top: 18px;
  min-width: 0;
}
.nlm-text {
  min-width: 0;
}
.nlm-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #39ff88;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlm-name {
  margin: 0.05em 0 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nlm-sub {
  margin: 0.2em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nlm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 48px;
}
.nlm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.nlm-team {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 18px 26px;
  text-align: center;
}
.nlm-team::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: skewX(-8deg);
  background: linear-gradient(180deg, rgb(57 255 136 / 0.14), rgb(255 255 255 / 0.04) 60%, rgb(255 255 255 / 0.02)), rgb(3 8 6 / 0.88);
  border-left: 4px solid #39ff88;
  box-shadow: inset 0 0 0 1px rgb(57 255 136 / 0.3), 0 0 24px rgb(57 255 136 / 0.16);
}
.nlm-team > * {
  position: relative;
}
.nlm-side {
  margin-top: 22px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #39ff88;
}
.nlm-team-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 700;
  line-height: 1.12;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nlm-vs {
  flex: none;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 3px #39ff88;
  text-shadow: 0 0 24px rgb(57 255 136 / 0.6);
}

.nlm-info {
  position: relative;
  flex: none;
  margin: 0 56px;
  padding: 0.4em 0.7em;
  background: linear-gradient(90deg, rgb(57 255 136 / 0.14), rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0.03)), rgb(3 8 6 / 0.9);
  border-left: 4px solid #39ff88;
}
.nlm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7em;
}
.nlm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  font-size: 1.2em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.nlm-time {
  white-space: nowrap;
  padding: 0.12em 0.7em;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 1.05em;
  color: #031a0c;
  background: #39ff88;
  clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%);
  box-shadow: 0 0 20px rgb(57 255 136 / 0.6);
}
.nlm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.08em 0.8em;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.9em;
  text-transform: uppercase;
  color: #031a0c;
  background: #39ff88;
  clip-path: polygon(3% 0, 100% 0, 97% 100%, 0 100%);
}
.nlm-venue {
  margin: 0.25em 0 0;
  font-weight: 600;
  font-size: 0.7em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nlm-foot {
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
.nlm-live {
  color: #39ff88;
  text-shadow: 0 0 10px #39ff88;
}
.nlm-mark {
  margin-left: auto;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  letter-spacing: 0.24em;
  color: #39ff88;
}

/* 7B-E: resultado final */
.nlm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.nlm-lost .nlm-name {
  opacity: 0.6;
}
.nlm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
