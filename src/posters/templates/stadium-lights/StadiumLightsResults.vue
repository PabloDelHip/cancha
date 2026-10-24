<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import StadiumLightsBackdrop from './StadiumLightsBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultsPosterProps } from '../../layout'

/**
 * Stadium Lights — Resultados de la jornada. El estadio de noche de la tabla: los resultados en la
 * tarjeta de vidrio azul y cada marcador en la pastilla clara e iluminada de los clasificados.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 500, foot: 120, title: 150, badge: 140, meta: 26 },
  portrait: { head: 320, foot: 86, title: 110, badge: 90, meta: 22 },
  square: { head: 226, foot: 70, title: 90, badge: 116, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 500 - 120 - 130, portrait: 1350 - 320 - 86 - 100, square: 1080 - 226 - 70 - 86 }, { nameChars: 13 })
const row = computed(() => props.format === 'square')
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 12) / Math.max(12, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
</script>

<template>
  <div class="slr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <StadiumLightsBackdrop :width="m.width" :height="m.height" />

    <header class="slr-head" :class="{ 'slr-row-head': row }" :style="{ height: `${s.head}px` }">
      <div class="slr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.8)" shape="circle" :colors="{ primary: '#0b1630', secondary: '#e6f0ff' }" font="Bebas Neue" />
      </div>
      <div class="slr-titles">
        <p class="slr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ kicker }}</p>
        <h1 class="slr-title" :style="{ fontSize: `${titleSize}px` }"><span class="slr-tag">Resultados</span> {{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="slr-sub" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="slr-card">
      <div v-for="r in data.rows" :key="r.id" class="slr-row" :style="{ height: `${m.rowH}px` }">
        <div class="slr-team slr-home" :class="{ 'slr-lost': r.winner === 'away' }">
          <span class="slr-name" :class="{ 'slr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
          <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="circle" font="Bebas Neue" />
        </div>
        <div class="slr-score" :style="{ fontSize: `${m.score}px` }">
          <span class="slr-box">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</span>
          <small v-if="r.detail">{{ r.detail }}</small>
        </div>
        <div class="slr-team" :class="{ 'slr-lost': r.winner === 'home' }">
          <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="circle" font="Bebas Neue" />
          <span class="slr-name" :class="{ 'slr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
        </div>
      </div>
    </section>

    <p v-if="meta" class="slr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="slr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span class="slr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.slr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #071226;
  color: #f1f6ff;
  font-family: 'Inter', sans-serif;
}
.slr-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 80px 18px;
  text-align: center;
}
.slr-row-head {
  flex-direction: row;
  justify-content: center;
  gap: 34px;
  text-align: left;
  padding-bottom: 6px;
}
.slr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #ffffff, #cfe2ff 70%);
  box-shadow: 0 0 0 4px rgb(230 240 255 / 0.25), 0 0 60px rgb(158 197 255 / 0.55);
}
.slr-titles {
  min-width: 0;
  max-width: 100%;
}
.slr-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #9ec5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slr-title {
  margin: 0.06em 0 0;
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-shadow: 0 0 40px rgb(158 197 255 / 0.6), 0 4px 0 rgb(0 0 0 / 0.35);
  white-space: nowrap;
}
.slr-tag {
  display: block;
  margin-bottom: 0.08em;
  font-size: 0.36em;
  letter-spacing: 0.3em;
  color: #9ec5ff;
  text-shadow: none;
}
.slr-sub {
  margin: 0.25em 0 0;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* La tarjeta de vidrio azul de la tabla */
.slr-card {
  position: relative;
  flex: 0 1 auto;
  margin: auto 44px;
  padding: 10px 22px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgb(20 38 78 / 0.86), rgb(7 18 38 / 0.92));
  border: 1.5px solid rgb(207 226 255 / 0.22);
  box-shadow: 0 30px 70px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.18);
}
.slr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
}
.slr-row:last-child {
  border-bottom: none;
}
.slr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.slr-home {
  justify-content: flex-end;
  text-align: right;
}
.slr-name {
  min-width: 0;
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.04;
}
.slr-lost .slr-name {
  color: #9fb3d1;
}
.slr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.06em;
}
.slr-box {
  min-width: 2.6em;
  padding: 0.06em 0.4em;
  border-radius: 14px;
  text-align: center;
  font-family: 'Bebas Neue', sans-serif;
  line-height: 1.05;
  color: #071226;
  background: #e6f0ff;
  box-shadow: 0 0 22px rgb(158 197 255 / 0.75);
  white-space: nowrap;
}
.slr-box i {
  margin: 0 0.15em;
  font-style: normal;
  color: #5b7299;
}
.slr-score small {
  font-size: 0.28em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9ec5ff;
  white-space: nowrap;
}

.slr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slr-mark {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.3em;
  color: #ffffff;
}
</style>
