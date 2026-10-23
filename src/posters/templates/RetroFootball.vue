<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Retro Football — papel de los 70: franjas curvas, medios tonos y tinta café. */
const props = defineProps<PosterProps>()
const HEAD = { story: 600, portrait: 330, square: 240 }
const FOOT = { story: 150, portrait: 100, square: 84 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 100, portrait: 1350 - HEAD.portrait - FOOT.portrait - 80, square: 1080 - HEAD.square - FOOT.square - 70 }, { maxRow: { story: 116, portrait: 86, square: 84 }, crestRatio: 0.7, maxFont: 30, statW: 54 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const title = computed(() => ({ story: 150, portrait: 104, square: 84 })[props.format])
const badge = computed(() => ({ story: 200, portrait: 150, square: 120 })[props.format])
const stacked = computed(() => props.format === 'story')
const grid = computed(() => statGrid(m.value, Math.round(m.value.rowH * 0.82), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
const STRIPES = ['#c2410c', '#e0a526', '#2f5d50', '#7c3a12']
/** Franjas que bajan en curva desde la esquina superior derecha. */
const bands = computed(() => {
  const w = m.value.width
  const h = head.value
  return STRIPES.map((c, i) => ({ c, d: `M${w * 0.7 + i * 42} -10 C${w * 0.76 + i * 42} ${h * 0.22}, ${w * 0.86 + i * 26} ${h * 0.34}, ${w + 20} ${h * 0.3 + i * 40}`, w: 38 }))
})
</script>

<template>
  <div class="rf" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <svg class="rf-bg" :viewBox="`0 0 ${m.width} ${m.height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="rf-dots" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="9" cy="9" r="3.4" fill="#7c3a12" /></pattern>
        <linearGradient id="rf-fade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="1" />
          <stop offset="0.45" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <mask id="rf-mask"><rect width="100%" height="100%" fill="url(#rf-fade)" /></mask>
        <filter id="rf-paper"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 0 0.15  0 0 0 0.12 0" /></filter>
      </defs>
      <rect width="100%" height="100%" fill="#f1e3c3" />
      <rect width="100%" height="100%" fill="url(#rf-dots)" mask="url(#rf-mask)" opacity="0.18" />
      <path v-for="b in bands" :key="b.c" :d="b.d" :stroke="b.c" :stroke-width="b.w" fill="none" />
      <g :transform="`translate(0 ${m.height - foot / 2})`">
        <rect v-for="(c, i) in STRIPES" :key="c" :y="i * (foot / 8)" :width="m.width" :height="foot / 8" :fill="c" />
      </g>
      <rect width="100%" height="100%" filter="url(#rf-paper)" />
    </svg>

    <header class="rf-head" :class="{ 'rf-stacked': stacked }" :style="{ height: `${head}px` }">
      <div class="rf-badge" :style="{ width: `${badge}px`, height: `${badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.74)" shape="circle" :colors="{ primary: '#7c3a12', secondary: '#f1e3c3' }" font="Righteous" />
      </div>
      <div class="rf-titles">
        <p class="rf-kicker" :style="{ fontSize: `${Math.round(title * 0.2)}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="rf-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? `Jornada ${data.roundNumber}` : 'Tabla general' }}</h1>
        <p class="rf-sub" :style="{ fontSize: `${Math.round(title * 0.19)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <section class="rf-table">
      <div class="rf-row rf-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span>#</span><span /><span class="rf-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="rf-row rf-data" :class="{ 'rf-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="rf-pos" :class="{ 'rf-q': r.qualifies }" :style="{ width: `${Math.round(m.rowH * 0.6)}px`, height: `${Math.round(m.rowH * 0.6)}px`, fontSize: `${Math.round(m.font * (r.position > 9 ? 0.78 : 0.95))}px` }">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="shield" font="Righteous" />
        <span class="rf-name" :class="{ 'rf-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="rf-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="rf-pts"><span :style="{ width: `${Math.round(m.rowH * 0.74)}px`, height: `${Math.round(m.rowH * 0.74)}px` }">{{ r.points }}</span></span>
      </div>
    </section>

    <footer class="rf-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px`, paddingBottom: `${foot / 2 + 6}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="rf-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.rf {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1e3c3;
  color: #3b2314;
  font-family: 'Oswald', sans-serif;
}
.rf-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.rf-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.rf-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 30px;
}
.rf-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fbf3df;
  box-shadow: 0 0 0 6px #7c3a12, 0 0 0 12px #e0a526, 10px 12px 0 12px rgb(124 58 18 / 0.25);
}
.rf-titles {
  min-width: 0;
  max-width: 100%;
}
.rf-kicker {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #c2410c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-title {
  margin: 0.06em 0 0;
  font-family: 'Righteous', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  color: #3b2314;
  text-shadow: 5px 5px 0 #e0a526, 10px 10px 0 #c2410c;
  white-space: nowrap;
}
.rf-sub {
  margin: 0.45em 0 0;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b4a33;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 50px;
}
.rf-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.rf-cols {
  height: 50px;
  border-radius: 25px;
  background: #3b2314;
  color: #f1e3c3;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.rf-left {
  text-align: left;
}
.rf-data {
  border-bottom: 2px dotted rgb(124 58 18 / 0.35);
}
.rf-data:nth-child(odd) {
  background: rgb(124 58 18 / 0.07);
}
.rf-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  border-radius: 50%;
  font-family: 'Righteous', sans-serif;
  color: #7c3a12;
  border: 2.5px solid #7c3a12;
}
.rf-q {
  background: #2f5d50;
  border-color: #2f5d50;
  color: #f1e3c3;
}
.rf-name {
  text-align: left;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.rf-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.05;
}
.rf-num {
  font-weight: 400;
  color: #5a3a24;
  font-variant-numeric: tabular-nums;
}
.rf-pts {
  display: flex;
  justify-content: center;
}
.rf-pts > span {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #c2410c;
  color: #fbf3df;
  font-family: 'Righteous', sans-serif;
  box-shadow: 3px 3px 0 #3b2314;
}
.rf-out {
  opacity: 0.42;
}
.rf-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a3a24;
  white-space: nowrap;
}
.rf-mark {
  font-family: 'Righteous', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.08em;
  text-transform: none;
  color: #c2410c;
}
</style>
