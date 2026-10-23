<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Stadium Lights — noche de estadio: reflectores que se cruzan, cancha abajo y la tabla en una tarjeta. */
const props = defineProps<PosterProps>()
const HEAD = { story: 600, portrait: 330, square: 230 }
const FOOT = { story: 130, portrait: 88, square: 72 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 110, portrait: 1350 - HEAD.portrait - FOOT.portrait - 96, square: 1080 - HEAD.square - FOOT.square - 90 }, { maxRow: { story: 118, portrait: 86, square: 84 }, crestRatio: 0.68, maxFont: 30, statW: 52, ptsW: 76 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const row = computed(() => props.format === 'square')
const title = computed(() => ({ story: 210, portrait: 128, square: 104 })[props.format])
const badge = computed(() => ({ story: 170, portrait: 96, square: 132 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.rowH * 0.8), m.value.crest + 20))
const page = computed(() => pageLabel(props.data))
/** Torres de reflectores: posición del foco y punto de la cancha al que apunta (fijos). */
const towers = computed(() => {
  const w = m.value.width
  const h = m.value.height
  return [
    { x: 70, y: 70, tx: w * 0.62, ty: h * 0.78 },
    { x: w - 70, y: 70, tx: w * 0.38, ty: h * 0.78 },
  ]
})
const beam = (t: { x: number; y: number; tx: number; ty: number }, spread: number) => `M${t.x - 30} ${t.y} L${t.x + 30} ${t.y} L${t.tx + spread} ${t.ty} L${t.tx - spread} ${t.ty} Z`
</script>

<template>
  <div class="sl" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <svg class="sl-bg" :viewBox="`0 0 ${m.width} ${m.height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#10264f" />
          <stop offset="0.55" stop-color="#071226" />
          <stop offset="1" stop-color="#03130c" />
        </linearGradient>
        <linearGradient id="sl-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.34" />
          <stop offset="1" stop-color="#cfe2ff" stop-opacity="0" />
        </linearGradient>
        <radialGradient id="sl-flare">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.25" stop-color="#e6f0ff" stop-opacity="0.8" />
          <stop offset="1" stop-color="#9ec5ff" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="sl-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0d5a33" stop-opacity="0" />
          <stop offset="1" stop-color="#0d5a33" stop-opacity="0.85" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sl-sky)" />
      <rect :y="m.height * 0.6" width="100%" :height="m.height * 0.4" fill="url(#sl-grass)" />
      <!-- Franjas del pasto y líneas de la cancha en perspectiva -->
      <path v-for="k in 6" :key="k" :d="`M${-200 + k * 60} ${m.height} L${m.width * 0.5 - 260 + k * 80} ${m.height * 0.62} L${m.width * 0.5 - 220 + k * 80} ${m.height * 0.62} L${-110 + k * 60 + 160} ${m.height} Z`" fill="#ffffff" :opacity="k % 2 ? 0.025 : 0" />
      <ellipse :cx="m.width / 2" :cy="m.height * 0.86" :rx="m.width * 0.34" :ry="m.height * 0.05" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="3" />
      <line x1="0" :y1="m.height * 0.86" :x2="m.width" :y2="m.height * 0.86" stroke="#ffffff" stroke-opacity="0.1" stroke-width="3" />
      <g v-for="(t, i) in towers" :key="i">
        <path :d="beam(t, m.width * 0.2)" fill="url(#sl-beam)" opacity="0.55" />
        <path :d="beam(t, m.width * 0.09)" fill="url(#sl-beam)" opacity="0.7" />
        <rect :x="t.x - 46" :y="t.y - 30" width="92" height="56" rx="6" fill="#0b1630" stroke="#cfe2ff" stroke-opacity="0.5" />
        <circle v-for="d in 8" :key="d" :cx="t.x - 33 + ((d - 1) % 4) * 22" :cy="t.y - 14 + Math.floor((d - 1) / 4) * 24" r="7" fill="#ffffff" />
        <circle :cx="t.x" :cy="t.y" r="150" fill="url(#sl-flare)" opacity="0.65" />
      </g>
    </svg>

    <header class="sl-head" :class="{ 'sl-row-head': row }" :style="{ height: `${head}px` }">
      <div class="sl-badge" :style="{ width: `${badge}px`, height: `${badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.8)" shape="circle" :colors="{ primary: '#0b1630', secondary: '#e6f0ff' }" font="Bebas Neue" />
      </div>
      <div class="sl-titles">
        <p class="sl-kicker" :style="{ fontSize: `${Math.round(title * (format === 'story' ? 0.12 : 0.15))}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="sl-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? `Jornada ${data.roundNumber}` : 'Tabla general' }}</h1>
        <p class="sl-sub" :style="{ fontSize: `${Math.round(title * 0.14)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <section class="sl-card">
      <div class="sl-row sl-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span /><span /><span class="sl-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="sl-row sl-data" :class="{ 'sl-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="sl-pos" :class="{ 'sl-q': r.qualifies }" :style="{ width: `${Math.round(m.rowH * 0.56)}px`, height: `${Math.round(m.rowH * 0.56)}px`, fontSize: `${Math.round(m.font * 1.05)}px` }">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="circle" font="Bebas Neue" />
        <span class="sl-name" :class="{ 'sl-two': m.nameLines === 2 }" :style="{ fontSize: `${Math.round(m.nameFont * 0.86)}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="sl-num" :class="{ 'sl-dif': c.key === 'goalDifference' }">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="sl-pts" :style="{ fontSize: `${Math.round(m.font * 1.3)}px` }">{{ r.points }}</span>
      </div>
    </section>

    <footer class="sl-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="sl-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.sl {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #071226;
  color: #f1f6ff;
  font-family: 'Inter', sans-serif;
}
.sl-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.sl-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 80px 26px;
  text-align: center;
}
.sl-row-head {
  flex-direction: row;
  justify-content: center;
  gap: 34px;
  text-align: left;
  padding-bottom: 10px;
}
.sl-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #ffffff, #cfe2ff 70%);
  box-shadow: 0 0 0 4px rgb(230 240 255 / 0.25), 0 0 60px rgb(158 197 255 / 0.55);
}
.sl-titles {
  min-width: 0;
  max-width: 100%;
}
.sl-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #9ec5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sl-title {
  margin: 0.04em 0 0;
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-shadow: 0 0 40px rgb(158 197 255 / 0.6), 0 4px 0 rgb(0 0 0 / 0.35);
  white-space: nowrap;
}
.sl-sub {
  margin: 0.25em 0 0;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sl-card {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 44px;
  padding: 14px 22px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgb(20 38 78 / 0.86), rgb(7 18 38 / 0.92));
  border: 1.5px solid rgb(207 226 255 / 0.22);
  box-shadow: 0 30px 70px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.18);
}
.sl-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.sl-cols {
  height: 48px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9ec5ff;
  border-bottom: 1.5px solid rgb(158 197 255 / 0.35);
}
.sl-left {
  text-align: left;
}
.sl-data {
  border-bottom: 1px solid rgb(255 255 255 / 0.07);
}
.sl-data:last-child {
  border-bottom: none;
}
.sl-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  border-radius: 10px;
  font-family: 'Bebas Neue', sans-serif;
  color: #c9d6ee;
}
.sl-q {
  background: #e6f0ff;
  color: #071226;
  box-shadow: 0 0 16px rgb(158 197 255 / 0.7);
}
.sl-name {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.sl-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.08;
}
.sl-num {
  font-weight: 500;
  color: #c9d6ee;
  font-variant-numeric: tabular-nums;
}
.sl-dif {
  font-weight: 700;
  color: #ffffff;
}
.sl-pts {
  font-family: 'Bebas Neue', sans-serif;
  color: #ffffff;
  text-shadow: 0 0 18px rgb(158 197 255 / 0.8);
}
.sl-out {
  opacity: 0.42;
}
.sl-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
}
.sl-mark {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.3em;
  color: #ffffff;
}
</style>
