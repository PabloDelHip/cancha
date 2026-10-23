<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Elite White — editorial: fondo blanco, serif grande, filetes finos y nada más. */
const props = defineProps<PosterProps>()
const HEAD = { story: 560, portrait: 320, square: 236 }
const FOOT = { story: 120, portrait: 84, square: 70 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 80, portrait: 1350 - HEAD.portrait - FOOT.portrait - 64, square: 1080 - HEAD.square - FOOT.square - 56 }, { maxRow: { story: 110, portrait: 84, square: 82 }, crestRatio: 0.62, maxFont: 28, statW: 54 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const title = computed(() => ({ story: 180, portrait: 118, square: 92 })[props.format])
const crest = computed(() => ({ story: 120, portrait: 90, square: 74 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.font * 1.8), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
</script>

<template>
  <div class="ew" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <header class="ew-head" :style="{ height: `${head}px` }">
      <div class="ew-top" :style="{ fontSize: `${Math.round(title * 0.15)}px` }">
        <span class="ew-kicker">{{ withSeason(data.leagueName ?? data.tournamentName, data.season) }}</span>
        <Crest :src="data.logo" :initials="data.logoInitials" :size="crest" shape="circle" :colors="{ primary: '#111111', secondary: '#ffffff' }" font="Playfair Display" />
      </div>
      <h1 class="ew-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? 'Jornada' : 'Tabla' }} <em>{{ data.roundNumber ?? 'general' }}</em></h1>
      <p class="ew-sub" :style="{ fontSize: `${Math.round(title * 0.15)}px` }">{{ data.leagueName ? data.tournamentName : 'Tabla de posiciones' }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
    </header>

    <section class="ew-table">
      <div class="ew-row ew-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span /><span /><span class="ew-left">Equipo</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="ew-row ew-data" :class="{ 'ew-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="ew-pos" :class="{ 'ew-q': r.qualifies }">{{ String(r.position).padStart(2, '0') }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="circle" font="Inter" />
        <span class="ew-name" :class="{ 'ew-two': m.nameLines === 2 }" :style="{ fontSize: `${Math.round(m.nameFont * 0.86)}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="ew-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="ew-pts" :style="{ fontSize: `${Math.round(m.font * 1.2)}px` }">{{ r.points }}</span>
      </div>
    </section>

    <footer class="ew-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 21, portrait: 17, square: 15 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="ew-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.ew {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #111111;
  font-family: 'Inter', sans-serif;
}
.ew-head {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 0 72px 28px;
  border-bottom: 6px solid #111;
  margin: 0 72px;
  padding-left: 0;
  padding-right: 0;
}
.ew-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 0.9em;
  border-bottom: 1px solid #111;
  margin-bottom: 0.4em;
}
.ew-kicker {
  min-width: 0;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ew-title {
  margin: 0;
  padding-bottom: 0.12em;
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.ew-title em {
  font-weight: 600;
  font-style: italic;
}
.ew-sub {
  margin: 0.4em 0 0;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ew-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 72px;
}
.ew-row {
  display: grid;
  align-items: center;
  text-align: center;
}
.ew-cols {
  height: 50px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #777;
  border-bottom: 1px solid #111;
}
.ew-left {
  text-align: left;
}
.ew-data {
  border-bottom: 1px solid #e5e5e5;
}
.ew-pos {
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums;
  font-weight: 700;
  font-style: italic;
  color: #999;
}
.ew-q {
  color: #111;
  text-decoration: underline;
  text-decoration-thickness: 3px;
  text-underline-offset: 6px;
}
.ew-name {
  text-align: left;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.ew-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.1;
}
.ew-num {
  font-weight: 400;
  color: #444;
  font-variant-numeric: tabular-nums;
}
.ew-pts {
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums tabular-nums;
  font-weight: 900;
}
.ew-out {
  opacity: 0.4;
}
.ew-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 0 72px;
  border-top: 6px solid #111;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #555;
  white-space: nowrap;
}
.ew-mark {
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  font-style: italic;
  font-size: 1.6em;
  letter-spacing: 0;
  text-transform: none;
  color: #111;
}
</style>
