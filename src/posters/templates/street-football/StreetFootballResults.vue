<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import StreetFootballBackdrop from './StreetFootballBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Street Football — Resultados de la jornada. El muro de la tabla con la cinta de precaución;
 * filas con línea punteada y franja oscura alterna, y el marcador en la etiqueta blanca girada
 * con sombra amarilla de los puntos.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 560, foot: 120, title: 140, badge: 180, meta: 26, tape: 56 },
  portrait: { head: 320, foot: 88, title: 100, badge: 130, meta: 22, tape: 44 },
  square: { head: 240, foot: 72, title: 80, badge: 104, meta: 19, tape: 36 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 560 - 120 - 100, portrait: 1350 - 320 - 88 - 80, square: 1080 - 240 - 72 - 70 }, { nameChars: 13 })
const stacked = computed(() => props.format === 'story')
/** Misma cinta que la tabla: franja inclinada que cruza el pie de la cabecera. */
const tape = computed(() => ({ y: s.value.head - s.value.tape / 2 - 18, h: s.value.tape }))
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
/** «Jornada 10»: el número a plumón, como en la tabla. */
const title = computed(() => {
  const x = /^(.*?)\s*(\d+)$/.exec(props.data.roundLabel)
  return x ? { text: x[1]!, num: x[2]! } : { text: props.data.roundLabel, num: '' }
})
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Barlow Condensed', nameWeight: 800, ink: '#f5f5f0', lost: '#a8a8a0', scoreFont: 'Archivo Black', scoreBg: '#f5f5f0', scoreInk: '#111111', card: 'rgb(0 0 0 / 0.25)', cardBorder: '2px dashed rgb(245 245 240 / 0.18)', detail: '#ffd400', crestShape: 'shield', crestFont: 'Archivo Black' }
</script>

<template>
  <div class="sfr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <StreetFootballBackdrop :width="m.width" :height="m.height" :tape="tape" />

    <header class="sfr-head" :class="{ 'sfr-stacked': stacked }" :style="{ height: `${s.head}px`, paddingBottom: `${tape.h + (stacked ? 44 : 30)}px` }">
      <div class="sfr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.78)" shape="shield" :colors="{ primary: '#111111', secondary: '#ffd400' }" font="Archivo Black" />
      </div>
      <div class="sfr-titles">
        <p class="sfr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">Resultados · {{ kicker }}</p>
        <h1 class="sfr-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <span v-if="title.num">{{ title.num }}</span></h1>
        <p v-if="subtitle" class="sfr-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="sfr-list" :class="{ 'sfr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="sfr-row" :style="{ height: `${m.rowH}px` }">
          <div class="sfr-team sfr-home" :class="{ 'sfr-lost': r.winner === 'away' }">
            <span class="sfr-name" :class="{ 'sfr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
            <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="shield" font="Archivo Black" />
          </div>
          <div class="sfr-score" :style="{ fontSize: `${Math.round(m.score * 0.8)}px` }">
            <span class="sfr-box">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</span>
            <small v-if="r.detail">{{ r.detail }}</small>
          </div>
          <div class="sfr-team" :class="{ 'sfr-lost': r.winner === 'home' }">
            <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="shield" font="Archivo Black" />
            <span class="sfr-name" :class="{ 'sfr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
          </div>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="sfr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="sfr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span class="sfr-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.sfr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #2b2b2b;
  color: #f5f5f0;
  font-family: 'Barlow Condensed', sans-serif;
}
.sfr-head {
  position: relative;
  flex: none;
  /* El relleno inferior deja libre la franja de la cinta (no suma alto). */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.sfr-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 24px;
}
.sfr-badge {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f0;
  transform: rotate(-5deg);
  box-shadow: 0 10px 0 rgb(0 0 0 / 0.35);
}
/* Cinta adhesiva arriba de la hoja */
.sfr-badge::after {
  content: '';
  position: absolute;
  top: -14px;
  left: 50%;
  width: 42%;
  height: 28px;
  transform: translateX(-50%) rotate(3deg);
  background: rgb(240 230 200 / 0.75);
}
.sfr-titles {
  min-width: 0;
  max-width: 100%;
}
.sfr-kicker {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffd400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sfr-title {
  margin: 0.04em 0 0;
  font-family: 'Archivo Black', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
  color: #f5f5f0;
  text-shadow: 4px 4px 0 #000;
  white-space: nowrap;
}
.sfr-title span {
  font-family: 'Permanent Marker', cursive;
  text-transform: none;
  color: #ffd400;
  display: inline-block;
  font-size: 1.15em;
  line-height: 0.8;
  transform: rotate(-6deg);
}
.sfr-sub {
  margin: 0.3em 0 0;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sfr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 46px;
}
.sfr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  padding: 0 12px;
  border-bottom: 2px dashed rgb(245 245 240 / 0.16);
}
.sfr-row:nth-child(odd) {
  background: rgb(0 0 0 / 0.22);
}
.sfr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.sfr-home {
  justify-content: flex-end;
  text-align: right;
}
.sfr-name {
  min-width: 0;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sfr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.1;
}
.sfr-lost .sfr-name {
  color: #a8a8a0;
}
.sfr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.14em;
}
.sfr-box {
  min-width: 2.7em;
  padding: 0.08em 0.35em;
  text-align: center;
  font-family: 'Archivo Black', sans-serif;
  line-height: 1.1;
  color: #111;
  background: #f5f5f0;
  transform: rotate(-3deg);
  box-shadow: 4px 4px 0 #ffd400;
  white-space: nowrap;
}
.sfr-box i {
  margin: 0 0.1em;
  font-style: normal;
  color: #777;
}
.sfr-score small {
  font-family: 'Permanent Marker', cursive;
  font-size: 0.3em;
  letter-spacing: 0.04em;
  color: #ffd400;
  white-space: nowrap;
}

.sfr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sfr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.sfr-mark {
  font-family: 'Permanent Marker', cursive;
  font-size: 1.6em;
  letter-spacing: 0.04em;
  color: #ffd400;
  transform: rotate(-4deg);
}
.sfr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
</style>
