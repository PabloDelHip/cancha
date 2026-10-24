<script setup lang="ts">
import { computed } from 'vue'
import Crest from './Crest.vue'
import type { RoundRow } from '../data'
import type { ResultCardTheme, ResultMetrics } from '../layout'

/**
 * 7B-C — Tarjeta compacta de un partido de la jornada, para la imagen dividida en dos columnas: un
 * renglón por equipo (escudo, nombre y, en resultados, sus goles). En horarios (7B-D) la hora va a
 * la derecha, a lo alto de la tarjeta, y la cancha abajo. Cada familia la viste con su `theme`.
 */
const props = defineProps<{ row: RoundRow; m: ResultMetrics; theme: ResultCardTheme }>()
const sides = computed(() => {
  const r = props.row
  return [
    { key: 'home', t: r.home, goals: r.kind === 'result' ? r.homeScore : null, lost: r.winner === 'away' },
    { key: 'away', t: r.away, goals: r.kind === 'result' ? r.awayScore : null, lost: r.winner === 'home' },
  ]
})
const vars = computed(() => {
  const t = props.theme
  return {
    height: `${props.m.rowH}px`,
    '--rc-ink': t.ink,
    '--rc-lost': t.lost,
    '--rc-name-font': t.nameFont,
    '--rc-name-weight': String(t.nameWeight ?? 700),
    '--rc-transform': t.uppercase === false ? 'none' : 'uppercase',
    '--rc-score-font': t.scoreFont,
    '--rc-score-weight': String(t.scoreWeight ?? 400),
    '--rc-score-bg': t.scoreBg,
    '--rc-score-ink': t.scoreInk,
    '--rc-score-radius': t.scoreRadius ?? '0',
    '--rc-score-clip': t.scoreClip ?? 'none',
    '--rc-card': t.card,
    '--rc-card-border': t.cardBorder ?? 'none',
    '--rc-card-radius': t.cardRadius ?? '0',
    '--rc-card-clip': t.cardClip ?? 'none',
    '--rc-card-shadow': t.cardShadow ?? 'none',
    '--rc-detail': t.detail,
  }
})
</script>

<template>
  <div class="rc" :style="vars">
    <div class="rc-card">
      <div class="rc-body">
        <div class="rc-teams">
          <div v-for="x in sides" :key="x.key" class="rc-line" :class="{ 'rc-lost': x.lost }" :style="{ height: `${m.line}px` }">
            <Crest :src="x.t.crest" :initials="x.t.initials" :colors="x.t.colors" :size="m.crest" :shape="theme.crestShape" :font="theme.crestFont" />
            <span class="rc-name" :style="{ fontSize: `${m.nameOf(x.t.name)}px` }">{{ x.t.name }}</span>
            <span v-if="x.goals !== null" class="rc-score" :style="{ fontSize: `${m.score}px` }">{{ x.goals }}</span>
          </div>
        </div>
        <span v-if="row.kind === 'fixture'" class="rc-score rc-time" :style="{ fontSize: `${Math.round(m.score * 0.76)}px` }">
          <template v-if="row.time">{{ row.time }}</template>
          <small v-else>Por<br />confirmar</small>
        </span>
      </div>
      <small v-if="row.detail" class="rc-detail" :style="{ fontSize: `${Math.max(12, Math.round(m.line * 0.3))}px` }">{{ row.detail }}</small>
    </div>
  </div>
</template>

<style scoped>
.rc {
  display: flex;
  align-items: center;
  padding: 5px 0;
  box-sizing: border-box;
  min-width: 0;
}
.rc-card {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 14px;
  background: var(--rc-card);
  border: var(--rc-card-border);
  border-radius: var(--rc-card-radius);
  clip-path: var(--rc-card-clip);
  box-shadow: var(--rc-card-shadow);
}
.rc-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
}
.rc-teams {
  min-width: 0;
}
.rc-time small {
  display: block;
  font-size: 0.5em;
  line-height: 1.15;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.rc-line {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
}
.rc-name {
  min-width: 0;
  /* Aire arriba para las tildes de las mayúsculas. */
  padding-top: 0.1em;
  font-family: var(--rc-name-font);
  font-weight: var(--rc-name-weight);
  text-transform: var(--rc-transform);
  color: var(--rc-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rc-lost .rc-name {
  color: var(--rc-lost);
}
.rc-score {
  min-width: 1.6em;
  padding: 0.02em 0.3em;
  text-align: center;
  font-family: var(--rc-score-font);
  font-weight: var(--rc-score-weight);
  line-height: 1.12;
  color: var(--rc-score-ink);
  background: var(--rc-score-bg);
  border-radius: var(--rc-score-radius);
  clip-path: var(--rc-score-clip);
  font-variant-numeric: tabular-nums lining-nums;
}
.rc-lost .rc-score {
  opacity: 0.78;
}
.rc-detail {
  align-self: flex-end;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rc-detail);
  white-space: nowrap;
}
</style>
