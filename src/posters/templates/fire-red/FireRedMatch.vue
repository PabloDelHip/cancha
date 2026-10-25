<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import FireRedBackdrop from './FireRedBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Fire Red — Próximo partido. El lenguaje de la tabla: brasa y cortes diagonales, Teko itálica con
 * el número en rojo, cada equipo en un escalón del podio (filo rojo arriba) en espejo, el VS en el
 * corte del logo y la hora en el bloque rojo de los puntos. En historia los equipos se apilan.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 300, foot: 120, crest: 330, name: 64, vs: 140, title: 150, badge: 150, info: 46 },
  portrait: { head: 220, foot: 84, crest: 250, name: 44, vs: 104, title: 112, badge: 118, info: 38 },
  square: { head: 180, foot: 68, crest: 190, name: 36, vs: 86, title: 88, badge: 94, info: 32 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, crest: Math.round(b.crest * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Oswald', weight: 600, ink: '#fff4f0', muted: '#c9a49b', accent: '#ff3b1f', line: 'rgb(255 106 77 / 0.3)', detailFont: 'Teko', detailWeight: 700, detailBg: 'linear-gradient(135deg, #ff3b1f, #8f0d04)', detailInk: '#ffffff' }
const dims = computed(() => FORMATS[props.format])
const stacked = computed(() => props.format === 'story')
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
/** «Jornada 10»: el número en rojo, como en la tabla. Un nombre propio va entero en blanco. */
const title = computed(() => {
  const m = /^(.*?)\s*(\d+)$/.exec(props.data.roundLabel)
  return m ? { text: m[1]!, num: m[2]! } : { text: props.data.roundLabel, num: '' }
})
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="frm" :class="{ 'frm-stacked': stacked }" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <FireRedBackdrop :width="dims.width" :height="dims.height" :head="s.head" />

    <header class="frm-head" :style="{ height: `${s.head}px` }">
      <div class="frm-titles">
        <p class="frm-tag" :style="{ fontSize: `${Math.round(s.title * 0.22)}px` }">{{ tag }}</p>
        <h1 class="frm-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <span v-if="title.num">{{ title.num }}</span></h1>
        <p class="frm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ kicker }}</p>
        <p v-if="subtitle" class="frm-sub" :style="{ fontSize: `${Math.round(s.title * 0.13)}px` }">{{ subtitle }}</p>
      </div>
      <div class="frm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.76)" shape="shield" :colors="{ primary: '#1a0303', secondary: '#ff3b1f' }" font="Teko" />
      </div>
    </header>

    <!-- Duelo: un escalón por equipo, en espejo -->
    <section class="frm-duel">
      <div v-for="x in teams" :key="x.side" class="frm-team" :class="[`frm-${x.side}`, { 'frm-lost': final?.winner && final.winner !== x.side }]">
        <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="s.crest" shape="shield" font="Teko" />
        <div class="frm-who">
          <span class="frm-side" :style="{ fontSize: `${Math.round(s.name * 0.62)}px` }">{{ x.label }}</span>
          <span class="frm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
        </div>
      </div>
      <div class="frm-vs" :class="{ 'frm-score': final }" :style="{ fontSize: `${vsSize}px` }"><span>{{ vs ?? 'VS' }}</span></div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="frm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="frm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="frm-when">
        <template v-if="data.dateLabel">
          <span class="frm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="frm-time">{{ data.timeLabel }} <small>H</small></span>
        </template>
        <span v-if="data.scheduleNote" class="frm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="frm-venue">{{ data.venue }}</p>
    </section>

    <footer class="frm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 26, portrait: 20, square: 18 })[format]}px` }">
      <span class="frm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.frm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #120202;
  color: #fff4f0;
  font-family: 'Oswald', sans-serif;
}
.frm-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  padding: 0 60px 8px;
}
.frm-titles {
  min-width: 0;
}
.frm-tag {
  margin: 0 0 0.1em;
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #ffd166;
}
.frm-title {
  margin: 0;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  line-height: 0.82;
  text-transform: uppercase;
  white-space: nowrap;
  font-style: italic;
}
.frm-title span {
  color: #ff3b1f;
}
.frm-kicker {
  margin: 0.25em 0 0;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #ff6a4d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frm-sub {
  margin: 0.2em 0 0;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.frm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff3b1f, #8f0d04);
  clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%);
}

