<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import StreetFootballBackdrop from './StreetFootballBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import type { MatchPosterProps } from '../../layout'

/**
 * Street Football — Próximo partido. El muro de la tabla: cinta de precaución bajo la cabecera,
 * número a plumón, cada escudo en una hoja pegada con cinta (como el logo), el VS a plumón y la
 * fecha en la franja amarilla de la cabecera de columnas, con la hora en la etiqueta de los puntos.
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 600, foot: 130, sheet: 340, name: 54, vs: 170, title: 140, badge: 190, info: 42, tape: 56 },
  portrait: { head: 340, foot: 92, sheet: 300, name: 42, vs: 130, title: 100, badge: 140, info: 34, tape: 44 },
  square: { head: 250, foot: 76, sheet: 236, name: 34, vs: 104, title: 80, badge: 110, info: 28, tape: 36 },
} as const
const s = computed(() => SIZES[props.format])
const dims = computed(() => FORMATS[props.format])
const stacked = computed(() => props.format === 'story')
/** Misma cinta que la tabla: franja inclinada que cruza el pie de la cabecera. */
const tape = computed(() => ({ y: s.value.head - s.value.tape / 2 - 18, h: s.value.tape }))
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
/** «Jornada 10»: el número a plumón, como en la tabla. */
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
  <div class="sfm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <StreetFootballBackdrop :width="dims.width" :height="dims.height" :tape="tape" />

    <header class="sfm-head" :class="{ 'sfm-stacked': stacked }" :style="{ height: `${s.head}px`, paddingBottom: `${tape.h + (stacked ? 44 : 30)}px` }">
      <div class="sfm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.78)" shape="shield" :colors="{ primary: '#111111', secondary: '#ffd400' }" font="Archivo Black" />
      </div>
      <div class="sfm-titles">
        <p class="sfm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">Próximo partido · {{ kicker }}</p>
        <h1 class="sfm-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <span v-if="title.num">{{ title.num }}</span></h1>
        <p v-if="subtitle" class="sfm-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo: dos hojas pegadas al muro -->
    <section class="sfm-duel">
      <div class="sfm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="sfm-team" :class="`sfm-${x.side}`">
            <div class="sfm-sheet" :style="{ width: `${s.sheet}px`, height: `${s.sheet}px` }">
              <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.sheet * 0.76)" shape="shield" font="Archivo Black" />
            </div>
            <span class="sfm-side" :style="{ fontSize: `${Math.round(s.name * 0.5)}px` }">{{ x.label }}</span>
            <span class="sfm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="sfm-vs" :style="{ fontSize: `${s.vs}px`, marginTop: `${Math.round((s.sheet - s.vs) / 2)}px` }">vs</div>
        </template>
      </div>
    </section>

    <!-- Programación: solo lo que el partido tiene -->
    <section class="sfm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="sfm-when">
        <template v-if="data.dateLabel">
          <span class="sfm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="sfm-time">{{ data.timeLabel }} h</span>
        </template>
        <span v-if="data.scheduleNote" class="sfm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="sfm-venue">{{ data.venue }}</p>
    </section>

    <footer class="sfm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span class="sfm-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.sfm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #2b2b2b;
  color: #f5f5f0;
  font-family: 'Barlow Condensed', sans-serif;
}
.sfm-head {
  position: relative;
  flex: none;
  /* El relleno inferior deja libre la franja de la cinta (no suma alto). */
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.sfm-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 24px;
}
.sfm-badge,
.sfm-sheet {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f0;
  box-shadow: 0 10px 0 rgb(0 0 0 / 0.35);
}
.sfm-badge {
  transform: rotate(-5deg);
}
/* Cinta adhesiva arriba de la hoja */
.sfm-badge::after,
.sfm-sheet::after {
  content: '';
  position: absolute;
  top: -14px;
  left: 50%;
  width: 42%;
  height: 28px;
  transform: translateX(-50%) rotate(3deg);
  background: rgb(240 230 200 / 0.75);
}
.sfm-titles {
  min-width: 0;
  max-width: 100%;
}
.sfm-kicker {
  margin: 0;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffd400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sfm-title {
  margin: 0.04em 0 0;
  font-family: 'Archivo Black', sans-serif;
  font-weight: 400;
  line-height: 0.95;
  text-transform: uppercase;
  color: #f5f5f0;
  text-shadow: 4px 4px 0 #000;
  white-space: nowrap;
}
.sfm-title span {
  font-family: 'Permanent Marker', cursive;
  text-transform: none;
  color: #ffd400;
  display: inline-block;
  font-size: 1.15em;
  line-height: 0.8;
  transform: rotate(-6deg);
}
.sfm-sub {
  margin: 0.3em 0 0;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sfm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 56px;
}
.sfm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.sfm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.sfm-sheet {
  margin-bottom: 34px;
}
.sfm-home .sfm-sheet {
  transform: rotate(-4deg);
}
.sfm-away .sfm-sheet {
  transform: rotate(3deg);
}
.sfm-side {
  font-family: 'Permanent Marker', cursive;
  letter-spacing: 0.06em;
  color: #ffd400;
}
.sfm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 800;
  line-height: 1.12;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sfm-vs {
  flex: none;
  font-family: 'Permanent Marker', cursive;
  line-height: 1;
  color: #ffd400;
  text-shadow: 5px 5px 0 #000;
  transform: rotate(-8deg);
}

.sfm-info {
  position: relative;
  flex: none;
  margin: 0 46px 0.3em;
}
.sfm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6em;
}
.sfm-date {
  min-width: 0;
  padding: 0.12em 0.6em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Archivo Black', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #111;
  background: #ffd400;
  transform: rotate(-0.8deg);
}
.sfm-time {
  white-space: nowrap;
  padding: 0.06em 0.4em;
  font-family: 'Archivo Black', sans-serif;
  font-size: 1.15em;
  color: #111;
  background: #f5f5f0;
  transform: rotate(-3deg);
  box-shadow: 4px 4px 0 #ffd400;
}
.sfm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.12em 0.6em;
  font-family: 'Archivo Black', sans-serif;
  text-transform: uppercase;
  color: #111;
  background: #ffd400;
  transform: rotate(-0.8deg);
}
.sfm-venue {
  margin: 0.45em 0 0;
  font-weight: 700;
  font-size: 0.76em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cfcfc8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sfm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.sfm-mark {
  font-family: 'Permanent Marker', cursive;
  font-size: 1.6em;
  letter-spacing: 0.04em;
  color: #ffd400;
  transform: rotate(-4deg);
}
</style>
