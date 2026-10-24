<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultsPosterProps } from '../../layout'

/**
 * Elite White — Resultados de la jornada. Editorial como la tabla: blanco, Playfair, filetes finos
 * entre partidos y el marcador en serif negra, sin cajas. El que perdió va en gris.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 480, foot: 120, title: 170, logo: 110, meta: 24 },
  portrait: { head: 300, foot: 84, title: 118, logo: 84, meta: 20 },
  square: { head: 248, foot: 70, title: 92, logo: 70, meta: 17 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 480 - 120 - 110, portrait: 1350 - 300 - 84 - 84, square: 1080 - 248 - 70 - 70 }, { nameChars: 11 })
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
/** «Jornada 10»: el número en cursiva, como en la tabla. */
const title = computed(() => {
  const x = /^(.*?)\s*(\d+)$/.exec(props.data.roundLabel)
  return x ? { text: x[1]!, num: x[2]! } : { text: props.data.roundLabel, num: '' }
})
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
</script>

<template>
  <div class="ewr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <header class="ewr-head" :style="{ height: `${s.head}px` }">
      <div class="ewr-top" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">
        <span class="ewr-kicker">{{ kicker }}</span>
        <Crest :src="data.logo" :initials="data.logoInitials" :size="s.logo" shape="circle" :colors="{ primary: '#111111', secondary: '#ffffff' }" font="Playfair Display" />
      </div>
      <p class="ewr-tag" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">Resultados</p>
      <h1 class="ewr-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <em v-if="title.num">{{ title.num }}</em></h1>
      <p v-if="subtitle" class="ewr-sub" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ subtitle }}</p>
    </header>

    <section class="ewr-list">
      <div v-for="r in data.rows" :key="r.id" class="ewr-row" :style="{ height: `${m.rowH}px` }">
        <div class="ewr-team ewr-home" :class="{ 'ewr-lost': r.winner === 'away' }">
          <span class="ewr-name" :class="{ 'ewr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
          <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="circle" font="Playfair Display" />
        </div>
        <div class="ewr-score" :style="{ fontSize: `${m.score}px` }">
          <span class="ewr-box">{{ r.homeScore }}<i>–</i>{{ r.awayScore }}</span>
          <small v-if="r.detail">{{ r.detail }}</small>
        </div>
        <div class="ewr-team" :class="{ 'ewr-lost': r.winner === 'home' }">
          <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="circle" font="Playfair Display" />
          <span class="ewr-name" :class="{ 'ewr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
        </div>
      </div>
    </section>

    <footer class="ewr-foot" :style="{ height: `${s.foot}px`, fontSize: `${s.meta}px` }">
      <span class="ewr-meta">{{ meta }}</span>
      <span class="ewr-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.ewr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #111111;
  font-family: 'Inter', sans-serif;
}
.ewr-head {
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  margin: 0 72px;
  padding-bottom: 28px;
  border-bottom: 6px solid #111;
}
.ewr-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 0.9em;
  border-bottom: 1px solid #111;
  margin-bottom: 0.6em;
}
.ewr-kicker {
  min-width: 0;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ewr-tag {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 600;
  color: #555;
}
.ewr-title {
  margin: 0;
  padding-bottom: 0.12em;
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.ewr-title em {
  font-weight: 600;
  font-style: italic;
}
.ewr-sub {
  margin: 0.3em 0 0;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ewr-list {
  flex: 0 1 auto;
  margin: auto 72px;
}
.ewr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 20px;
  border-bottom: 1px solid #e5e5e5;
}
.ewr-row:last-child {
  border-bottom: none;
}
.ewr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.ewr-home {
  justify-content: flex-end;
  text-align: right;
}
.ewr-name {
  min-width: 0;
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ewr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.12;
}
.ewr-lost .ewr-name {
  color: #888;
}
.ewr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.02em;
}
.ewr-box {
  min-width: 2.4em;
  text-align: center;
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums tabular-nums;
  font-weight: 900;
  line-height: 1.1;
  white-space: nowrap;
}
.ewr-box i {
  margin: 0 0.1em;
  font-style: normal;
  font-weight: 400;
  color: #999;
}
.ewr-score small {
  font-family: 'Playfair Display', serif;
  font-size: 0.28em;
  font-style: italic;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}

.ewr-foot {
  flex: none;
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
.ewr-meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ewr-mark {
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  font-style: italic;
  font-size: 1.6em;
  letter-spacing: 0;
  text-transform: none;
  color: #111;
}
</style>
