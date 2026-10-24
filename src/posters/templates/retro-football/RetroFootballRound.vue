<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import RetroFootballBackdrop from './RetroFootballBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Retro Football — Jornada: resultados (7B-C) u horarios (7B-D), según `data.mode`. El papel de los 70 de la tabla: filas punteadas con
 * franja alterna y el marcador en la pastilla naranja con sombra café, como los puntos.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 520, foot: 150, title: 140, badge: 180, meta: 26 },
  portrait: { head: 300, foot: 100, title: 100, badge: 130, meta: 22 },
  square: { head: 226, foot: 84, title: 80, badge: 104, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 520 - 150 - 100, portrait: 1350 - 300 - 100 - 80, square: 1080 - 226 - 84 - 70 }, { nameChars: 12 })
const stacked = computed(() => props.format === 'story')
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
/** «Resultados» o «Programación»: la misma plantilla sirve para las dos imágenes de la jornada. */
const tag = computed(() => (props.data.mode === 'results' ? 'Resultados' : 'Programación'))
const meta = computed(() => [props.data.dateLabel, props.data.note, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Oswald', nameWeight: 600, ink: '#3b2314', lost: '#8a6a55', scoreFont: 'Righteous', scoreBg: '#c2410c', scoreInk: '#fbf3df', scoreRadius: '999px', card: 'rgb(124 58 18 / 0.08)', cardBorder: '2px dotted rgb(124 58 18 / 0.35)', cardRadius: '18px', detail: '#7c3a12', crestShape: 'shield', crestFont: 'Righteous' }
</script>

<template>
  <div class="rfr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <RetroFootballBackdrop :width="m.width" :height="m.height" :head="s.head" :foot="s.foot" />

    <header class="rfr-head" :class="{ 'rfr-stacked': stacked }" :style="{ height: `${s.head}px` }">
      <div class="rfr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.74)" shape="circle" :colors="{ primary: '#7c3a12', secondary: '#f1e3c3' }" font="Righteous" />
      </div>
      <div class="rfr-titles">
        <p class="rfr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ tag }} · {{ kicker }}</p>
        <h1 class="rfr-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="rfr-sub" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="rfr-list" :class="{ 'rfr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="rfr-row" :style="{ height: `${m.rowH}px` }">
          <div class="rfr-team rfr-home" :class="{ 'rfr-lost': r.winner === 'away' }">
            <span class="rfr-name" :class="{ 'rfr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
            <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="shield" font="Righteous" />
          </div>
          <div class="rfr-score" :style="{ fontSize: `${Math.round(m.score * 0.86)}px` }">
            <span class="rfr-box"><template v-if="r.kind === 'result'">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</template><template v-else-if="r.time">{{ r.time }}</template><span v-else class="rfr-tbd">Por confirmar</span></span>
            <small v-if="r.kind === 'result' && r.detail">{{ r.detail }}</small>
          </div>
          <div class="rfr-team" :class="{ 'rfr-lost': r.winner === 'home' }">
            <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="shield" font="Righteous" />
            <span class="rfr-name" :class="{ 'rfr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
          </div>
          <small v-if="r.kind === 'fixture' && r.detail" class="rfr-where" :style="{ fontSize: `${Math.round(m.name * 0.6)}px`, color: CARD.detail }">{{ r.detail }}</small>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="rfr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="rfr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px`, paddingBottom: `${s.foot / 2 + 6}px` }">
      <span class="rfr-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.rfr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1e3c3;
  color: #3b2314;
  font-family: 'Oswald', sans-serif;
}
.rfr-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.rfr-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 20px;
}
.rfr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fbf3df;
  box-shadow: 0 0 0 6px #7c3a12, 0 0 0 12px #e0a526, 10px 12px 0 12px rgb(124 58 18 / 0.25);
}
.rfr-titles {
  min-width: 0;
  max-width: 100%;
}
.rfr-kicker {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #c2410c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rfr-title {
  margin: 0.06em 0 0;
  font-family: 'Righteous', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  color: #3b2314;
  text-shadow: 5px 5px 0 #e0a526, 10px 10px 0 #c2410c;
  white-space: nowrap;
}
.rfr-sub {
  margin: 0.45em 0 0;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b4a33;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rfr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 50px;
  border-top: 8px solid #3b2314;
}
.rfr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  padding: 0 12px;
  border-bottom: 2px dotted rgb(124 58 18 / 0.35);
}
.rfr-row:nth-child(odd) {
  background: rgb(124 58 18 / 0.07);
}
.rfr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.rfr-home {
  justify-content: flex-end;
  text-align: right;
}
.rfr-name {
  min-width: 0;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rfr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  /* Con menos, la tilde de una mayúscula de la segunda línea toca la primera. */
  line-height: 1.22;
}
.rfr-lost .rfr-name {
  color: #8a6a55;
}
.rfr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.12em;
}
.rfr-box {
  min-width: 2.7em;
  padding: 0.06em 0.5em;
  border-radius: 999px;
  text-align: center;
  font-family: 'Righteous', sans-serif;
  line-height: 1.15;
  color: #fbf3df;
  background: #c2410c;
  box-shadow: 4px 4px 0 #3b2314;
  white-space: nowrap;
}
.rfr-box i {
  margin: 0 0.12em;
  font-style: normal;
  color: #f6c98a;
}
.rfr-score small {
  font-size: 0.3em;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7c3a12;
  white-space: nowrap;
}

.rfr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a3a24;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rfr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.rfr-mark {
  font-family: 'Righteous', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.08em;
  color: #c2410c;
}
.rfr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
.rfr-row {
  align-content: center;
}
.rfr-where {
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
.rfr-tbd {
  display: inline-block;
  font-size: 0.4em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
}
</style>
