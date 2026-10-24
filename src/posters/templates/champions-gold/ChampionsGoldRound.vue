<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import ResultCard from '../../parts/ResultCard.vue'
import ChampionsGoldBackdrop from './ChampionsGoldBackdrop.vue'
import { withSeason } from '../../data'
import { useResultMetrics, type ResultCardTheme, type ResultsPosterProps } from '../../layout'

/**
 * Champions Gold — Jornada: resultados (7B-C) u horarios (7B-D), según `data.mode`. La cabecera simétrica del cartel de partido; cada
 * resultado entre filetes dorados con el marcador en el medallón dorado de los clasificados.
 */
const props = defineProps<ResultsPosterProps>()
const SIZES = {
  story: { head: 470, foot: 130, title: 112, badge: 150, meta: 26 },
  portrait: { head: 300, foot: 92, title: 80, badge: 96, meta: 22 },
  square: { head: 236, foot: 78, title: 62, badge: 76, meta: 19 },
} as const
const s = computed(() => SIZES[props.format])
const m = useResultMetrics(props, { story: 1920 - 470 - 130 - 110, portrait: 1350 - 300 - 92 - 84, square: 1080 - 236 - 78 - 72 }, { nameChars: 9, maxName: 32 })
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
const eyebrow = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => (props.data.leagueName ? props.data.tournamentName : ''))
/** «Resultados» o «Programación»: la misma plantilla sirve para las dos imágenes de la jornada. */
const tag = computed(() => (props.data.mode === 'results' ? 'Resultados' : 'Programación'))
const meta = computed(() => [props.data.dateLabel, props.data.note, props.data.page.total > 1 ? `${props.data.page.index + 1} de ${props.data.page.total}` : null].filter(Boolean).join(' · '))
/** Tarjeta compacta (imagen en dos columnas) con los colores y formas de la familia. */
const CARD: ResultCardTheme = { nameFont: 'Montserrat', nameWeight: 800, ink: '#f8f1dc', lost: '#94a3b8', scoreFont: 'Cinzel', scoreWeight: 900, scoreBg: 'radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 55%, #8a6a1f)', scoreInk: '#0b1736', scoreRadius: '999px', card: 'rgb(11 23 54 / 0.6)', cardBorder: '1px solid rgb(212 175 55 / 0.45)', cardRadius: '14px', detail: '#d4af37', crestShape: 'circle', crestFont: 'Cinzel' }
</script>

