<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import UrbanBlackBackdrop from './UrbanBlackBackdrop.vue'
import { URBAN_BLACK } from './tokens'
import { FORMATS, withSeason } from '../../data'
import type { MatchPosterProps } from '../../layout'

/**
 * Urban Black — Próximo partido. Mismo lenguaje que la tabla de la familia: fondo negro con grano y
 * brochazos, Anton con degradado blanco, escudos en placas blancas inclinadas, bloques blancos
 * invertidos y el filo blanco a la izquierda. Los escudos mandan; en historia se apilan.
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 400, foot: 120, plate: 380, name: 76, vs: 220, title: 128, badge: 130, info: 46 },
  portrait: { head: 290, foot: 90, plate: 370, name: 54, vs: 160, title: 104, badge: 104, info: 38 },
  square: { head: 230, foot: 80, plate: 270, name: 44, vs: 140, title: 84, badge: 86, info: 32 },
} as const
const s = computed(() => SIZES[props.format])
const dims = computed(() => FORMATS[props.format])
const stacked = computed(() => props.format === 'story')
/** Títulos largos (jornadas con nombre propio) se achican en vez de salirse. */
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
/** Igual que la tabla de la familia: liga (o torneo) con temporada arriba; torneo y grupo abajo. */
const eyebrow = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="ubm" :class="{ 'ubm-stacked': stacked }" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <UrbanBlackBackdrop :width="dims.width" :height="dims.height" :head="s.head" :foot="s.foot" />

    <!-- Cabecera: la misma de la tabla, en pequeño (la marca del torneo; los protagonistas son los equipos) -->
    <header class="ubm-head" :style="{ height: `${s.head}px` }">
      <div class="ubm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.76)" shape="circle" :colors="URBAN_BLACK.crest" font="Anton" />
      </div>
      <div class="ubm-titles">
        <p class="ubm-tag" :style="{ fontSize: `${Math.round(s.title * 0.24)}px` }">Próximo partido</p>
        <h1 class="ubm-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p class="ubm-eyebrow" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ eyebrow }}</p>
        <p v-if="subtitle" class="ubm-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo -->
    <section class="ubm-duel">
      <template v-for="(x, i) in teams" :key="x.side">
        <div class="ubm-team" :class="`ubm-${x.side}`">
          <div class="ubm-plate" :style="{ width: `${s.plate}px`, height: `${s.plate}px` }">
            <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.plate * 0.78)" shape="shield" font="Anton" />
          </div>
          <div class="ubm-who">
            <span class="ubm-side" :style="{ fontSize: `${Math.round(s.name * 0.42)}px` }">{{ x.label }}</span>
            <span class="ubm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
        </div>
        <div v-if="i === 0" class="ubm-vs" :style="{ fontSize: `${s.vs}px` }">
          <span class="ubm-vs-ghost" aria-hidden="true">VS</span>
          <span class="ubm-vs-text">VS</span>
        </div>
      </template>
    </section>

    <!-- Programación: solo lo que el partido tiene -->
    <section class="ubm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="ubm-when">
        <template v-if="data.dateLabel">
          <span class="ubm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="ubm-time">{{ data.timeLabel }} <small>h</small></span>
        </template>
        <span v-if="data.scheduleNote" class="ubm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="ubm-venue"><span>Sede</span>{{ data.venue }}</p>
    </section>

    <footer class="ubm-foot" :style="{ height: `${s.foot}px` }">
      <span class="ubm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ubm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #090909;
  color: #fff;
  font-family: 'Barlow Condensed', sans-serif;
}
.ubm-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 56px;
}
.ubm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  transform: skewX(-8deg) rotate(-4deg);
  box-shadow: 8px 8px 0 rgb(255 255 255 / 0.18);
}
.ubm-badge > * {
  transform: skewX(8deg) rotate(4deg);
}
.ubm-titles {
  position: relative;
  min-width: 0;
}
.ubm-tag {
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
.ubm-title {
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
.ubm-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #a3a3a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ubm-eyebrow {
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

/* Duelo: lado a lado (vertical y cuadrada) */
.ubm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 40px;
}
.ubm-team {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  text-align: center;
}
.ubm-plate {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: 12px 12px 0 rgb(255 255 255 / 0.18);
}
.ubm-home .ubm-plate {
  transform: skewX(-6deg) rotate(-4deg);
}
.ubm-away .ubm-plate {
  transform: skewX(6deg) rotate(4deg);
  box-shadow: -12px 12px 0 rgb(255 255 255 / 0.18);
}
.ubm-home .ubm-plate > * {
  transform: skewX(6deg) rotate(4deg);
}
.ubm-away .ubm-plate > * {
  transform: skewX(-6deg) rotate(-4deg);
}
.ubm-who {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}
.ubm-side {
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #a3a3a3;
}
.ubm-name {
  /* El aire de arriba deja ver las tildes de Ñ, Á… (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-family: 'Anton', sans-serif;
  line-height: 1.04;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ubm-vs {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  font-family: 'Anton', sans-serif;
  line-height: 1;
  margin-bottom: 1.1em;
}
.ubm-vs-ghost {
  /* Fuera del flujo: el fantasma no ocupa alto. */
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -52%);
  font-size: 2.1em;
  color: transparent;
  -webkit-text-stroke: 3px rgb(120 120 120 / 0.35);
}
.ubm-vs-text {
  color: #fff;
  text-shadow: 6px 6px 0 rgb(255 255 255 / 0.18);
  transform: skewX(-8deg);
}

