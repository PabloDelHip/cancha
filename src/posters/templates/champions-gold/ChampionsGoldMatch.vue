<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import FinalEvents from '../../parts/FinalEvents.vue'
import ChampionsGoldBackdrop from './ChampionsGoldBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import { finalFit, scoreSize, scoreText, type FinalEventsTheme, type MatchPosterProps } from '../../layout'

/**
 * Champions Gold — Próximo partido. La simetría de la tabla: medallón del torneo arriba, Cinzel
 * dorado, cada escudo en un medallón dorado como el del logo y la programación entre filetes
 * dorados, con la hora en el medallón de los clasificados.
 * 7B-E — Resultado final: la misma pieza con el marcador en lugar del VS y, debajo, goleadores y
 * tarjetas (los escudos se achican para dejarles lugar).
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 600, foot: 140, medal: 360, name: 42, vs: 120, title: 112, badge: 170, info: 36 },
  portrait: { head: 340, foot: 96, medal: 280, name: 38, vs: 92, title: 80, badge: 104, info: 34 },
  square: { head: 262, foot: 78, medal: 210, name: 31, vs: 76, title: 62, badge: 84, info: 28 },
} as const
/** 7B-E: los escudos se achican según cuántos goles y tarjetas hay que mostrar. */
const fit = computed(() => finalFit(props.format, props.data.final))
const final = computed(() => props.data.final)
const s = computed(() => {
  const b = SIZES[props.format]
  return final.value ? { ...b, medal: Math.round(b.medal * fit.value.k), name: Math.round(b.name * 0.86) } : b
})
const tag = computed(() => (final.value ? 'Resultado final' : 'Próximo partido'))
const vs = computed(() => (final.value ? scoreText(final.value) : null))
const vsSize = computed(() => (final.value ? scoreSize(s.value.vs, final.value) : s.value.vs))
const EVENTS: FinalEventsTheme = { font: 'Montserrat', charWidth: 0.72, weight: 600, ink: '#f8f1dc', muted: '#b9a67a', accent: '#d4af37', line: 'rgb(212 175 55 / 0.3)', detailFont: 'Cinzel', detailWeight: 700, detailBg: '#d4af37', detailInk: '#0b1736' }
const dims = computed(() => FORMATS[props.format])
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 11) / Math.max(11, props.data.roundLabel.length))))
/** Como la tabla: liga (o torneo) con temporada; abajo, torneo y grupo. */
const eyebrow = computed(() => withSeason(props.data.leagueName ?? props.data.tournamentName, props.data.season))
const subtitle = computed(() => [props.data.leagueName ? props.data.tournamentName : null, props.data.groupLabel].filter(Boolean).join(' · '))
const teams = computed(() => [
  { side: 'home', label: 'Local', t: props.data.home },
  { side: 'away', label: 'Visita', t: props.data.away },
])
</script>

