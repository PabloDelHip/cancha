<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import UltimateLeagueBackdrop from './ultimate-league/UltimateLeagueBackdrop.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Ultimate League — morado eléctrico, panal de hexágonos, título metálico y filas con esquinas cortadas. */
const props = defineProps<PosterProps>()
const HEAD = { story: 600, portrait: 340, square: 250 }
const FOOT = { story: 130, portrait: 90, square: 74 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 90, portrait: 1350 - HEAD.portrait - FOOT.portrait - 70, square: 1080 - HEAD.square - FOOT.square - 60 }, { maxRow: { story: 116, portrait: 86, square: 84 }, crestRatio: 0.68, maxFont: 30, statW: 54 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const title = computed(() => ({ story: 140, portrait: 96, square: 76 })[props.format])
const badge = computed(() => ({ story: 220, portrait: 130, square: 100 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.8), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
</script>

<template>
  <div class="ul" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <UltimateLeagueBackdrop :width="m.width" :height="m.height" :head="head" />

    <header class="ul-head" :style="{ height: `${head}px` }">
      <div class="ul-badge" :style="{ width: `${badge}px`, height: `${Math.round(badge * 1.1)}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(badge * 0.66)" shape="hex" :colors="{ primary: '#2a1260', secondary: '#ff3df5' }" font="Russo One" />
      </div>
      <div class="ul-titles">
        <p class="ul-kicker" :style="{ fontSize: `${Math.round(title * 0.2)}px` }">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</p>
        <h1 class="ul-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? `Jornada ${data.roundNumber}` : 'Tabla general' }}</h1>
        <p class="ul-sub" :style="{ fontSize: `${Math.round(title * 0.19)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
      </div>
    </header>

    <section class="ul-table">
      <div class="ul-row ul-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span>#</span><span /><span class="ul-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="ul-row ul-data" :class="{ 'ul-q': r.qualifies, 'ul-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="ul-pos">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="hex" font="Russo One" />
        <span class="ul-name" :class="{ 'ul-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="ul-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="ul-pts"><span :style="{ width: `${Math.round(m.rowH * 0.78)}px`, height: `${Math.round(m.rowH * 0.78)}px` }">{{ r.points }}</span></span>
      </div>
    </section>

    <footer class="ul-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="ul-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ul {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #1a0b3b;
  color: #f3ecff;
  font-family: 'Chakra Petch', sans-serif;
}
.ul-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 0 70px;
  text-align: center;
}
.ul-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #ffffff, #b9b3d6 45%, #6d5fa8);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  filter: drop-shadow(0 0 30px rgb(255 61 245 / 0.6));
}
.ul-titles {
  min-width: 0;
  max-width: 100%;
}
.ul-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #ff3df5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ul-title {
  margin: 0.05em 0 0;
  font-family: 'Russo One', sans-serif;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ffffff 0%, #d9d4ee 45%, #8c82b8 55%, #f1edff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ul-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b9a8e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ul-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  margin: 0 46px;
}
.ul-row {
  position: relative;
  display: grid;
  align-items: center;
  text-align: center;
}
.ul-cols {
  height: 44px;
  font-family: 'Russo One', sans-serif;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3dd6ff;
}
.ul-left {
  text-align: left;
}
.ul-data::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.03));
  clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%);
}
.ul-q::before {
  background: linear-gradient(90deg, rgb(255 61 245 / 0.32), rgb(61 214 255 / 0.08));
}
.ul-data > * {
  position: relative;
}
.ul-pos {
  font-family: 'Russo One', sans-serif;
  color: #c9b8f5;
}
.ul-q .ul-pos {
  color: #ff3df5;
}
.ul-name {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.ul-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.04;
}
.ul-num {
  font-weight: 500;
  color: #d8ccff;
  font-variant-numeric: tabular-nums;
}
.ul-pts {
  display: flex;
  justify-content: center;
}
.ul-pts > span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Russo One', sans-serif;
  color: #fff;
  background: linear-gradient(160deg, #ff3df5, #8a1bd6);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.ul-out {
  opacity: 0.4;
}
.ul-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 60px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #b9a8e6;
  white-space: nowrap;
}
.ul-mark {
  font-family: 'Russo One', sans-serif;
  font-size: 1.4em;
  letter-spacing: 0.24em;
  background: linear-gradient(90deg, #ff3df5, #3dd6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
