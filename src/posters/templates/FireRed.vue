<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason, type PosterRow } from '../data'

/**
 * Fire Red — rojo intenso con cortes diagonales. En la primera imagen, ya con partidos jugados, los
 * tres primeros salen en un podio con todos sus números y la tabla sigue desde el cuarto.
 */
const props = defineProps<PosterProps>()
const HEAD = { story: 300, portrait: 200, square: 150 }
const PODIUM = { story: 470, portrait: 330, square: 270 }
const MAX_ROW = { story: 116, portrait: 86, square: 84 }
const FOOT = { story: 120, portrait: 84, square: 68 }
const podium = computed(() => (props.data.page.index === 0 && props.data.roundNumber !== null && props.data.rows.length >= 4 ? props.data.rows.slice(0, 3) : []))
const tableRows = computed(() => props.data.rows.slice(podium.value.length))
const body = computed(() => ({ story: 1920 - HEAD.story - FOOT.story - 76, portrait: 1350 - HEAD.portrait - FOOT.portrait - 66, square: 1080 - HEAD.square - FOOT.square - 60 })[props.format])
/** Con pocos equipos el podio crece (hasta un 35 %) en vez de dejar un hueco bajo la tabla. */
const podiumH = computed(() => {
  if (!podium.value.length) return 0
  const base = PODIUM[props.format]
  const free = body.value - base - tableRows.value.length * MAX_ROW[props.format]
  return base + Math.round(Math.max(0, Math.min(free * 0.6, base * 0.35)))
})
const tableH = computed(() => body.value - podiumH.value)
/** Las medidas se calculan con las filas de la tabla (sin el podio). */
const m = useMetrics(
  { get data() { return { ...props.data, rows: tableRows.value } }, get format() { return props.format } },
  { get story() { return tableH.value }, get portrait() { return tableH.value }, get square() { return tableH.value } },
  { maxRow: MAX_ROW, crestRatio: 0.68, maxFont: 32, statW: 54 },
)
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const title = computed(() => ({ story: 170, portrait: 118, square: 92 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.8), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
/** Orden visual del podio: 2.º, 1.º, 3.º. */
const steps = computed(() => {
  const [a, b, c] = podium.value
  return [b, a, c].filter((r): r is PosterRow => !!r).map((r) => ({ r, h: r.position === 1 ? 1 : r.position === 2 ? 0.92 : 0.86 }))
})
/** Escala del contenido del podio: crece con él cuando hay pocos equipos. */
const podiumScale = computed(() => ({ story: 1, portrait: 0.74, square: 0.6 })[props.format] * Math.min(1.2, podiumH.value / PODIUM[props.format] || 1))
</script>

<template>
  <div class="fr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <svg class="fr-bg" :viewBox="`0 0 ${m.width} ${m.height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="fr-ember" cx="78%" cy="0%" r="85%">
          <stop offset="0" stop-color="#ff3b1f" stop-opacity="0.75" />
          <stop offset="0.45" stop-color="#7a0b05" stop-opacity="0.6" />
          <stop offset="1" stop-color="#120202" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="fr-slash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff3b1f" stop-opacity="0" />
          <stop offset="0.5" stop-color="#ff3b1f" stop-opacity="0.5" />
          <stop offset="1" stop-color="#ff3b1f" stop-opacity="0" />
        </linearGradient>
        <filter id="fr-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0.06 0" /></filter>
      </defs>
      <rect width="100%" height="100%" fill="#120202" />
      <rect width="100%" height="100%" fill="url(#fr-ember)" />
      <path :d="`M${m.width * 0.35} -20 L${m.width * 0.5} -20 L${m.width * 0.05} ${m.height * 0.55} L${-m.width * 0.1} ${m.height * 0.55} Z`" fill="url(#fr-slash)" opacity="0.35" />
      <path :d="`M${m.width * 1.05} ${m.height * 0.3} L${m.width * 1.12} ${m.height * 0.3} L${m.width * 0.55} ${m.height * 1.02} L${m.width * 0.48} ${m.height * 1.02} Z`" fill="url(#fr-slash)" opacity="0.25" />
      <rect x="0" :y="head - 8" :width="m.width" height="6" fill="#ff3b1f" />
      <rect width="100%" height="100%" filter="url(#fr-grain)" />
    </svg>

    <header class="fr-head" :style="{ height: `${head}px` }">
      <div class="fr-titles">
        <p class="fr-kicker" :style="{ fontSize: `${Math.round(title * (format === 'story' ? 0.15 : 0.19))}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="fr-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? 'Jornada' : 'Tabla' }} <span>{{ data.roundNumber ?? 'general' }}</span></h1>
        <p class="fr-sub" :style="{ fontSize: `${Math.round(title * 0.15)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
      <div class="fr-badge" :style="{ width: `${Math.round(title * 1.05)}px`, height: `${Math.round(title * 1.05)}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(title * 0.8)" shape="shield" :colors="{ primary: '#1a0303', secondary: '#ff3b1f' }" font="Teko" />
      </div>
    </header>

    <section v-if="steps.length" class="fr-podium" :style="{ height: `${podiumH}px`, '--k': podiumScale }">
      <div v-for="s in steps" :key="s.r.teamId" class="fr-step" :class="[`fr-p${s.r.position}`, { 'fr-out': s.r.withdrawn }]" :style="{ height: `${Math.round(s.h * 100)}%` }">
        <span class="fr-place">{{ s.r.position }}°</span>
        <Crest :src="s.r.crest" :initials="s.r.initials" :colors="s.r.colors" :size="Math.round((s.r.position === 1 ? 120 : 100) * podiumScale)" shape="shield" font="Teko" />
        <span class="fr-step-name" :style="{ WebkitLineClamp: format === 'story' ? 2 : 1 }">{{ s.r.name }}</span>
        <span class="fr-step-pts">{{ s.r.points }}<small>PTS</small></span>
        <span class="fr-step-stats">PJ {{ s.r.played }} · G {{ s.r.won }} · E {{ s.r.drawn }} · P {{ s.r.lost }}</span>
        <span class="fr-step-stats">GF {{ s.r.goalsFor }} · GC {{ s.r.goalsAgainst }} · DIF {{ signed(s.r.goalDifference) }}</span>
      </div>
    </section>

    <section class="fr-table">
      <div class="fr-row fr-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span>#</span><span /><span class="fr-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in tableRows" :key="r.teamId" class="fr-row fr-data" :class="{ 'fr-q': r.qualifies, 'fr-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="fr-pos">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="shield" font="Teko" />
        <span class="fr-name" :class="{ 'fr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="fr-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="fr-pts" :style="{ fontSize: `${Math.round(m.font * 1.25)}px` }">{{ r.points }}</span>
      </div>
    </section>

    <footer class="fr-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 26, portrait: 20, square: 18 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="fr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.fr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #120202;
  color: #fff4f0;
  font-family: 'Oswald', sans-serif;
}
.fr-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.fr-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 0 60px;
}
.fr-titles {
  min-width: 0;
}
.fr-kicker {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #ff6a4d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fr-title {
  margin: 0;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  line-height: 0.82;
  text-transform: uppercase;
  white-space: nowrap;
  font-style: italic;
}
.fr-title span {
  color: #ff3b1f;
}
.fr-sub {
  margin: 0.15em 0 0;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff3b1f, #8f0d04);
  clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%);
}
.fr-podium {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: calc(22px * var(--k));
  padding: calc(26px * var(--k)) 60px 0;
}
.fr-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(8px * var(--k));
  padding: calc(18px * var(--k)) 12px 0;
  min-width: 0;
  text-align: center;
  background: linear-gradient(180deg, rgb(255 59 31 / 0.3), rgb(255 59 31 / 0.06));
  border-top: 6px solid #ff3b1f;
  clip-path: polygon(6% 0, 94% 0, 100% 100%, 0 100%);
}
.fr-p1 {
  background: linear-gradient(180deg, #ff3b1f, #8f0d04 70%, rgb(143 13 4 / 0.4));
  border-top-color: #ffd166;
}
.fr-step > * {
  flex: none;
}
.fr-place {
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: calc(64px * var(--k));
  line-height: 0.8;
  color: #ffd166;
}
.fr-step-name {
  max-width: 100%;
  font-weight: 700;
  font-size: calc(30px * var(--k));
  line-height: 1.05;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.fr-step-pts {
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: calc(80px * var(--k));
  line-height: 0.8;
}
.fr-step-pts small {
  margin-left: 6px;
  font-size: 0.36em;
  letter-spacing: 0.1em;
  color: #ffd166;
}
.fr-step-stats {
  font-weight: 500;
  font-size: calc(21px * var(--k));
  letter-spacing: 0.04em;
  color: #ffe1d9;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fr-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 48px;
}
.fr-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.fr-cols {
  height: 46px;
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  font-size: 1.15em;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ff6a4d;
}
.fr-left {
  text-align: left;
}
.fr-data {
  border-top: 1px solid rgb(255 106 77 / 0.18);
}
.fr-data:nth-child(odd) {
  background: rgb(255 255 255 / 0.035);
}
.fr-pos {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: 1.2em;
  color: #ffb4a3;
}
.fr-q .fr-pos {
  background: #ff3b1f;
  color: #fff;
}
.fr-name {
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.fr-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.05;
}
.fr-num {
  font-weight: 400;
  color: #f5c9bf;
  font-variant-numeric: tabular-nums;
}
.fr-pts {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  background: linear-gradient(90deg, #c81e0b, #ff3b1f);
  clip-path: polygon(18% 0, 100% 0, 100% 100%, 0 100%);
}
.fr-out {
  opacity: 0.42;
}
.fr-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
}
.fr-mark {
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: 1.5em;
  letter-spacing: 0.24em;
  color: #ff3b1f;
}
</style>
