<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import StadiumLightsBackdrop from './StadiumLightsBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Stadium Lights — Próximo partido. El mismo estadio de noche de la tabla: los reflectores cruzan
 * sobre los dos escudos, cada uno en el disco iluminado del logo, y la programación va en la
 * tarjeta de vidrio azul de la tabla, con la hora en la pastilla clara de los clasificados.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 560, foot: 130, disc: 400, name: 58, vs: 150, title: 150, badge: 150, info: 44 },
  portrait: { head: 330, foot: 88, disc: 300, name: 44, vs: 120, title: 112, badge: 96, info: 36 },
  square: { head: 230, foot: 72, disc: 236, name: 36, vs: 100, title: 92, badge: 120, info: 30 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, disc: Math.round(b.disc * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Inter', charWidth: 0.7, weight: 700, ink: '#e6f0ff', muted: '#8aa0c0', accent: '#ffffff', line: 'rgb(230 240 255 / 0.2)', detailFont: 'Bebas Neue', detailWeight: 400, detailBg: '#e6f0ff', detailInk: '#071226' }
const dims = computed(() => FORMATS[props.format])
const row = computed(() => props.format === 'square')
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 12) / Math.max(12, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="slm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <StadiumLightsBackdrop :width="dims.width" :height="dims.height" />

    <header class="slm-head" :class="{ 'slm-row-head': row }" :style="{ height: `${s.head}px` }">
      <div class="slm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.8)" shape="circle" :colors="{ primary: '#0b1630', secondary: '#e6f0ff' }" font="Bebas Neue" />
      </div>
      <div class="slm-titles">
        <p class="slm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ kicker }}</p>
        <h1 class="slm-title" :style="{ fontSize: `${titleSize}px` }"><span class="slm-tag">{{ tag }}</span> {{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="slm-sub" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo: los dos escudos bajo los reflectores -->
    <section class="slm-duel">
      <div class="slm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="slm-team" :class="{ 'slm-lost': final?.winner && final.winner !== x.side }">
            <div class="slm-disc" :style="{ width: `${s.disc}px`, height: `${s.disc}px` }">
              <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.disc * 0.74)" shape="circle" font="Bebas Neue" />
            </div>
            <span class="slm-side" :style="{ fontSize: `${Math.round(s.name * 0.4)}px` }">{{ x.label }}</span>
            <span class="slm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="slm-vs" :class="{ 'slm-score': final }" :style="{ fontSize: `${vsSize}px`, marginTop: `${Math.round((s.disc - vsSize) / 2)}px` }">{{ vs ?? 'VS' }}</div>
        </template>
      </div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="slm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="slm-card" :style="{ fontSize: `${s.info}px` }">
      <div v-if="data.dateLabel" class="slm-when">
        <span class="slm-date">{{ data.dateLabel }}</span>
        <span v-if="data.timeLabel" class="slm-time">{{ data.timeLabel }} h</span>
      </div>
      <span v-if="data.scheduleNote" class="slm-note">{{ data.scheduleNote }}</span>
      <p v-if="data.venue" class="slm-venue">{{ data.venue }}</p>
    </section>

    <footer class="slm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 17 })[format]}px` }">
      <span class="slm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.slm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #071226;
  color: #f1f6ff;
  font-family: 'Inter', sans-serif;
}
.slm-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 80px 18px;
  text-align: center;
}
.slm-row-head {
  flex-direction: row;
  justify-content: center;
  gap: 34px;
  text-align: left;
  padding-bottom: 6px;
}
.slm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #ffffff, #cfe2ff 70%);
  box-shadow: 0 0 0 4px rgb(230 240 255 / 0.25), 0 0 60px rgb(158 197 255 / 0.55);
}
.slm-titles {
  min-width: 0;
  max-width: 100%;
}
.slm-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #9ec5ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.slm-title {
  margin: 0.06em 0 0;
  font-family: 'Bebas Neue', sans-serif;
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: 0.02em;
  color: #ffffff;
  text-shadow: 0 0 40px rgb(158 197 255 / 0.6), 0 4px 0 rgb(0 0 0 / 0.35);
  white-space: nowrap;
}
.slm-tag {
  display: block;
  margin-bottom: 0.08em;
  font-size: 0.36em;
  letter-spacing: 0.3em;
  color: #9ec5ff;
  text-shadow: none;
}
.slm-sub {
  margin: 0.25em 0 0;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 40px;
}
.slm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: inherit;
}
.slm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.slm-disc {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, #ffffff, #dbe8ff 62%, #9ec5ff);
  box-shadow: 0 0 0 6px rgb(230 240 255 / 0.22), 0 0 90px rgb(158 197 255 / 0.6), 0 30px 60px rgb(0 0 0 / 0.5);
}
.slm-side {
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #9ec5ff;
}
.slm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-family: 'Bebas Neue', sans-serif;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #ffffff;
  text-shadow: 0 0 24px rgb(158 197 255 / 0.5);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.slm-vs {
  flex: none;
  /* Alineado con el centro de los discos, no con el de la columna. */
  align-self: flex-start;
  font-family: 'Bebas Neue', sans-serif;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 0 40px rgb(158 197 255 / 0.9);
}

.slm-card {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
  margin: 0 44px;
  padding: 0.55em 0.9em;
  border-radius: 28px;
  text-align: center;
  background: linear-gradient(180deg, rgb(20 38 78 / 0.86), rgb(7 18 38 / 0.92));
  border: 1.5px solid rgb(207 226 255 / 0.22);
  box-shadow: 0 30px 70px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.18);
}
.slm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.6em;
  max-width: 100%;
}
.slm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.25em;
  letter-spacing: 0.04em;
}
.slm-time {
  white-space: nowrap;
  padding: 0.05em 0.45em;
  border-radius: 12px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.25em;
  color: #071226;
  background: #e6f0ff;
  box-shadow: 0 0 22px rgb(158 197 255 / 0.75);
}
.slm-note {
  padding: 0.05em 0.6em;
  border-radius: 12px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.1em;
  letter-spacing: 0.04em;
  color: #071226;
  background: #e6f0ff;
}
.slm-venue {
  max-width: 100%;
  margin: 0;
  font-weight: 600;
  font-size: 0.62em;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #c9d6ee;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60px;
}
.slm-mark {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1.5em;
  letter-spacing: 0.3em;
  color: #ffffff;
}

/* 7B-E: resultado final */
.slm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.slm-lost .slm-name {
  opacity: 0.6;
}
.slm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
