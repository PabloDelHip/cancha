<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import UrbanBlackBackdrop from './UrbanBlackBackdrop.vue'
import { URBAN_BLACK } from './tokens'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Urban Black — Resultados de la jornada. La cabecera del cartel de partido; cada resultado en una
 * fila con el filo blanco de la tabla y el marcador en el bloque blanco invertido de los puntos.
 * El ganador va en blanco; el que perdió, en gris.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 400, foot: 120, title: 128, badge: 130, meta: 30 },
  portrait: { head: 290, foot: 90, title: 104, badge: 104, meta: 26 },
  square: { head: 230, foot: 80, title: 84, badge: 86, meta: 22 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 400 - 120 - 110, portrait: 1350 - 290 - 90 - 90, square: 1080 - 230 - 80 - 76 })
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
const eyebrow = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
const meta = computed(() => [props.data.dateLabel, props.data.pendingNote, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Anton', nameWeight: 400, ink: '#ffffff', lost: '#a3a3a3', scoreFont: 'Anton', scoreBg: '#ffffff', scoreInk: '#0a0a0a', scoreClip: 'polygon(10% 0, 100% 0, 90% 100%, 0 100%)', card: 'rgb(255 255 255 / 0.05)', cardBorder: '1px solid rgb(255 255 255 / 0.12)', detail: '#d4d4d4', crestShape: 'shield', crestFont: 'Anton' }
</script>

<template>
  <div class="ubr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <UrbanBlackBackdrop :width="m.width" :height="m.height" :head="s.head" :foot="s.foot" />

    <header class="ubr-head" :style="{ height: `${s.head}px` }">
      <div class="ubr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.76)" shape="circle" :colors="URBAN_BLACK.crest" font="Anton" />
      </div>
      <div class="ubr-titles">
        <p class="ubr-tag" :style="{ fontSize: `${Math.round(s.title * 0.24)}px` }">Resultados</p>
        <h1 class="ubr-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p class="ubr-eyebrow" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ eyebrow }}</p>
        <p v-if="subtitle" class="ubr-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="ubr-list" :class="{ 'ubr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="ubr-row" :style="{ height: `${m.rowH}px` }">
          <div class="ubr-team ubr-home" :class="{ 'ubr-lost': r.winner === 'away' }">
            <span class="ubr-name" :class="{ 'ubr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
            <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="shield" font="Anton" />
          </div>
          <div class="ubr-score" :style="{ fontSize: `${m.score}px` }">
            <span class="ubr-box">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</span>
            <small v-if="r.detail">{{ r.detail }}</small>
          </div>
          <div class="ubr-team ubr-away" :class="{ 'ubr-lost': r.winner === 'home' }">
            <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="shield" font="Anton" />
            <span class="ubr-name" :class="{ 'ubr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
          </div>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="ubr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="ubr-foot" :style="{ height: `${s.foot}px` }">
      <span class="ubr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ubr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #090909;
  color: #fff;
  font-family: 'Barlow Condensed', sans-serif;
}
.ubr-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 56px;
}
.ubr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transform: skewX(-8deg) rotate(-4deg);
  box-shadow: 8px 8px 0 rgb(255 255 255 / 0.18);
}
.ubr-badge > * {
  transform: skewX(8deg) rotate(4deg);
}
.ubr-titles {
  position: relative;
  min-width: 0;
}
.ubr-tag {
  display: inline-block;
  margin: 0 0 0.25em;
  padding: 0.06em 0.6em;
  font-family: 'Anton', sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #0a0a0a;
  background: #fff;
  clip-path: polygon(6% 0, 100% 0, 94% 100%, 0 100%);
}
.ubr-title {
  margin: 0;
  font-family: 'Anton', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 55%, #9ca3af 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ubr-eyebrow {
  margin: 0.35em 0 0;
  text-shadow: 0 2px 8px #000;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ubr-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a3a3a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Lista: el bloque con filo blanco de la tabla */
.ubr-list {
  position: relative;
  /* Centrada en el alto libre: con pocos partidos no queda un bloque vacío. */
  flex: 0 1 auto;
  margin-block: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-inline: 40px;
  padding: 0 18px;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.03), rgb(255 255 255 / 0.07) 40%, rgb(255 255 255 / 0.02));
  border-left: 6px solid #fff;
}
.ubr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 20px;
  border-bottom: 1.5px solid rgb(255 255 255 / 0.14);
}
.ubr-row:last-child {
  border-bottom: none;
}
.ubr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}
.ubr-home {
  justify-content: flex-end;
  text-align: right;
}
.ubr-name {
  min-width: 0;
  font-family: 'Anton', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ubr-two {
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.12;
}
.ubr-lost .ubr-name {
  color: #a3a3a3;
}
.ubr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08em;
}
.ubr-box {
  min-width: 2.7em;
  padding: 0.04em 0.4em;
  text-align: center;
  font-family: 'Anton', sans-serif;
  line-height: 1.1;
  color: #0a0a0a;
  background: #fff;
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ubr-box i {
  margin: 0 0.18em;
  font-style: normal;
  color: #737373;
}
.ubr-score small {
  font-size: 0.3em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d4d4d4;
  white-space: nowrap;
}

.ubr-meta {
  position: relative;
  flex: none;
  margin: 0 56px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #d4d4d4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ubr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 56px;
  font-size: 26px;
}
.ubr-mark {
  font-family: 'Anton', sans-serif;
  letter-spacing: 0.24em;
  color: #fff;
  opacity: 0.85;
}
.ubr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
</style>