/* Historia: los equipos se apilan, cada uno con su nombre al lado */
.ubm-stacked .ubm-duel {
  flex-direction: column;
  gap: 0;
  padding: 0 56px;
}
.ubm-stacked .ubm-team {
  flex: none;
  width: 100%;
  flex-direction: row;
  gap: 48px;
  text-align: left;
}
.ubm-stacked .ubm-away {
  flex-direction: row-reverse;
  text-align: right;
}
.ubm-stacked .ubm-vs {
  margin: -0.12em 0;
}
.ubm-stacked .ubm-name {
  -webkit-line-clamp: 3;
}

/* Programación: el filo blanco y el bloque invertido de la tabla */
.ubm-info {
  position: relative;
  flex: none;
  margin: 0 40px;
  padding: 0.5em 0.8em;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.04), rgb(255 255 255 / 0.09) 40%, rgb(255 255 255 / 0.02));
  border-left: 6px solid #fff;
}
.ubm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7em;
}
.ubm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Anton', sans-serif;
  font-size: 1.15em;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.ubm-time {
  white-space: nowrap;
  padding: 0.02em 0.4em;
  font-family: 'Anton', sans-serif;
  font-size: 1.25em;
  color: #0a0a0a;
  background: #fff;
  clip-path: polygon(8% 0, 100% 0, 92% 100%, 0 100%);
  font-variant-numeric: tabular-nums;
}
.ubm-time small {
  font-size: 0.55em;
}
.ubm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.04em 0.5em;
  font-family: 'Anton', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #0a0a0a;
  background: #fff;
}
.ubm-venue {
  display: flex;
  align-items: baseline;
  gap: 0.6em;
  margin: 0.35em 0 0;
  padding-top: 0.35em;
  border-top: 1.5px solid rgb(255 255 255 / 0.14);
  font-weight: 700;
  font-size: 0.82em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #e5e5e5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ubm-venue span {
  font-size: 0.75em;
  letter-spacing: 0.3em;
  color: #a3a3a3;
}

.ubm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 56px;
  font-size: 26px;
}
.ubm-mark {
  font-family: 'Anton', sans-serif;
  letter-spacing: 0.24em;
  color: #fff;
  opacity: 0.85;
}
</style>
