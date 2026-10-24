<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import IceBlueBackdrop from './IceBlueBackdrop.vue'
import { FORMATS, withSeason } from '../../data'
import type { MatchPosterProps } from '../../layout'

/**
 * Ice Blue — Próximo partido. Claro y helado como la tabla: cada equipo en su propia tarjeta
 * blanca, el VS en el hexágono azul del logo y la programación en otra tarjeta con el filo azul de
 * los clasificados y la hora en el bloque degradado de los puntos.
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 540, foot: 120, crest: 320, name: 50, vs: 150, title: 140, badge: 180, info: 42 },
  portrait: { head: 300, foot: 84, crest: 250, name: 40, vs: 116, title: 100, badge: 140, info: 34 },
  square: { head: 226, foot: 70, crest: 186, name: 32, vs: 92, title: 80, badge: 112, info: 28 },
} as const
const s = computed(() => SIZES[props.format])
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
  <div class="ibm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <IceBlueBackdrop :width="dims.width" :height="dims.height" :head="s.head" />

    <header class="ibm-head" :class="{ 'ibm-stacked': stacked }" :style="{ height: `${s.head}px` }">
      <div class="ibm-badge" :style="{ width: `${s.badge}px`, height: `${s.badge}px` }">
        <Crest :src="data.logo" :initials="data.logoInitials" :size="Math.round(s.badge * 0.7)" shape="circle" :colors="{ primary: '#0b4f8a', secondary: '#ffffff' }" font="Exo 2" />
      </div>
      <div class="ibm-titles">
        <p class="ibm-tag" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">Próximo partido</p>
        <p class="ibm-kicker" :style="{ fontSize: `${Math.round(s.title * 0.19)}px` }">{{ kicker }}</p>
        <h1 class="ibm-title" :style="{ fontSize: `${titleSize}px` }">{{ data.roundLabel }}</h1>
        <p v-if="subtitle" class="ibm-sub" :style="{ fontSize: `${Math.round(s.title * 0.17)}px` }">{{ subtitle }}</p>
      </div>
    </header>

    <!-- Duelo: una tarjeta por equipo -->
    <section class="ibm-duel">
      <div class="ibm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="ibm-card">
            <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="s.crest" shape="circle" font="Exo 2" />
            <span class="ibm-side" :style="{ fontSize: `${Math.round(s.name * 0.46)}px` }">{{ x.label }}</span>
            <span class="ibm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="ibm-vs" :style="{ width: `${s.vs}px`, height: `${s.vs}px`, fontSize: `${Math.round(s.vs * 0.36)}px`, marginTop: `${Math.round((s.crest - s.vs) / 2 + 34)}px` }">VS</div>
        </template>
      </div>
    </section>

    <!-- Programación: solo lo que el partido tiene -->
    <section class="ibm-info" :style="{ fontSize: `${s.info}px` }">
      <div class="ibm-when">
        <template v-if="data.dateLabel">
          <span class="ibm-date">{{ data.dateLabel }}</span>
          <span v-if="data.timeLabel" class="ibm-time">{{ data.timeLabel }} h</span>
        </template>
        <span v-if="data.scheduleNote" class="ibm-note">{{ data.scheduleNote }}</span>
      </div>
      <p v-if="data.venue" class="ibm-venue">{{ data.venue }}</p>
    </section>

    <footer class="ibm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 23, portrait: 18, square: 16 })[format]}px` }">
      <span class="ibm-mark">KISOKAR</span>
    </footer>
  </div>
</template>

<style scoped>
.ibm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #eef7ff;
  color: #0a2540;
  font-family: 'Exo 2', sans-serif;
}
.ibm-head {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 36px;
  padding: 0 60px;
}
.ibm-stacked {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 26px;
  padding-bottom: 20px;
}
.ibm-badge {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #5bb8f5, #0b4f8a);
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
}
.ibm-titles {
  min-width: 0;
  max-width: 100%;
}
.ibm-tag {
  display: inline-block;
  margin: 0 0 0.45em;
  padding: 0.12em 0.7em;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
}
.ibm-kicker {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #1d8fe0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ibm-title {
  margin: 0.02em 0 0;
  padding-top: 0.06em;
  font-weight: 900;
  font-style: italic;
  line-height: 0.95;
  text-transform: uppercase;
  background: linear-gradient(180deg, #1673c4, #0b3a66);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  white-space: nowrap;
}
.ibm-sub {
  margin: 0.3em 0 0;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4a6a8a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ibm-duel {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  padding: 0 46px;
}
.ibm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.ibm-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 34px 20px 30px;
  text-align: center;
  border-radius: 28px;
  background: rgb(255 255 255 / 0.92);
  box-shadow: 0 14px 34px rgb(11 79 138 / 0.14), inset 0 0 0 1.5px #ffffff, inset 0 6px 0 #1d8fe0;
}
.ibm-side {
  margin-top: 24px;
  font-weight: 800;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #1d8fe0;
}
.ibm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.14em;
  font-weight: 800;
  line-height: 1.15;
  text-transform: uppercase;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ibm-vs {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-style: italic;
  color: #ffffff;
  background: linear-gradient(135deg, #5bb8f5, #0b4f8a);
  clip-path: polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0 50%);
}

.ibm-info {
  position: relative;
  flex: none;
  margin: 0 46px 0.4em;
  padding: 0.45em 0.7em 0.45em 0.9em;
  border-radius: 22px;
  background: rgb(255 255 255 / 0.92);
  box-shadow: 0 10px 26px rgb(11 79 138 / 0.12), inset 8px 0 0 #1d8fe0;
}
.ibm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6em;
}
.ibm-date {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 800;
  font-style: italic;
  font-size: 1.1em;
  text-transform: uppercase;
}
.ibm-time {
  white-space: nowrap;
  padding: 0.08em 0.55em;
  border-radius: 14px;
  font-weight: 900;
  font-size: 1.15em;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
}
.ibm-note {
  justify-self: start;
  grid-column: 1 / -1;
  padding: 0.08em 0.6em;
  border-radius: 14px;
  font-weight: 800;
  font-style: italic;
  text-transform: uppercase;
  color: #ffffff;
  background: linear-gradient(135deg, #3aa6f2, #0b4f8a);
}
.ibm-venue {
  margin: 0.3em 0 0;
  font-weight: 600;
  font-size: 0.66em;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #36597c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ibm-foot {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 60px;
}
.ibm-mark {
  font-weight: 900;
  font-style: italic;
  font-size: 1.4em;
  letter-spacing: 0.2em;
  color: #0b4f8a;
}
</style>
