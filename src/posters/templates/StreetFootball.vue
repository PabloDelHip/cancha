<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import StreetFootballBackdrop from './street-football/StreetFootballBackdrop.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Street Football — muro de concreto, cinta de precaución y números a plumón. */
const props = defineProps<PosterProps>()
const HEAD = { story: 620, portrait: 330, square: 240 }
const FOOT = { story: 130, portrait: 92, square: 76 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 70, portrait: 1350 - HEAD.portrait - FOOT.portrait - 56, square: 1080 - HEAD.square - FOOT.square - 50 }, { maxRow: { story: 118, portrait: 88, square: 86 }, crestRatio: 0.7, maxFont: 32, statW: 54 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const stacked = computed(() => props.format === 'story')
const title = computed(() => ({ story: 150, portrait: 104, square: 82 })[props.format])
const badge = computed(() => ({ story: 200, portrait: 150, square: 120 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.8), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
/** Cinta de precaución: franja inclinada que cruza la cabecera. */
const tape = computed(() => ({ y: head.value - ({ story: 56, portrait: 44, square: 36 })[props.format] / 2 - 18, h: ({ story: 56, portrait: 44, square: 36 })[props.format] }))
</script>

<template>
  <div class="sf" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <StreetFootballBackdrop :width="m.width" :height="m.height" :tape="tape" />

    <header class="sf-head" :class="{ 'sf-stacked': stacked }" :style="{ height: `${head}px`, paddingBottom: `${tape.h + 20}px` }">
      <div class="sf-badge" :style="{ width: `${badge}px`, height: `${badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.78)" shape="shield" :colors="{ primary: '#111111', secondary: '#ffd400' }" font="Archivo Black" />
      </div>
      <div class="sf-titles">
        <p class="sf-kicker" :style="{ fontSize: `${Math.round(title * 0.2)}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="sf-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? 'Jornada' : 'Tabla' }} <span>{{ data.roundNumber ?? 'general' }}</span></h1>
        <p class="sf-sub" :style="{ fontSize: `${Math.round(title * 0.17)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <section class="sf-table">
      <div class="sf-row sf-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span>#</span><span /><span class="sf-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="sf-row sf-data" :class="{ 'sf-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="sf-pos" :class="{ 'sf-q': r.qualifies }">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="shield" font="Archivo Black" />
        <span class="sf-name" :class="{ 'sf-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="sf-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="sf-pts"><span :style="{ fontSize: `${Math.round(m.font * 1.05)}px` }">{{ r.points }}</span></span>
      </div>
    </section>

    <footer class="sf-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="sf-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.sf {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #2b2b2b;
  color: #f5f5f0;
  font-family: 'Barlow Condensed', sans-serif;
}
.sf-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.sf-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 24px;
}
.sf-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f0;
  transform: rotate(-5deg);
  box-shadow: 0 10px 0 rgb(0 0 0 / 0.35);
}
/* Cinta adhesiva en la esquina del escudo */
.sf-badge::after {
  content: '';
  position: absolute;
  top: -14px;
  left: 50%;
  width: 42%;
  height: 28px;
  transform: translateX(-50%) rotate(3deg);
  background: rgb(240 230 200 / 0.75);
}
.sf-titles {
  min-width: 0;
  max-width: 100%;
}
.sf-kicker {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #ffd400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sf-title {
  margin: 0.04em 0 0;
  font-family: 'Archivo Black', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
  color: #f5f5f0;
  text-shadow: 4px 4px 0 #000;
  white-space: nowrap;
}
.sf-title span {
  font-family: 'Permanent Marker', cursive;
  text-transform: none;
  color: #ffd400;
  display: inline-block;
  font-size: 1.15em;
  line-height: 0.8;
  transform: rotate(-6deg);
}
.sf-sub {
  margin: 0.3em 0 0;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sf-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 46px;
}
.sf-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.sf-cols {
  height: 48px;
  font-family: 'Archivo Black', sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #111;
  background: #ffd400;
  transform: rotate(-0.6deg);
  margin-bottom: 8px;
}
.sf-left {
  text-align: left;
}
.sf-data {
  border-bottom: 2px dashed rgb(245 245 240 / 0.16);
}
.sf-data:nth-child(odd) {
  background: rgb(0 0 0 / 0.22);
}
.sf-pos {
  justify-self: center;
  font-family: 'Permanent Marker', cursive;
  font-size: 1.1em;
  color: #f5f5f0;
  padding: 0 0.2em;
}
.sf-q {
  color: #111;
  background: linear-gradient(transparent 18%, #ffd400 18%, #ffd400 86%, transparent 86%);
  transform: rotate(-4deg);
}
.sf-name {
  text-align: left;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.sf-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.02;
}
.sf-num {
  font-weight: 600;
  color: #d8d8d0;
  font-variant-numeric: tabular-nums;
}
.sf-pts {
  display: flex;
  justify-content: center;
}
.sf-pts > span {
  min-width: 1.9em;
  padding: 0.08em 0.2em;
  font-family: 'Archivo Black', sans-serif;
  color: #111;
  background: #f5f5f0;
  transform: rotate(-3deg);
  box-shadow: 3px 3px 0 #ffd400;
}
.sf-out {
  opacity: 0.4;
}
.sf-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
}
.sf-mark {
  font-family: 'Permanent Marker', cursive;
  font-size: 1.6em;
  letter-spacing: 0.04em;
  text-transform: none;
  color: #ffd400;
  transform: rotate(-4deg);
}
</style>
