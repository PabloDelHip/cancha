<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import UltimateLeagueBackdrop from './UltimateLeagueBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Ultimate League — Próximo partido. El lenguaje de la tabla: panal de hexágonos, título metálico,
 * cada escudo en el hexágono de metal con brillo magenta del logo, el VS con el degradado de la
 * marca y la programación en una fila de esquinas cortadas con la hora en el hexágono de los puntos.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 580, foot: 130, hex: 360, name: 50, vs: 130, title: 124, badge: 190, info: 42 },
  portrait: { head: 340, foot: 90, hex: 290, name: 40, vs: 100, title: 90, badge: 116, info: 34 },
  square: { head: 262, foot: 74, hex: 206, name: 32, vs: 80, title: 70, badge: 74, info: 28 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, hex: Math.round(b.hex * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Chakra Petch', charWidth: 0.66, weight: 600, ink: '#f5edff', muted: '#b9a3dd', accent: '#ff3df5', line: 'rgb(255 61 245 / 0.3)', detailFont: 'Russo One', detailWeight: 400, detailBg: 'linear-gradient(90deg, #7c3aed, #ff3df5)', detailInk: '#ffffff' }
const dims = computed(() => FORMATS[props.format])
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
const kicker = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="ulm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <UltimateLeagueBackdrop :width="dims.width" :height="dims.height" :head="s.head" />

    <header class="ulm-head" :style="{ height: `${s.head}px` }">
      <div class="ulm-badge" :style="{ width: `${s.badge}px`, height: `${Math.round(s.badge * 1.1)}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.66)" shape="hex" :colors="{ primary: '#2a1260', secondary: '#ff3df5' }" font="Russo One" />
      </div>
      <div class="ulm-titles">
        <p class="ulm-tag" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ tag }}</p>
        <p class="ulm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">{{ kicker }}</p>
        <h1 class="ulm-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="ulm-sub" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo: dos hexágonos de metal -->
    <section class="ulm-duel">
      <div class="ulm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="ulm-team" :class="{ 'ulm-lost': final?.winner && final.winner !== x.side }">
            <div class="ulm-glow">
              <div class="ulm-hex" :style="{ width: `${s.hex}px`, height: `${Math.round(s.hex * 1.1)}px` }">
                <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.hex * 0.7)" shape="hex" font="Russo One" />
              </div>
            </div>
            <span class="ulm-side" :style="{ fontSize: `${Math.round(s.name * 0.46)}px` }">{{ x.label }}</span>
            <span class="ulm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="ulm-vs" :class="{ 'ulm-score': final }" :style="{ fontSize: `${vsSize}px`, marginTop: `${Math.round((s.hex * 1.1 - vsSize) / 2)}px` }">{{ vs ?? 'VS' }}</div>
        </template>
      </div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="ulm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="ulm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="ulm-when">
        <template v-if="data.dateLabel">
          <span class="ulm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="ulm-time">{{ data.timeLabel }} h</span>
        </template>
        <span v-if="data.scheduleNote" class="ulm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="ulm-venue">{{ data.venue }}</p>
    </section>

    <footer class="ulm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span class="ulm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ulm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #1a0b3b;
  color: #f3ecff;
  font-family: 'Chakra Petch', sans-serif;
}
.ulm-head {
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
.ulm-badge,
.ulm-hex {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #ffffff, #b9b3d6 45%, #6d5fa8);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.ulm-badge {
  filter: drop-shadow(0 0 30px rgb(255 61 245 / 0.6));
}
.ulm-titles {
  min-width: 0;
  max-width: 100%;
}
.ulm-tag {
  margin: 0 0 0.3em;
  font-family: 'Russo One', sans-serif;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #3dd6ff;
}
.ulm-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: #ff3df5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ulm-title {
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
.ulm-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b9a8e6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ulm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 50px;
}
.ulm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.ulm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ulm-glow {
  margin-bottom: 26px;
  /* El brillo va en el contenedor: el clip-path del hexágono lo recortaría. */
  filter: drop-shadow(0 0 34px rgb(255 61 245 / 0.55));
}
.ulm-side {
  font-family: 'Russo One', sans-serif;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #3dd6ff;
}
.ulm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 700;
  line-height: 1.14;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ulm-vs {
  flex: none;
  font-family: 'Russo One', sans-serif;
  line-height: 1;
  background: linear-gradient(90deg, #ff3df5, #3dd6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 18px rgb(255 61 245 / 0.6));
}

.ulm-info {
  position: relative;
  flex: none;
  margin: 0 46px 0.3em;
  padding: 0.4em 1em;
}
.ulm-info::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgb(255 61 245 / 0.32), rgb(61 214 255 / 0.08));
  clip-path: polygon(22px 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 22px 100%, 0 50%);
}
.ulm-info > * {
  position: relative;
}
.ulm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6em;
}
.ulm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Russo One', sans-serif;
  font-size: 1.05em;
  text-transform: uppercase;
}
.ulm-time {
  white-space: nowrap;
  padding: 0.18em 0.8em;
  font-family: 'Russo One', sans-serif;
  font-size: 1.05em;
  color: #fff;
  background: linear-gradient(160deg, #ff3df5, #8a1bd6);
  clip-path: polygon(14% 0, 86% 0, 100% 50%, 86% 100%, 14% 100%, 0 50%);
}
.ulm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.12em 0.9em;
  font-family: 'Russo One', sans-serif;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(160deg, #ff3df5, #8a1bd6);
  clip-path: polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%);
}
.ulm-venue {
  margin: 0.25em 0 0;
  font-weight: 600;
  font-size: 0.66em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d8ccff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ulm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60px;
}
.ulm-mark {
  font-family: 'Russo One', sans-serif;
  font-size: 1.4em;
  letter-spacing: 0.24em;
  background: linear-gradient(90deg, #ff3df5, #3dd6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* 7B-E: resultado final */
.ulm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ulm-lost .ulm-name {
  opacity: 0.6;
}
.ulm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
