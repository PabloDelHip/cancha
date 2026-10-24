<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import UltimateLeagueBackdrop from './UltimateLeagueBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Ultimate League — Jornada: resultados (7B-C) u horarios (7B-D), según `data.mode`. Panal de hexágonos y título metálico; cada resultado
 * en una fila de esquinas cortadas, como la tabla, y el marcador en el hexágono magenta.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 500, foot: 120, title: 124, badge: 170, meta: 26 },
  portrait: { head: 320, foot: 86, title: 90, badge: 108, meta: 22 },
  square: { head: 248, foot: 70, title: 70, badge: 74, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 500 - 120 - 110, portrait: 1350 - 320 - 86 - 84, square: 1080 - 248 - 70 - 72 }, { nameChars: 9, maxName: 34 })
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
/** «Resultados» o «Programación»: la misma plantilla sirve para las dos imágenes de la jornada. */
const tag = computed(() => (props.data.mode === 'results' ? 'Resultados' : 'Programación'))
const meta = computed(() => [props.data.dateLabel, props.data.note, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Chakra Petch', ink: '#f3ecff', lost: '#b9a8e6', scoreFont: 'Russo One', scoreBg: 'linear-gradient(160deg, #ff3df5, #8a1bd6)', scoreInk: '#ffffff', scoreClip: 'polygon(20% 0, 80% 0, 100% 50%, 80% 100%, 20% 100%, 0 50%)', card: 'linear-gradient(90deg, rgb(255 255 255 / 0.1), rgb(255 61 245 / 0.12))', cardClip: 'polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)', detail: '#3dd6ff', crestShape: 'hex', crestFont: 'Russo One' }
</script>

<template>
  <div class="ulr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <UltimateLeagueBackdrop :width="m.width" :height="m.height" :head="s.head" />

    <header class="ulr-head" :style="{ height: `${s.head}px` }">
      <div class="ulr-badge" :style="{ width: `${s.badge}px`, height: `${Math.round(s.badge * 1.1)}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.66)" shape="hex" :colors="{ primary: '#2a1260', secondary: '#ff3df5' }" font="Russo One" />
      </div>
      <div class="ulr-titles">
        <p class="ulr-tag" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ tag }}</p>
        <p class="ulr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ kicker }}</p>
        <h1 class="ulr-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="ulr-sub" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <section class="ulr-list" :class="{ 'ulr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="ulr-slot" :style="{ height: `${m.rowH}px` }">
          <div class="ulr-row">
            <div class="ulr-team ulr-home" :class="{ 'ulr-lost': r.winner === 'away' }">
              <span class="ulr-name" :class="{ 'ulr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
              <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="hex" font="Russo One" />
            </div>
            <div class="ulr-score" :style="{ fontSize: `${Math.round(m.score * 0.86)}px` }">
              <span class="ulr-box"><template v-if="r.kind === 'result'">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</template><template v-else-if="r.time">{{ r.time }}</template><span v-else class="ulr-tbd">Por confirmar</span></span>
              <small v-if="r.kind === 'result' && r.detail">{{ r.detail }}</small>
            </div>
            <div class="ulr-team" :class="{ 'ulr-lost': r.winner === 'home' }">
              <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="hex" font="Russo One" />
              <span class="ulr-name" :class="{ 'ulr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
            </div>
            <small v-if="r.kind === 'fixture' && r.detail" class="ulr-where" :style="{ fontSize: `${Math.round(m.name * 0.6)}px`, color: CARD.detail }">{{ r.detail }}</small>
          </div>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="ulr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="ulr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span class="ulr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ulr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #1a0b3b;
  color: #f3ecff;
  font-family: 'Chakra Petch', sans-serif;
}
.ulr-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 0 70px;
  text-align: center;
}
.ulr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #ffffff, #b9b3d6 45%, #6d5fa8);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.ulr-titles {
  min-width: 0;
  max-width: 100%;
}
.ulr-tag {
  margin: 0 0 0.3em;
  font-family: 'Russo One', sans-serif;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #3dd6ff;
}
.ulr-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #ff3df5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ulr-title {
  margin: 0.05em 0 0;
  font-family: 'Russo One', sans-serif;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
  background: linear-gradient(180deg, #ffffff 0%, #d9d4ee 45%, #8c82b8 55%, #f1edff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ulr-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b9a8e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ulr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 46px;
}
.ulr-slot {
  display: flex;
  align-items: center;
  padding: 3px 0;
  box-sizing: border-box;
}
.ulr-row {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 16px;
  padding: 0 26px;
}
/* La fila de esquinas cortadas de la tabla */
.ulr-row::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.1), rgb(255 61 245 / 0.12) 50%, rgb(255 255 255 / 0.04));
  clip-path: polygon(18px 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0 50%);
}
.ulr-row > * {
  position: relative;
}
.ulr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.ulr-home {
  justify-content: flex-end;
  text-align: right;
}
.ulr-name {
  min-width: 0;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ulr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.12;
}
.ulr-lost .ulr-name {
  color: #b9a8e6;
}
.ulr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.08em;
}
.ulr-box {
  min-width: 3em;
  padding: 0.16em 0.7em;
  text-align: center;
  font-family: 'Russo One', sans-serif;
  line-height: 1.1;
  color: #fff;
  background: linear-gradient(160deg, #ff3df5, #8a1bd6);
  clip-path: polygon(14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%, 0 50%);
  white-space: nowrap;
}
.ulr-box i {
  margin: 0 0.12em;
  font-style: normal;
  color: #ffc2fb;
}
.ulr-score small {
  font-size: 0.3em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #3dd6ff;
  white-space: nowrap;
}

.ulr-meta {
  position: relative;
  flex: none;
  margin: 0 60px;
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #d8ccff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ulr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ulr-mark {
  font-family: 'Russo One', sans-serif;
  font-size: 1.4em;
  letter-spacing: 0.24em;
  background: linear-gradient(90deg, #ff3df5, #3dd6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.ulr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
.ulr-row {
  align-content: center;
}
.ulr-where {
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
.ulr-tbd {
  display: inline-block;
  font-size: 0.4em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
}
</style>
