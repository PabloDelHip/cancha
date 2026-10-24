<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import IceBlueBackdrop from './IceBlueBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Ice Blue — Jornada: resultados (7B-C) u horarios (7B-D), según `data.mode`. Como la tabla: cada resultado en su propia tarjeta blanca y
 * el marcador en el bloque azul degradado de los puntos.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 480, foot: 110, title: 140, badge: 170, meta: 26 },
  portrait: { head: 290, foot: 80, title: 100, badge: 130, meta: 22 },
  square: { head: 220, foot: 66, title: 80, badge: 106, meta: 19 },
} as const
const GAP = 10
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 480 - 110 - 100, portrait: 1350 - 290 - 80 - 80, square: 1080 - 220 - 66 - 70 }, { nameChars: 10, maxName: 34 })
const stacked = computed(() => props.format === 'story')
const cardH = computed(() => m.value.rowH - GAP)
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
/** «Resultados» o «Programación»: la misma plantilla sirve para las dos imágenes de la jornada. */
const tag = computed(() => (props.data.mode === 'results' ? 'Resultados' : 'Programación'))
const meta = computed(() => [props.data.dateLabel, props.data.note, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Exo 2', nameWeight: 800, ink: '#0a2540', lost: '#6b8bab', scoreFont: 'Exo 2', scoreWeight: 900, scoreBg: 'linear-gradient(135deg, #3aa6f2, #0b4f8a)', scoreInk: '#ffffff', scoreRadius: '10px', card: 'rgb(255 255 255 / 0.94)', cardRadius: '18px', cardShadow: '0 6px 18px rgb(11 79 138 / 0.12)', detail: '#1d8fe0', crestShape: 'circle', crestFont: 'Exo 2' }
</script>

<template>
  <div class="ibr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <IceBlueBackdrop :width="m.width" :height="m.height" :head="s.head" />

    <header class="ibr-head" :class="{ 'ibr-stacked': stacked }" :style="{ height: `${s.head}px` }">
      <div class="ibr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.7)" shape="circle" :colors="{ primary: '#0b4f8a', secondary: '#ffffff' }" font="Exo 2" />
      </div>
      <div class="ibr-titles">
        <p class="ibr-tag" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ tag }}</p>
        <p class="ibr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ kicker }}</p>
        <h1 class="ibr-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="ibr-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="ibr-list" :class="{ 'ibr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="ibr-slot" :style="{ height: `${m.rowH}px` }">
          <div class="ibr-card" :style="{ height: `${cardH}px` }">
            <div class="ibr-team ibr-home" :class="{ 'ibr-lost': r.winner === 'away' }">
              <span class="ibr-name" :class="{ 'ibr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
              <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="Math.min(m.crest, cardH - 12)" shape="circle" font="Exo 2" />
            </div>
            <div class="ibr-score" :style="{ fontSize: `${Math.round(m.score * 0.84)}px` }">
              <span class="ibr-box"><template v-if="r.kind === 'result'">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</template><template v-else-if="r.time">{{ r.time }}</template><span v-else class="ibr-tbd">Por confirmar</span></span>
              <small v-if="r.kind === 'result' && r.detail">{{ r.detail }}</small>
            </div>
            <div class="ibr-team" :class="{ 'ibr-lost': r.winner === 'home' }">
              <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="Math.min(m.crest, cardH - 12)" shape="circle" font="Exo 2" />
              <span class="ibr-name" :class="{ 'ibr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
            </div>
            <small v-if="r.kind === 'fixture' && r.detail" class="ibr-where" :style="{ fontSize: `${Math.round(m.name * 0.6)}px`, color: CARD.detail }">{{ r.detail }}</small>
          </div>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="ibr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="ibr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span class="ibr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ibr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #eef7ff;
  color: #0a2540;
  font-family: 'Exo 2', sans-serif;
}
.ibr-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.ibr-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 20px;
}
.ibr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5bb8f5, #0b4f8a);
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
}
.ibr-titles {
  min-width: 0;
  max-width: 100%;
}
.ibr-tag {
  display: inline-block;
  margin: 0 0 0.45em;
  padding: 0.12em 0.7em;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
}
.ibr-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #1d8fe0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibr-title {
  margin: 0.02em 0 0;
  padding-top: 0.06em;
  font-weight: 900;
  font-style: italic;
  line-height: 0.95;
  text-transform: uppercase;
  background: linear-gradient(180deg, #1673c4, #0b3a66);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ibr-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4a6a8a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ibr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 46px;
}
.ibr-slot {
  display: flex;
  align-items: center;
}
.ibr-card {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 16px;
  padding: 0 18px;
  border-radius: 18px;
  background: rgb(255 255 255 / 0.94);
  box-shadow: 0 6px 18px rgb(11 79 138 / 0.12), inset 0 0 0 1.5px #ffffff;
}
.ibr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.ibr-home {
  justify-content: flex-end;
  text-align: right;
}
.ibr-name {
  min-width: 0;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.14;
}
.ibr-lost .ibr-name {
  color: #6b8bab;
}
.ibr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08em;
}
.ibr-box {
  min-width: 2.7em;
  padding: 0.06em 0.45em;
  border-radius: 14px;
  text-align: center;
  font-weight: 900;
  line-height: 1.15;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
  white-space: nowrap;
}
.ibr-box i {
  margin: 0 0.12em;
  font-style: normal;
  color: #bfe3ff;
}
.ibr-score small {
  font-size: 0.3em;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #1d8fe0;
  white-space: nowrap;
}

.ibr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  font-weight: 700;
  font-style: italic;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #36597c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.ibr-mark {
  font-weight: 900;
  font-style: italic;
  font-size: 1.4em;
  letter-spacing: 0.2em;
  color: #0b4f8a;
}
.ibr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
.ibr-card {
  align-content: center;
}
.ibr-where {
  grid-column: 1 / -1;
  justify-self: center;
  max-width: 100%;
  margin-top: 0.15em;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibr-tbd {
  display: inline-block;
  font-size: 0.4em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
}
</style>