/* Duelo: lado a lado (vertical y cuadrada) */
.frm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 28px;
  padding: 40px 60px;
}
.frm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px 22px;
  text-align: center;
  background: linear-gradient(180deg, rgb(255 59 31 / 0.3), rgb(255 59 31 / 0.06));
  border-top: 6px solid #ff3b1f;
}
.frm-home {
  clip-path: polygon(0 0, 100% 0, 92% 100%, 0 100%);
}
.frm-away {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 8% 100%);
}
.frm-who {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}
.frm-side {
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #ffd166;
}
.frm-name {
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 700;
  /* Con menos, la tilde de una mayúscula de la segunda línea toca la primera. */
  line-height: 1.22;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.frm-vs {
  /* En el corte entre los dos escalones, con el corte diagonal del logo. */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 0.04em 0.42em 0;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
  background: linear-gradient(135deg, #ff3b1f, #8f0d04);
  clip-path: polygon(14% 0, 100% 0, 86% 100%, 0 100%);
  filter: drop-shadow(0 10px 20px rgb(0 0 0 / 0.5));
}
.frm-vs span {
  display: block;
  transform: translateY(0.06em);
}

/* Historia: los escalones se apilan, cada equipo con su nombre al lado (visita en espejo) */
.frm-stacked .frm-duel {
  flex-direction: column;
  gap: 40px;
}
.frm-stacked .frm-team {
  flex-direction: row;
  justify-content: flex-start;
  gap: 40px;
  padding: 30px 46px;
  text-align: left;
}
.frm-stacked .frm-away {
  flex-direction: row-reverse;
  text-align: right;
}
.frm-stacked .frm-home {
  clip-path: polygon(0 0, 100% 0, 96% 100%, 0 100%);
}
.frm-stacked .frm-away {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 4% 100%);
}
.frm-stacked .frm-name {
  -webkit-line-clamp: 3;
}

/* Programación: el filo rojo de los escalones y la hora en el bloque de los puntos */
.frm-info {
  position: relative;
  flex: none;
  margin: 0 60px;
  padding: 0.45em 0 0;
  border-top: 6px solid #ff3b1f;
}
.frm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7em;
}
.frm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  /* Teko corta las tildes de arriba con su interlineado: aire arriba. */
  padding-top: 0.12em;
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  font-style: italic;
  font-size: 1.35em;
  line-height: 0.95;
  text-transform: uppercase;
}
.frm-time {
  white-space: nowrap;
  padding: 0.1em 0.5em 0 0.7em;
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: 1.5em;
  line-height: 1;
  background: linear-gradient(90deg, #c81e0b, #ff3b1f);
  clip-path: polygon(18% 0, 100% 0, 100% 100%, 0 100%);
  font-variant-numeric: tabular-nums;
}
.frm-time small {
  font-size: 0.5em;
  color: #ffd166;
}
.frm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.12em 0.6em 0;
  font-family: 'Teko', sans-serif;
  font-weight: 600;
  font-size: 1.3em;
  line-height: 1;
  text-transform: uppercase;
  background: linear-gradient(90deg, #c81e0b, #ff3b1f);
  clip-path: polygon(4% 0, 100% 0, 96% 100%, 0 100%);
}
.frm-venue {
  margin: 0.3em 0 0;
  font-weight: 500;
  font-size: 0.66em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #f5c9bf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.frm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.frm-mark {
  font-family: 'Teko', sans-serif;
  font-weight: 700;
  font-size: 1.5em;
  letter-spacing: 0.24em;
  color: #ff3b1f;
}

/* 7B-E: resultado final */
.frm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.frm-lost .frm-name {
  opacity: 0.6;
}
.frm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
