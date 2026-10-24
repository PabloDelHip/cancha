<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import NeonLeagueBackdrop from './neon-league/NeonLeagueBackdrop.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Neon League — negro, verde neón, piso de rejilla y filas inclinadas. */
const props = defineProps<PosterProps>()
const HEAD = { story: 580, portrait: 350, square: 250 }
const FOOT = { story: 150, portrait: 96, square: 78 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 90, portrait: 1350 - HEAD.portrait - FOOT.portrait - 60, square: 1080 - HEAD.square - FOOT.square - 54 }, { maxRow: { story: 120, portrait: 86, square: 86 }, crestRatio: 0.7, maxFont: 32, statW: 54 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const big = computed(() => ({ story: 290, portrait: 190, square: 130 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.9), m.value.crest + 20))
const page = computed(() => pageLabel(props.data))
const number = computed(() => (props.data.roundNumber ? String(props.data.roundNumber).padStart(2, '0') : '00'))
</script>

<template>
  <div class="nl" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <NeonLeagueBackdrop :width="m.width" :height="m.height" />

    <header class="nl-head" :style="{ height: `${head}px` }">
      <span class="nl-big" :style="{ fontSize: `${data.roundNumber ? big : Math.round(big * 0.62)}px` }">{{ data.roundNumber ? `J${number}` : 'INICIO' }}</span>
      <div class="nl-meta">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(big * 0.42)" shape="hex" :colors="{ primary: '#06140d', secondary: '#39ff88' }" font="Orbitron" />
        <div class="nl-text">
          <p class="nl-kicker" :style="{ fontSize: `${Math.round(big * 0.12)}px` }">{{ data.roundNumber ? 'Tabla · Jornada ' + data.roundNumber : 'Tabla de posiciones' }}</p>
          <p class="nl-name" :style="{ fontSize: `${Math.round(big * 0.16)}px` }">{{ data.leagueName ?? data.tournamentName }}</p>
          <p class="nl-sub" :style="{ fontSize: `${Math.round(big * 0.1)}px` }">{{ data.leagueName ? withSeason(data.tournamentName, data.season) : data.tournamentName.includes(data.season) ? 'Tabla de posiciones' : `Temporada ${data.season}` }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
        </div>
      </div>
    </header>

    <section class="nl-table">
      <div class="nl-row nl-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span>#</span><span /><span class="nl-left">EQUIPO</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>PTS</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="nl-row nl-data" :class="{ 'nl-q': r.qualifies, 'nl-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="nl-pos">{{ String(r.position).padStart(2, '0') }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="hex" font="Orbitron" />
        <span class="nl-team" :class="{ 'nl-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameFont}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="nl-num" :class="{ 'nl-dif': c.key === 'goalDifference' }">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="nl-pts">{{ r.points }}</span>
      </div>
    </section>

    <footer class="nl-foot" :style="{ height: `${foot}px` }">
      <span class="nl-live">●</span>
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · {{ page }}</template></span>
      <span class="nl-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.nl {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #030605;
  color: #eafff2;
  font-family: 'Rajdhani', sans-serif;
}
.nl-head {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px 60px 0;
}
.nl-big {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: -0.02em;
  color: transparent;
  -webkit-text-stroke: 4px #39ff88;
  text-shadow: 0 0 24px rgb(57 255 136 / 0.55), 0 0 60px rgb(57 255 136 / 0.3);
}
.nl-meta {
  display: flex;
  align-items: center;
  gap: 26px;
  margin-top: 18px;
  min-width: 0;
}
.nl-text {
  min-width: 0;
}
.nl-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #39ff88;
}
.nl-name {
  margin: 0.05em 0 0;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nl-sub {
  margin: 0.2em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nl-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  margin: 0 48px;
}
.nl-row {
  position: relative;
  display: grid;
  align-items: center;
  text-align: center;
}
.nl-cols {
  height: 46px;
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #39ff88;
}
.nl-left {
  text-align: left;
}
.nl-data::before {
  content: '';
  position: absolute;
  inset: 0 8px 0 0;
  transform: skewX(-14deg);
  background: linear-gradient(90deg, rgb(57 255 136 / 0.14), rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0.03)), rgb(3 8 6 / 0.88);
  border-left: 4px solid rgb(57 255 136 / 0.35);
}
.nl-q::before {
  border-left-color: #39ff88;
  box-shadow: inset 0 0 0 1px rgb(57 255 136 / 0.35), 0 0 18px rgb(57 255 136 / 0.18);
}
.nl-data > * {
  position: relative;
}
.nl-pos {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  font-size: 0.82em;
  color: #39ff88;
}
.nl-team {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.nl-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.02;
}
.nl-num {
  font-weight: 600;
  color: #cfe9da;
  font-variant-numeric: tabular-nums;
}
.nl-dif {
  color: #39ff88;
}
.nl-pts {
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  color: #031a0c;
  height: 82%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #39ff88;
  clip-path: polygon(16% 0, 100% 0, 84% 100%, 0 100%);
  box-shadow: 0 0 20px rgb(57 255 136 / 0.6);
}
.nl-out {
  opacity: 0.4;
}
.nl-foot {
  position: relative;
  background: linear-gradient(180deg, rgb(3 6 5 / 0), rgb(3 6 5 / 0.92) 35%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 60px;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8fbfa3;
  white-space: nowrap;
}
.nl-live {
  color: #39ff88;
  text-shadow: 0 0 10px #39ff88;
}
.nl-mark {
  margin-left: auto;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  letter-spacing: 0.24em;
  color: #39ff88;
}
</style>
