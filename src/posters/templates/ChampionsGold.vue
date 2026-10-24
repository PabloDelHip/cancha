<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../parts/Crest.vue'
import ChampionsGoldBackdrop from './champions-gold/ChampionsGoldBackdrop.vue'
import { STAT_COLUMNS, pageLabel, statGrid, useMetrics, type PosterProps } from '../layout'
import { signed, withSeason } from '../data'

/** Champions Gold — azul noche, dorado, simetría y medallón central. */
const props = defineProps<PosterProps>()
const HEAD = { story: 560, portrait: 330, square: 250 }
const FOOT = { story: 140, portrait: 96, square: 78 }
const m = useMetrics(props, { story: 1920 - HEAD.story - FOOT.story - 90, portrait: 1350 - HEAD.portrait - FOOT.portrait - 70, square: 1080 - HEAD.square - FOOT.square - 60 }, { maxRow: { story: 120, portrait: 88, square: 88 }, crestRatio: 0.7, statW: 54, ptsW: 74, maxFont: 28 })
const head = computed(() => HEAD[props.format])
const foot = computed(() => FOOT[props.format])
const medal = computed(() => ({ story: 210, portrait: 120, square: 96 })[props.format])
const title = computed(() => ({ story: 120, portrait: 84, square: 64 })[props.format])
const grid = computed(() => statGrid(m.value, Math.round(m.value.rowH * 0.72), m.value.crest + 18))
const page = computed(() => pageLabel(props.data))
</script>

<template>
  <div class="cg" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <ChampionsGoldBackdrop :width="m.width" :height="m.height" :head="head" />

    <header class="cg-head" :style="{ height: `${head}px` }">
      <div class="cg-medal" :style="{ width: `${medal}px`, height: `${medal}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(medal * 0.68)" shape="circle" :colors="{ primary: '#0b1736', secondary: '#d4af37' }" font="Cinzel" />
      </div>
      <p class="cg-kicker" :style="{ fontSize: `${Math.round(title * 0.24)}px` }"><span class="cg-rule" />{{ data.leagueName ?? 'Tabla de posiciones' }}<span class="cg-rule" /></p>
      <h1 class="cg-title" :style="{ fontSize: `${title}px` }">{{ data.roundNumber ? `Jornada ${data.roundNumber}` : 'Tabla de posiciones' }}</h1>
      <p class="cg-sub" :style="{ fontSize: `${Math.round(title * 0.22)}px` }">{{ withSeason(data.tournamentName, data.season) }}<template v-if="data.groupLabel"> · {{ data.groupLabel }}</template></p>
    </header>

    <section class="cg-table">
      <div class="cg-row cg-cols" :style="{ gridTemplateColumns: grid, fontSize: `${m.headFont}px` }">
        <span /><span /><span class="cg-left">Club</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key">{{ c.label }}</span>
        <span>Pts</span>
      </div>
      <div v-for="r in data.rows" :key="r.teamId" class="cg-row" :class="{ 'cg-out': r.withdrawn }" :style="{ gridTemplateColumns: grid, height: `${m.rowH}px`, fontSize: `${m.font}px` }">
        <span class="cg-pos" :class="{ 'cg-pos-q': r.qualifies }" :style="{ width: `${Math.round(m.rowH * 0.58)}px`, height: `${Math.round(m.rowH * 0.58)}px`, fontSize: `${Math.round(m.font * 0.78)}px` }">{{ r.position }}</span>
        <Crest :src="r.crest" :initials="r.initials" :colors="r.colors" :size="m.crest" shape="circle" font="Montserrat" />
        <span class="cg-name" :class="{ 'cg-two': m.nameLines === 2 }" :style="{ fontSize: `${Math.round(m.nameFont * 0.84)}px` }">{{ r.name }}</span>
        <span v-for="c in STAT_COLUMNS" :key="c.key" class="cg-num">{{ c.key === 'goalDifference' ? signed(r.goalDifference) : r[c.key] }}</span>
        <span class="cg-pts">{{ r.points }}</span>
      </div>
    </section>

    <footer class="cg-foot" :style="{ height: `${foot}px`, fontSize: `${({ story: 22, portrait: 17, square: 16 })[format]}px` }">
      <span>{{ data.cutLabel ?? 'Aún sin partidos jugados' }}<template v-if="page"> · Posiciones {{ page }}</template></span>
      <span class="cg-dot">◆</span>
      <span class="cg-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.cg {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f8f1dc;
  font-family: 'Montserrat', sans-serif;
  background: #0b1736;
}
.cg-head {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 80px 0;
}
.cg-medal {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 45%, #7a5a14);
  box-shadow: 0 0 0 4px #0b1736, 0 0 0 6px #d4af37, 0 16px 40px rgb(0 0 0 / 0.5);
  margin-bottom: 0.4em;
}
.cg-kicker {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 0.5em 0 0;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: #d4af37;
  white-space: nowrap;
}
.cg-rule {
  width: 70px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #d4af37);
}
.cg-rule:last-child {
  background: linear-gradient(90deg, #d4af37, transparent);
}
.cg-title {
  margin: 0.08em 0 0;
  font-family: 'Cinzel', serif;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: linear-gradient(180deg, #fff6d5 0%, #f3d27a 40%, #b8892a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.cg-sub {
  margin: 0.5em 0 0;
  max-width: 100%;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cg-table {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 64px;
}
.cg-row {
  display: grid;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid rgb(212 175 55 / 0.25);
}
.cg-cols {
  height: 54px;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #d4af37;
  border-bottom: 2px solid #d4af37;
}
.cg-left {
  text-align: left;
}
.cg-pos {
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  border-radius: 50%;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  color: #f3d27a;
  border: 1.5px solid rgb(212 175 55 / 0.5);
}
.cg-pos-q {
  color: #0b1736;
  border: none;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 55%, #8a6a1f);
}
.cg-name {
  text-align: left;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 12px 0 4px;
}
.cg-two {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.1;
}
.cg-num {
  font-weight: 500;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
}
.cg-pts {
  font-family: 'Cinzel', serif;
  font-weight: 900;
  font-size: 1.12em;
  color: #f3d27a;
}
.cg-out {
  opacity: 0.45;
}
.cg-foot {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 0 70px 20px;
  white-space: nowrap;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #94a3b8;
}
.cg-dot {
  color: #d4af37;
}
.cg-mark {
  font-family: 'Cinzel', serif;
  font-weight: 900;
  color: #d4af37;
  letter-spacing: 0.3em;
}
</style>
