<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Urban Black — negro y blanco, grano, brochazos y un título que manda. */
const props = defineProps<PosterProps>()
const HEAD = { story: 640, portrait: 300, square: 220 }
const FOOT = { story: 150, portrait: 104, square: 84 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 70, portrait: 1350 - HEAD.portrait - FOOT.portrait - 56, square: 1080 - HEAD.square - FOOT.square - 50 }, { maxRow: { story: 124, portrait: 92, square: 92 }, crestRatio: 0.74 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const title = computed(() => (props.data.roundNumber ? 'JORNADA' : 'TABLA'))
const big = computed(() => (props.data.roundNumber ? String(props.data.roundNumber) : '00'))
const titleSize = computed(() => ({ story: 196, portrait: 140, square: 108 })[props.format])
const stacked = computed(() => props.format === 'story')
const badge = computed(() => (stacked.value ? 150 : Math.round(titleSize.value * 0.95)))
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.7), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
</script>

<template>
  <div class="ub" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <!-- Fondo: grano y brochazos (SVG propio) -->
    <svg class="ub-bg" :viewBox="`0 0 ${m.width} ${m.height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id="ub-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0" /></filter>
        <filter id="ub-rough"><feTurbulence type="fractalNoise" baseFrequency="0.04 0.6" numOctaves="3" seed="7" /><feDisplacementMap in="SourceGraphic" scale="38" /></filter>
      </defs>
      <rect width="100%" height="100%" fill="#090909" />
      <g filter="url(#ub-rough)" opacity="0.9">
        <path :d="`M${m.width * 0.58} -40 L${m.width + 60} -40 L${m.width + 60} ${head * 0.62} L${m.width * 0.74} ${head * 0.2} Z`" fill="#f4f4f4" opacity="0.9" />
        <path :d="`M-60 ${head * 0.98} L${m.width * 0.42} ${head * 0.86} L${m.width * 0.45} ${head * 0.93} L-60 ${head * 1.08} Z`" fill="#e5e5e5" opacity="0.5" />
        <path :d="`M-60 ${m.height - foot * 0.2} L${m.width * 0.7} ${m.height - foot * 1.4} L${m.width * 0.74} ${m.height - foot * 1.2} L-60 ${m.height + 40} Z`" fill="#ffffff" opacity="0.16" />
      </g>
      <rect width="100%" height="100%" filter="url(#ub-grain)" />
    </svg>

    <!-- Cabecera -->
    <header class="ub-head" :class="{ 'ub-stacked': stacked }" :style="{ height: `${head}px` }">
      <span v-if="data.roundNumber" class="ub-ghost" :style="{ fontSize: `${titleSize * 2.1}px` }">{{ big }}</span>
      <div class="ub-badge" :style="{ width: `${badge}px`, height: `${badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.76)" shape="circle" :colors="{ primary: '#111111', secondary: '#ffffff' }" font="Anton" />
      </div>
      <div class="ub-titles">
        <p class="ub-eyebrow" :style="{ fontSize: `${Math.round(titleSize * 0.2)}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="ub-title" :style="{ fontSize: `${titleSize}px` }">{{ title }} <span>{{ data.roundNumber ?? '' }}</span></h1>
        <p class="ub-sub" :style="{ fontSize: `${Math.round(titleSize * 0.17)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <!-- Tabla -->
    <section class="ub-table">
      <div class="ub-row ub-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span /><span /><span class="ub-name-head">EQUIPO</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span class="ub-pts-head">PTS</span>
      </div>
      <div
        v-for="r in data.rows"
        :key="r.teamId"
        class="ub-row"
        :class="{ 'ub-q': r.qualifies, 'ub-out': r.withdrawn }"
        :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }"
      >
        <span class="ub-pos">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="shield" font="Anton" />
        <span class="ub-name" :class="{ 'ub-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="ub-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="ub-pts">{{ r.points }}</span>
      </div>
    </section>

    <!-- Pie -->
    <footer class="ub-foot" :style="{ height: `${foot}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="ub-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ub {
  position: relative;
  overflow: hidden;
  background: #090909;
  color: #fff;
  font-family: 'Barlow Condensed', sans-serif;
  display: flex;
  flex-direction: column;
}
.ub-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ub-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 40px;
  padding: 0 56px;
}
.ub-ghost {
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-52%);
  font-family: 'Anton', sans-serif;
  line-height: 1;
  color: transparent;
  -webkit-text-stroke: 3px rgb(120 120 120 / 0.35);
}
.ub-badge {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transform: skewX(-8deg) rotate(-4deg);
  box-shadow: 10px 10px 0 rgb(255 255 255 / 0.18);
}
.ub-badge > * {
  transform: skewX(8deg) rotate(4deg);
}
.ub-titles {
  position: relative;
  min-width: 0;
}
.ub-eyebrow {
  margin: 0;
  text-shadow: 0 2px 8px #000;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ub-title {
  margin: 0.02em 0 0;
  font-family: 'Anton', sans-serif;
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: 0.01em;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #9ca3af 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ub-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a3a3a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ub-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 40px;
  padding: 0 16px;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.03), rgb(255 255 255 / 0.07) 40%, rgb(255 255 255 / 0.02));
  border-left: 6px solid #fff;
}
.ub-row {
  display: grid;
  align-items: center;
  column-gap: 0;
  border-bottom: 1.5px solid rgb(255 255 255 / 0.14);
  text-align: center;
}
.ub-cols {
  height: 50px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: #a3a3a3;
  border-bottom: 2px solid rgb(255 255 255 / 0.6);
}
.ub-name-head {
  text-align: left;
  padding-left: 4px;
}
.ub-pts-head {
  color: #fff;
}
.ub-pos {
  font-family: 'Anton', sans-serif;
  font-size: 1.05em;
  color: #e5e5e5;
}
.ub-q .ub-pos {
  color: #0a0a0a;
  background: #fff;
  height: 76%;
  display: flex;
  align-items: center;
  justify-content: center;
  clip-path: polygon(12% 0, 100% 0, 88% 100%, 0 100%);
}
.ub-name {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.ub-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.02;
}
.ub-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 28px;
}
.ub-num {
  font-weight: 600;
  color: #e5e5e5;
  font-variant-numeric: tabular-nums;
}
.ub-pts {
  font-family: 'Anton', sans-serif;
  font-size: 1.08em;
  color: #0a0a0a;
  background: #fff;
  height: 78%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ub-out {
  opacity: 0.45;
}
.ub-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 56px;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #a3a3a3;
}
.ub-mark {
  font-family: 'Anton', sans-serif;
  letter-spacing: 0.24em;
  color: #fff;
}
</style>
