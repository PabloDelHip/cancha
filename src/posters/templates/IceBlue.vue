<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Ice Blue — claro y helado: cristales de hielo, cada equipo en su propia tarjeta blanca. */
const props = defineProps<PosterProps>()
const HEAD = { story: 560, portrait: 310, square: 230 }
const FOOT = { story: 120, portrait: 84, square: 70 }
const GAP = 6
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 70, portrait: 1350 - HEAD.portrait - FOOT.portrait - 60, square: 1080 - HEAD.square - FOOT.square - 56 }, { maxRow: { story: 112, portrait: 84, square: 82 }, crestRatio: 0.66, maxFont: 30, statW: 52 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const stacked = computed(() => props.format === 'story')
const title = computed(() => ({ story: 150, portrait: 108, square: 86 })[props.format])
const badge = computed(() => ({ story: 190, portrait: 150, square: 124 })[props.format])
/** La separación entre tarjetas sale del alto de cada fila (el total no cambia). */
const cardH = computed(() => m.value.rowH - GAP)
const grid = computed(() => statGrid(m.value, Math.round(m.value.rowH * 0.78), m.value.crest + 16))
const page = computed(() => pageLabel(props.data))
/** Cristales fijos (triángulos) en las esquinas. */
const shards = computed(() => {
  const w = m.value.width
  const h = m.value.height
  return [
    `M${w} 0 L${w * 0.62} 0 L${w * 0.86} ${h * 0.12} Z`,
    `M${w} 0 L${w * 0.86} ${h * 0.12} L${w} ${h * 0.24} Z`,
    `M${w * 0.62} 0 L${w * 0.48} 0 L${w * 0.7} ${h * 0.06} Z`,
    `M0 ${h} L0 ${h * 0.8} L${w * 0.18} ${h * 0.92} Z`,
    `M0 ${h} L${w * 0.18} ${h * 0.92} L${w * 0.34} ${h} Z`,
  ]
})
</script>

<template>
  <div class="ib" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <svg class="ib-bg" :viewBox="`0 0 ${m.width} ${m.height}`" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ib-sky" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="#d6ecff" />
          <stop offset="0.5" stop-color="#eef7ff" />
          <stop offset="1" stop-color="#dcefff" />
        </linearGradient>
        <linearGradient id="ib-shard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.9" />
          <stop offset="1" stop-color="#7cc4ff" stop-opacity="0.45" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#ib-sky)" />
      <path v-for="(d, i) in shards" :key="i" :d="d" fill="url(#ib-shard)" stroke="#ffffff" stroke-width="2" :opacity="0.55 + (i % 2) * 0.25" />
      <g stroke="#9fd3ff" stroke-width="2" opacity="0.5" fill="none">
        <path :d="`M${m.width * 0.08} ${head * 0.2} l26 0 m-13 -13 l0 26 m-9 -17 l18 18 m0 -18 l-18 18`" />
        <path :d="`M${m.width * 0.93} ${m.height * 0.55} l20 0 m-10 -10 l0 20 m-7 -13 l14 14 m0 -14 l-14 14`" />
      </g>
    </svg>

    <header class="ib-head" :class="{ 'ib-stacked': stacked }" :style="{ height: `${head}px` }">
      <div class="ib-badge" :style="{ width: `${badge}px`, height: `${badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.7)" shape="circle" :colors="{ primary: '#0b4f8a', secondary: '#ffffff' }" font="Exo 2" />
      </div>
      <div class="ib-titles">
        <p class="ib-kicker" :style="{ fontSize: `${Math.round(title * 0.19)}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="ib-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? `Jornada ${data.roundNumber}` : 'Tabla general' }}</h1>
        <p class="ib-sub" :style="{ fontSize: `${Math.round(title * 0.17)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <section class="ib-table">
      <div class="ib-row ib-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span /><span /><span class="ib-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="ib-slot" :style="{ height: `${m.rowH}px` }">
        <div class="ib-row ib-card" :class="{ 'ib-q': r.qualifies, 'ib-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${cardH}px`, fontSize: `${m.font}px` }">
          <span class="ib-pos">{{ r.position }}</span>
          <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="Math.min(m.crest, cardH - 8)" shape="circle" font="Exo 2" />
          <span class="ib-name" :class="{ 'ib-two': m.nameLines === 2 }" :style="{ fontSize: `${Math.round(m.nameFont * 0.9)}px` }">{{ r.name }}</span>
          <span v-for="c in STAT_COLUMNS" :key="c.key" class="ib-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
          <span class="ib-pts">{{ r.points }}</span>
        </div>
      </div>
    </section>

    <footer class="ib-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="ib-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ib {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #eef7ff;
  color: #0a2540;
  font-family: 'Exo 2', sans-serif;
}
.ib-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.ib-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.ib-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 30px;
}
.ib-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5bb8f5, #0b4f8a);
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
}
.ib-titles {
  min-width: 0;
  max-width: 100%;
}
.ib-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #1d8fe0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ib-title {
  margin: 0.02em 0 0;
  font-weight: 900;
  font-style: italic;
  line-height: 0.95;
  text-transform: uppercase;
  background: linear-gradient(180deg, #1673c4, #0b3a66);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ib-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4a6a8a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ib-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 46px;
}
.ib-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.ib-cols {
  height: 44px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #1d8fe0;
}
.ib-left {
  text-align: left;
}
.ib-slot {
  display: flex;
  align-items: center;
}
.ib-card {
  width: 100%;
  border-radius: 16px;
  background: rgb(255 255 255 / 0.92);
  box-shadow: 0 6px 18px rgb(11 79 138 / 0.1), inset 0 0 0 1.5px #ffffff;
  overflow: hidden;
}
.ib-q {
  box-shadow: 0 6px 18px rgb(11 79 138 / 0.14), inset 6px 0 0 #1d8fe0;
}
.ib-pos {
  font-weight: 800;
  font-style: italic;
  font-size: 1.05em;
  color: #6b8bab;
}
.ib-q .ib-pos {
  color: #0b4f8a;
}
.ib-name {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.ib-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.05;
}
.ib-num {
  font-weight: 500;
  color: #36597c;
  font-variant-numeric: tabular-nums;
}
.ib-pts {
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1.15em;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
}
.ib-out {
  opacity: 0.45;
}
.ib-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #36597c;
  white-space: nowrap;
}
.ib-mark {
  font-weight: 900;
  font-style: italic;
  font-size: 1.4em;
  letter-spacing: 0.2em;
  color: #0b4f8a;
}
</style>