<template>
  <div class="cgr" :style="{ width: `${m.width}px`, height: `${m.height}px` }">
    <ChampionsGoldBackdrop :width="m.width" :height="m.height" :head="s.head" />

    <header class="cgr-head" :style="{ height: `${s.head}px` }">
      <div class="cgr-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.68)" shape="circle" :colors="{ primary: '#0b1736', secondary: '#d4af37' }" font="Cinzel" />
      </div>
      <p class="cgr-kicker" :style="{ fontSize: `${Math.round(s.title * 0.24)}px` }"><span class="cgr-rule" />{{ tag }}<span class="cgr-rule" /></p>
      <h1 class="cgr-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
      <p class="cgr-sub" :style="{ fontSize: `${Math.round(s.title * 0.22)}px` }">{{ eyebrow }}</p>
      <p v-if="subtitle" class="cgr-sub cgr-sub2" :style="{ fontSize: `${Math.round(s.title * 0.18)}px` }">{{ subtitle }}</p>
    </header>

    <section class="cgr-list" :class="{ 'cgr-cols': m.columns === 2 }" :style="m.columns === 2 ? { gridTemplateRows: `repeat(${m.cardRows}, ${m.rowH}px)` } : undefined">
      <template v-if="m.columns === 1">
        <div v-for="r in data.rows" :key="r.id" class="cgr-row" :style="{ height: `${m.rowH}px` }">
          <div class="cgr-team cgr-home" :class="{ 'cgr-lost': r.winner === 'away' }">
            <span class="cgr-name" :class="{ 'cgr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.home.name)}px` }">{{ r.home.name }}</span>
            <Crest :src="r.home.crest" :initials="r.home.initials" :colors="r.home.colors" :size="m.crest" shape="circle" font="Cinzel" />
          </div>
          <div class="cgr-score" :style="{ fontSize: `${Math.round(m.score * 0.86)}px` }">
            <span class="cgr-box"><template v-if="r.kind === 'result'">{{ r.homeScore }}<i>-</i>{{ r.awayScore }}</template><template v-else-if="r.time">{{ r.time }}</template><span v-else class="cgr-tbd">Por confirmar</span></span>
            <small v-if="r.kind === 'result' && r.detail">{{ r.detail }}</small>
          </div>
          <div class="cgr-team" :class="{ 'cgr-lost': r.winner === 'home' }">
            <Crest :src="r.away.crest" :initials="r.away.initials" :colors="r.away.colors" :size="m.crest" shape="circle" font="Cinzel" />
            <span class="cgr-name" :class="{ 'cgr-two': m.nameLines === 2 }" :style="{ fontSize: `${m.nameOf(r.away.name)}px` }">{{ r.away.name }}</span>
          </div>
          <small v-if="r.kind === 'fixture' && r.detail" class="cgr-where" :style="{ fontSize: `${Math.round(m.name * 0.6)}px`, color: CARD.detail }">{{ r.detail }}</small>
        </div>
      </template>
      <!-- Muchos partidos: la imagen se divide en dos columnas de tarjetas compactas -->
      <template v-else>
        <ResultCard v-for="r in data.rows" :key="r.id" :row="r" :m="m" :theme="CARD" />
      </template>
    </section>

    <p v-if="meta" class="cgr-meta" :style="{ fontSize: `${s.meta}px` }">{{ meta }}</p>

    <footer class="cgr-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 16 })[format]}px` }">
      <span class="cgr-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.cgr {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f8f1dc;
  font-family: 'Montserrat', sans-serif;
  background: #0b1736;
}
.cgr-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 80px 0;
}
.cgr-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 45%, #7a5a14);
  box-shadow: 0 0 0 4px #0b1736, 0 0 0 6px #d4af37, 0 16px 40px rgb(0 0 0 / 0.5);
  margin-bottom: 0.3em;
}
.cgr-kicker {
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
.cgr-rule {
  flex: none;
  width: 70px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #d4af37);
}
.cgr-rule:last-child {
  background: linear-gradient(90deg, #d4af37, transparent);
}
.cgr-title {
  margin: 0.1em 0 0;
  padding-top: 0.08em;
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
.cgr-sub {
  margin: 0.45em 0 0;
  max-width: 100%;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cgr-sub2 {
  margin-top: 0.25em;
  color: #94a3b8;
}

.cgr-list {
  position: relative;
  flex: 0 1 auto;
  margin: auto 70px;
  border-top: 2px solid #d4af37;
  border-bottom: 2px solid #d4af37;
}
.cgr-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 18px;
  border-bottom: 1px solid rgb(212 175 55 / 0.25);
}
.cgr-row:last-child {
  border-bottom: none;
}
.cgr-team {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}
.cgr-home {
  justify-content: flex-end;
  text-align: right;
}
.cgr-name {
  min-width: 0;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cgr-two {
  padding-top: 0.12em;
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.16;
}
.cgr-lost .cgr-name {
  color: #94a3b8;
}
.cgr-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1em;
}
.cgr-box {
  min-width: 2.8em;
  padding: 0.1em 0.45em;
  border-radius: 999px;
  text-align: center;
  font-family: 'Cinzel', serif;
  font-weight: 900;
  line-height: 1.1;
  color: #0b1736;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 55%, #8a6a1f);
  box-shadow: 0 0 0 3px #0b1736, 0 0 0 5px rgb(212 175 55 / 0.5);
  white-space: nowrap;
}
.cgr-box i {
  margin: 0 0.15em;
  font-style: normal;
}
.cgr-score small {
  font-size: 0.3em;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #d4af37;
  white-space: nowrap;
}

.cgr-meta {
  position: relative;
  flex: none;
  margin: 0 90px;
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cgr-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 70px 20px;
}
.cgr-mark {
  font-family: 'Cinzel', serif;
  font-weight: 900;
  font-size: 1.3em;
  color: #d4af37;
  letter-spacing: 0.3em;
}
.cgr-cols {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 20px;
}
.cgr-row {
  align-content: center;
}
.cgr-where {
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
.cgr-tbd {
  display: inline-block;
  font-size: 0.4em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
}
</style>
