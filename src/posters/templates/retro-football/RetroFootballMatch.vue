<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import RetroFootballBackdrop from './RetroFootballBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Retro Football — Próximo partido. El papel de los 70 de la tabla: franjas curvas y medios tonos,
 * Righteous con la doble sombra, cada escudo en el sello de anillos café y mostaza del logo, el VS
 * en el círculo naranja de los puntos y la fecha en la cinta café de la cabecera de columnas.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 560, foot: 150, seal: 340, name: 52, vs: 150, title: 140, badge: 190, info: 42 },
  portrait: { head: 320, foot: 100, seal: 270, name: 40, vs: 118, title: 100, badge: 140, info: 34 },
  square: { head: 236, foot: 84, seal: 200, name: 32, vs: 94, title: 80, badge: 110, info: 28 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, seal: Math.round(b.seal * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Oswald', weight: 600, ink: '#3b2412', muted: '#7c5a3a', accent: '#c2410c', line: 'rgb(59 36 18 / 0.25)', detailFont: 'Righteous', detailWeight: 400, detailBg: '#c2410c', detailInk: '#f1e3c3', detailRadius: '999px' }
const dims = computed(() => FORMATS[props.format])
const stacked = computed(() => props.format === 'story')
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="rfm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <RetroFootballBackdrop :width="dims.width" :height="dims.height" :head="s.head" :foot="s.foot" />

    <header class="rfm-head" :class="{ 'rfm-stacked': stacked }" :style="{ height: `${s.head}px` }">
      <div class="rfm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.74)" shape="circle" :colors="{ primary: '#7c3a12', secondary: '#f1e3c3' }" font="Righteous" />
      </div>
      <div class="rfm-titles">
        <p class="rfm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ tag }} · {{ kicker }}</p>
        <h1 class="rfm-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="rfm-sub" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo: dos sellos de anillos -->
    <section class="rfm-duel">
      <div class="rfm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="rfm-team" :class="{ 'rfm-lost': final?.winner && final.winner !== x.side }">
            <div class="rfm-seal" :style="{ width: `${s.seal}px`, height: `${s.seal}px` }">
              <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.seal * 0.74)" shape="shield" font="Righteous" />
            </div>
            <span class="rfm-side" :style="{ fontSize: `${Math.round(s.name * 0.46)}px` }">{{ x.label }}</span>
            <span class="rfm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="rfm-vs" :class="{ 'rfm-score': final }" :style="{ width: `${s.vs}px`, height: `${s.vs}px`, fontSize: `${Math.round(vsSize * 0.42)}px`, marginTop: `${Math.round((s.seal - s.vs) / 2)}px` }">{{ vs ?? 'VS' }}</div>
        </template>
      </div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="rfm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="rfm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="rfm-when">
        <template v-if="data.dateLabel">
          <span class="rfm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="rfm-time">{{ data.timeLabel }} h</span>
        </template>
        <span v-if="data.scheduleNote" class="rfm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="rfm-venue">{{ data.venue }}</p>
    </section>

    <footer class="rfm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px`, paddingBottom: `${s.foot / 2 + 6}px` }">
      <span class="rfm-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.rfm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #f1e3c3;
  color: #3b2314;
  font-family: 'Oswald', sans-serif;
}
.rfm-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.rfm-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 20px;
}
.rfm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fbf3df;
  box-shadow: 0 0 0 6px #7c3a12, 0 0 0 12px #e0a526, 10px 12px 0 12px rgb(124 58 18 / 0.25);
}
.rfm-titles {
  min-width: 0;
  max-width: 100%;
}
.rfm-kicker {
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #c2410c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rfm-title {
  margin: 0.06em 0 0;
  font-family: 'Righteous', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  color: #3b2314;
  text-shadow: 5px 5px 0 #e0a526, 10px 10px 0 #c2410c;
  white-space: nowrap;
}
.rfm-sub {
  margin: 0.45em 0 0;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b4a33;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rfm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 56px;
}
.rfm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.rfm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.rfm-seal {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  border-radius: 50%;
  background: #fbf3df;
  box-shadow: 0 0 0 8px #7c3a12, 0 0 0 16px #e0a526, 12px 14px 0 16px rgb(124 58 18 / 0.25);
}
.rfm-side {
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #c2410c;
}
.rfm-name {
  max-width: 100%;
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
.rfm-vs {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-family: 'Righteous', sans-serif;
  color: #fbf3df;
  background: #c2410c;
  box-shadow: 5px 5px 0 #3b2314;
}

.rfm-info {
  position: relative;
  flex: none;
  margin: 0 50px 0.5em;
}
.rfm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5em;
}
.rfm-date {
  min-width: 0;
  padding: 0.2em 0.8em;
  border-radius: 999px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f1e3c3;
  background: #3b2314;
}
.rfm-time {
  white-space: nowrap;
  padding: 0.1em 0.6em;
  border-radius: 999px;
  font-family: 'Righteous', sans-serif;
  font-size: 1.15em;
  color: #fbf3df;
  background: #c2410c;
  box-shadow: 4px 4px 0 #3b2314;
}
.rfm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.2em 0.9em;
  border-radius: 999px;
  font-family: 'Righteous', sans-serif;
  color: #fbf3df;
  background: #2f5d50;
  box-shadow: 4px 4px 0 #3b2314;
}
.rfm-venue {
  margin: 0.5em 0 0;
  padding: 0 0.8em 0.3em;
  border-bottom: 2px dotted rgb(124 58 18 / 0.45);
  font-weight: 500;
  font-size: 0.72em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a3a24;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rfm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.rfm-mark {
  font-family: 'Righteous', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.08em;
  color: #c2410c;
}

/* 7B-E: resultado final */
.rfm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.rfm-lost .rfm-name {
  opacity: 0.6;
}
.rfm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
