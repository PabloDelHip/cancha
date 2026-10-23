<script setup lang="ts">
import { computed } from 'vue'
import Crest from '../../parts/Crest.vue'
import { FORMATS, withSeason } from '../../data'
import type { MatchPosterProps } from '../../layout'

/**
 * Elite White — Próximo partido. Editorial como la tabla: blanco, Playfair grande con el número en
 * cursiva, filetes negros (grueso arriba y abajo, fino entre bloques) y nada más. Los escudos van
 * enfrentados con un «vs.» en cursiva y la programación como ficha de revista.
 */
const props = defineProps<MatchPosterProps>()
const SIZES = {
  story: { head: 520, foot: 120, crest: 330, name: 54, vs: 120, title: 170, logo: 120, info: 40 },
  portrait: { head: 320, foot: 84, crest: 270, name: 42, vs: 96, title: 118, logo: 90, info: 34 },
  square: { head: 262, foot: 70, crest: 200, name: 34, vs: 80, title: 92, logo: 74, info: 28 },
} as const
const s = computed(() => SIZES[props.format])
const dims = computed(() => FORMATS[props.format])
const titleSize = computed(() => Math.round(Math.min(s.value.title, (s.value.title * 10) / Math.max(10, props.data.roundLabel.length))))
/** «Jornada 10»: el número en cursiva, como en la tabla. */
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
  <div class="ewm" :style="{ width: `${dims.width}px`, height: `${dims.height}px` }">
    <header class="ewm-head" :style="{ height: `${s.head}px` }">
      <div class="ewm-top" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">
        <span class="ewm-kicker">{{ kicker }}</span>
        <Crest :src="data.logo" :initials="data.logoInitials" :size="s.logo" shape="circle" :colors="{ primary: '#111111', secondary: '#ffffff' }" font="Playfair Display" />
      </div>
      <p class="ewm-tag" :style="{ fontSize: `${Math.round(s.title * 0.2)}px` }">Próximo partido</p>
      <h1 class="ewm-title" :style="{ fontSize: `${titleSize}px` }">{{ title.text }} <em v-if="title.num">{{ title.num }}</em></h1>
      <p v-if="subtitle" class="ewm-sub" :style="{ fontSize: `${Math.round(s.title * 0.15)}px` }">{{ subtitle }}</p>
    </header>

    <!-- Duelo: escudos enfrentados -->
    <section class="ewm-duel">
      <div class="ewm-pair">
        <template v-for="(x, i) in teams" :key="x.side">
          <div class="ewm-team">
            <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="s.crest" shape="circle" font="Playfair Display" />
            <span class="ewm-side" :style="{ fontSize: `${Math.round(s.name * 0.4)}px` }">{{ x.label }}</span>
            <span class="ewm-name" :style="{ fontSize: `${s.name}px` }">{{ x.t.name }}</span>
          </div>
          <div v-if="i === 0" class="ewm-vs" :style="{ fontSize: `${s.vs}px`, marginTop: `${Math.round((s.crest - s.vs * 1.2) / 2)}px` }">vs.</div>
        </template>
      </div>
    </section>

    <!-- Programación: ficha con filetes; solo lo que el partido tiene -->
    <section class="ewm-info" :style="{ fontSize: `${s.info}px` }">
      <div v-if="data.dateLabel" class="ewm-when">
        <div class="ewm-cell">
          <span class="ewm-label">Fecha</span>
          <span class="ewm-date">{{ data.dateLabel }}</span>
        </div>
        <div v-if="data.timeLabel" class="ewm-cell ewm-cell-time">
          <span class="ewm-label">Hora</span>
          <span class="ewm-time">{{ data.timeLabel }}</span>
        </div>
      </div>
      <p v-if="data.scheduleNote" class="ewm-note">{{ data.scheduleNote }}</p>
      <div v-if="data.venue" class="ewm-cell ewm-venue">
        <span class="ewm-label">Sede</span>
        <span class="ewm-venue-text">{{ data.venue }}</span>
      </div>
    </section>

    <footer class="ewm-foot" :style="{ height: `${s.foot}px`, fontSize: `${({ story: 21, portrait: 17, square: 15 })[format]}px` }">
      <span class="ewm-mark">Kisokar</span>
    </footer>
  </div>
</template>

<style scoped>
.ewm {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  color: #111111;
  font-family: 'Inter', sans-serif;
}
.ewm-head {
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  margin: 0 72px;
  padding-bottom: 28px;
  border-bottom: 6px solid #111;
}
.ewm-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 0.9em;
  border-bottom: 1px solid #111;
  margin-bottom: 0.6em;
}
.ewm-kicker {
  min-width: 0;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ewm-tag {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 600;
  color: #555;
}
.ewm-title {
  margin: 0;
  padding-bottom: 0.12em;
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.ewm-title em {
  font-weight: 600;
  font-style: italic;
}
.ewm-sub {
  margin: 0.3em 0 0;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ewm-duel {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 72px;
}
.ewm-pair {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: inherit;
}
.ewm-team {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.ewm-side {
  margin-top: 1.4em;
  padding-top: 0.8em;
  border-top: 1px solid #111;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #777;
}
.ewm-name {
  max-width: 100%;
  /* El aire de arriba deja ver las tildes (el recorte de dos líneas las cortaba). */
  padding-top: 0.2em;
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ewm-vs {
  flex: none;
  /* Alineado con el centro de los escudos. */
  align-self: flex-start;
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 400;
  line-height: 1.2;
  color: #111;
}

.ewm-info {
  flex: none;
  margin: 0 72px 0.9em;
  border-top: 1px solid #111;
}
.ewm-when {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}
.ewm-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 0.45em 0;
}
.ewm-cell-time {
  padding-left: 0.9em;
  border-left: 1px solid #111;
  margin-left: 0.9em;
}
.ewm-label {
  font-size: 0.42em;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: #777;
}
.ewm-date,
.ewm-time {
  font-family: 'Playfair Display', serif;
  font-variant-numeric: lining-nums tabular-nums;
  font-weight: 700;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ewm-time {
  font-weight: 900;
}
.ewm-note {
  margin: 0;
  padding: 0.45em 0;
  font-family: 'Playfair Display', serif;
  font-style: italic;
  font-weight: 700;
}
.ewm-venue {
  border-top: 1px solid #e5e5e5;
}
.ewm-venue-text {
  font-size: 0.62em;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ewm-foot {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin: 0 72px;
  border-top: 6px solid #111;
}
.ewm-mark {
  font-family: 'Playfair Display', serif;
  font-weight: 900;
  font-style: italic;
  font-size: 1.6em;
  color: #111;
}
</style>