<template>
  <div class="cgm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <ChampionsGoldBackdrop :width="dims.width" :height="dims.height" :head="s.head" />

    <header class="cgm-head" :style="{ height: `${s.head}px` }">
      <div class="cgm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.68)" shape="circle" :colors="{ primary: '#0b1736', secondary: '#d4af37' }" font="Cinzel" />
      </div>
      <p class="cgm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.24)}px` }"><span class="cgm-rule" />{{ tag }}<span class="cgm-rule" /></p>
      <h1 class="cgm-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
      <p class="cgm-sub" :style="{ fontSize: `${Math.round(s.title * 0.22)}px` }">{{ eyebrow }}</p>
      <p v-if="subtitle" class="cgm-sub cgm-sub2" :style="{ fontSize: `${Math.round(s.title * 0.18)}px` }">{{ subtitle }}</p>
    </header>

    <!-- Duelo: dos medallones dorados -->
    <section class="cgm-duel">
      <div class="cgm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="cgm-team" :class="{ 'cgm-lost': final?.winner && final.winner !== x.side }">
            <div class="cgm-medal" :style="{ width: `${s.medal}px`, height: `${s.medal}px` }">
              <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="Math.round(s.medal * 0.72)" shape="circle" font="Cinzel" />
            </div>
            <span class="cgm-side" :style="{ fontSize: `${Math.round(s.name * 0.46)}px` }">{{ x.label }}</span>
            <span class="cgm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="cgm-vs" :class="{ 'cgm-score': final }" :style="{ fontSize: `${vsSize}px`, marginTop: `${Math.round((s.medal - vsSize) / 2)}px` }">{{ vs ?? 'VS' }}</div>
        </template>
      </div>
    </section>

    <!-- 7B-E: goleadores y tarjetas -->
    <FinalEvents v-if="final" class="cgm-events" :final="final" :theme="EVENTS" :font="s.info" :height="fit.events" />

    <!-- Programación: solo lo que el partido tiene -->
    <section class="cgm-info" :style="{ fontSize: `${s.info}px` }">
      <div v-if="data.dateLabel" class="cgm-when">
        <span class="cgm-date">{{ data.dateLabel }}</span>
        <span v-if="data.timeLabel" class="cgm-time">{{ data.timeLabel }} h</span>
      </div>
      <span v-if="data.scheduleNote" class="cgm-note">{{ data.scheduleNote }}</span>
      <p v-if="data.venue" class="cgm-venue">{{ data.venue }}</p>
    </section>

    <footer class="cgm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 24, portrait: 19, square: 16 })[format]}px` }">
      <span class="cgm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.cgm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f8f1dc;
  font-family: 'Montserrat', sans-serif;
  background: #0b1736;
}
.cgm-head {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 80px 0;
}
.cgm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 45%, #7a5a14);
  box-shadow: 0 0 0 4px #0b1736, 0 0 0 6px #d4af37, 0 16px 40px rgb(0 0 0 / 0.5);
  margin-bottom: 0.3em;
}
.cgm-kicker {
  display: flex;
  align-items: center;
  gap: 18px;
  max-width: 100%;
  margin: 0.5em 0 0;
  font-weight: 600;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: #d4af37;
  white-space: nowrap;
}
.cgm-rule {
  flex: none;
  width: 70px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #d4af37);
}
.cgm-rule:last-child {
  background: linear-gradient(90deg, #d4af37, transparent);
}
.cgm-title {
  margin: 0.1em 0 0;
  /* Aire para las tildes de las mayúsculas (Cinzel las dibuja altas). */
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
.cgm-sub {
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

.cgm-sub2 {
  margin-top: 0.25em;
  color: #94a3b8;
}

.cgm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 70px;
}
.cgm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.cgm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.cgm-medal {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, #fffaf0, #f3e7c4 70%);
  box-shadow: 0 0 0 6px #0b1736, 0 0 0 10px #d4af37, 0 0 0 16px rgb(212 175 55 / 0.25), 0 24px 50px rgb(0 0 0 / 0.55);
}
.cgm-side {
  font-family: 'Cinzel', serif;
  font-weight: 700;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #d4af37;
}
.cgm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cgm-vs {
  flex: none;
  font-family: 'Cinzel', serif;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(180deg, #fff6d5 0%, #f3d27a 40%, #b8892a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.cgm-info {
  position: relative;
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3em;
  margin: 0 90px;
  padding: 0.5em 0;
  text-align: center;
  border-top: 2px solid #d4af37;
  border-bottom: 1.5px solid rgb(212 175 55 / 0.45);
}
.cgm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: auto auto;
  align-items: center;
  gap: 0.7em;
  max-width: 100%;
}
.cgm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  font-size: 1.05em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cgm-time {
  white-space: nowrap;
  padding: 0.1em 0.6em;
  border-radius: 999px;
  font-family: 'Cinzel', serif;
  font-weight: 900;
  font-size: 1.05em;
  color: #0b1736;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 55%, #8a6a1f);
}
.cgm-note {
  padding: 0.1em 0.7em;
  border-radius: 999px;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  color: #0b1736;
  background: radial-gradient(circle at 35% 30%, #fff4c9, #d4af37 55%, #8a6a1f);
}
.cgm-venue {
  max-width: 100%;
  margin: 0;
  font-weight: 600;
  font-size: 0.6em;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cgm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 70px 20px;
}
.cgm-mark {
  font-family: 'Cinzel', serif;
  font-weight: 900;
  font-size: 1.3em;
  color: #d4af37;
  letter-spacing: 0.3em;
}

/* 7B-E: resultado final */
.cgm-score {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.cgm-lost .cgm-name {
  opacity: 0.6;
}
.cgm-events {
  position: relative;
  flex: none;
  margin: 0 40px 24px;
}
</style>
