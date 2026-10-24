<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FireRedBackdrop from './FireRedBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultsPosterProps } from '../../layout'

/**
 * Fire Red — Resultados de la jornada. La brasa y los cortes de la tabla: Teko itálica con el
 * número en rojo, filas con el filo rojo y el marcador en el bloque rojo cortado de los puntos.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 300, foot: 110, title: 150, badge: 150, meta: 26 },
  portrait: { head: 220, foot: 84, title: 112, badge: 118, meta: 22 },
  square: { head: 180, foot: 68, title: 88, badge: 94, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 300 - 110 - 130, portrait: 1350 - 220 - 84 - 100, square: 1080 - 180 - 68 - 84 }, { nameChars: 11 })
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
/** «Jornada 10»: el número en rojo, como en la tabla. */
const title = computed(() => {
  const x = /^(.*?)\s*(\d+)$/.exec(props.data.roundLabel)
  return x ? { text: x[1]!, num: x[2]! } : { text: props.data.roundLabel, num: '' }
})
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
</script>

<template>
  <div class="frr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <FireRedBackdrop :width="m.width" :height="m.height" :head="s.head" />

    <header class="frr-head" :style="{ height: `${s.head}px` }">
      <div class="frr-titles">
        <p class="frr-tag" :style="{ fontSize: `${Math.round(s.title * 0.22)}px` }">Resultados</p>
        <h1 class="frr-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <span v-if="title.num">{{ title.num }}</span></h1>
        <p class="frr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ kicker }}</p>
        <p v-if="subtitle" class="frr-sub" :style="{ fontSize: `${Math.round(s.title * 0.13)}px` }">{{ subtitle }}</p>
      </div>
      <div class="frr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.76)" shape="shield" :colors="{ primary: '#1a0303', secondary: '#ff3b1f' }" font="Teko" />
      </div>
    </header>

    <section class="frr-list">
      <div v-for="r in data.rows" :key="r.id" class="frr-row" :style="{ height: `${m.rowH}px` }">
        <div class="frr-team frr-home" :class="{ 'frr-lost': r.winner === 'away' }">
          <span class="frr-name" :class="{ 'frr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
          <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="shield" font="Teko" />
        </div>
        <div class="frr-score" :style="{ fontSize: `${Math.round(m.score * 1.05)}px` }">
          <span class="frr-box">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</span>
          <small v-if="r.detail">{{ r.detail }}</small>
        </div>
        <div class="frr-team" :class="{ 'frr-lost': r.winner === 'home' }">
          <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="shield" font="Teko" />
          <span class="frr-name" :class="{ 'frr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
        </div>
      </div>
    </section>

    <p v-if="meta" class="frr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="frr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 26, portrait: 20, square: 18 })[format]}px` }">
      <span class="frr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.frr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #120202;
  color: #fff4f0;
  font-family: 'Oswald', sans-serif;
}
.frr-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 0 60px 8px;
}
.frr-titles {
  min-width: 0;
}
.frr-tag {
  margin: 0 0 0.1em;
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ffd166;
}
.frr-title {
  margin: 0;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  line-height: 0.82;
  text-transform: uppercase;
  white-space: nowrap;
  font-style: italic;
}
.frr-title span {
  color: #ff3b1f;
}
.frr-kicker {
  margin: 0.25em 0 0;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #ff6a4d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frr-sub {
  margin: 0.2em 0 0;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff3b1f, #8f0d04);
  clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%);
}

.frr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 48px;
}
.frr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  padding: 0 14px;
  border-top: 1px solid rgb(255 106 77 / 0.22);
}
.frr-row:nth-child(odd) {
  background: rgb(255 255 255 / 0.035);
}
.frr-row:first-child {
  border-top: 6px solid #ff3b1f;
}
.frr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.frr-home {
  justify-content: flex-end;
  text-align: right;
}
.frr-name {
  min-width: 0;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  /* Con menos, la tilde de una mayúscula de la segunda línea toca la primera. */
  line-height: 1.22;
}
.frr-lost .frr-name {
  color: #c9a49b;
}
.frr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.04em;
}
.frr-box {
  min-width: 2.6em;
  padding: 0.1em 0.5em 0 0.6em;
  text-align: center;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
  background: linear-gradient(90deg, #c81e0b, #ff3b1f);
  clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%);
  white-space: nowrap;
}
.frr-box i {
  margin: 0 0.12em;
  font-style: normal;
  color: #ffd166;
}
.frr-score small {
  font-size: 0.26em;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffd166;
  white-space: nowrap;
}

.frr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.frr-mark {
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: 1.5em;
  letter-spacing: 0.24em;
  color: #ff3b1f;
}
</style>
