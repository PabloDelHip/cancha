<script setup lang="ts">
import { computed } from 'vue'
import type { FinalResult } from '../data'
import type { FinalEventsTheme } from '../layout'

/**
 * 7B-E — Goleadores y tarjetas del cartel de resultado final, en dos columnas (local a la izquierda,
 * visita a la derecha, como el duelo). La letra baja con los renglones del lado más largo para que
 * todo quepa en `height` (un 9-0 sigue en una sola imagen). Cada familia la viste con su `theme`.
 */
const props = defineProps<{ final: FinalResult; theme: FinalEventsTheme; font: number; height: number }>()
const rows = computed(() => props.final.lines + (props.final.detail ? 1.4 : 0))
/** Renglón más largo (nombre, «×3» y «(a.g.)»): la letra baja antes de recortar con puntos suspensivos. */
const longest = computed(() => Math.max(1, ...[props.final.home, props.final.away].flatMap((x) => [...x.goals.map((g) => g.name.length + (g.count > 1 ? 3 : 0) + (g.own ? 6 : 0)), ...x.cards.map((c) => c.name.length + c.yellow + c.red)])))
/** Cada columna mide ~470 px en los tres formatos (el ancho es el mismo). */
const size = computed(() => Math.max(16, Math.min(props.font, Math.floor(props.height / Math.max(1, rows.value * 1.42)), Math.floor(470 / (longest.value * (props.theme.charWidth ?? 0.56) + 1.6)))))
const sides = computed(() => [
  { key: 'home', x: props.final.home },
  { key: 'away', x: props.final.away },
])
const vars = computed(() => {
  const t = props.theme
  return {
    fontSize: `${size.value}px`,
    '--fe-font': t.font,
    '--fe-weight': String(t.weight ?? 600),
    '--fe-transform': t.uppercase === false ? 'none' : 'uppercase',
    '--fe-ink': t.ink,
    '--fe-muted': t.muted,
    '--fe-accent': t.accent,
    '--fe-line': t.line,
    '--fe-detail-bg': t.detailBg ?? t.accent,
    '--fe-detail-ink': t.detailInk ?? '#000',
    '--fe-detail-font': t.detailFont ?? t.font,
    '--fe-detail-radius': t.detailRadius ?? '0',
    '--fe-detail-weight': String(t.detailWeight ?? t.weight ?? 600),
  }
})
</script>

<template>
  <div v-if="final.lines || final.detail" class="fe" :style="vars">
    <p v-if="final.detail" class="fe-detail"><span>{{ final.detail }}</span></p>
    <div v-if="final.lines" class="fe-cols">
      <ul v-for="s in sides" :key="s.key" class="fe-col" :class="`fe-${s.key}`">
        <li v-for="g in s.x.goals" :key="`g-${g.name}-${g.own}`" class="fe-row">
          <svg class="fe-ball" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 7.2l4.1 3-1.6 4.8h-5l-1.6-4.8z" fill="currentColor" />
            <path d="M12 7.2V2.5M16.1 10.2l4.4-1.4M14.5 15l2.8 3.8M9.5 15l-2.8 3.8M7.9 10.2L3.5 8.8" stroke="currentColor" stroke-width="1.6" />
          </svg>
          <span class="fe-name">{{ g.name }}</span>
          <span v-if="g.count > 1" class="fe-count">×{{ g.count }}</span>
          <span v-if="g.own" class="fe-own">(a.g.)</span>
        </li>
        <li v-for="c in s.x.cards" :key="`c-${c.name}`" class="fe-row fe-card-row">
          <span class="fe-cards" aria-hidden="true">
            <i v-for="n in c.yellow" :key="`y${n}`" class="fe-card fe-yellow" />
            <i v-for="n in c.red" :key="`r${n}`" class="fe-card fe-red" />
          </span>
          <span class="fe-name">{{ c.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.fe {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  font-family: var(--fe-font), sans-serif;
  font-weight: var(--fe-weight);
  color: var(--fe-ink);
  line-height: 1.2;
}
.fe-detail {
  margin: 0;
  text-align: center;
}
.fe-detail span {
  display: inline-block;
  padding: 0.08em 0.7em;
  font-family: var(--fe-detail-font), sans-serif;
  font-weight: var(--fe-detail-weight);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fe-detail-ink);
  background: var(--fe-detail-bg);
  border-radius: var(--fe-detail-radius);
}
.fe-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.fe-col {
  list-style: none;
  margin: 0;
  padding: 0 0.9em;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.22em;
}
.fe-home {
  border-right: 2px solid var(--fe-line);
}
.fe-row {
  /* Rejilla fija (sin saltos de línea): el exportador no reproduce bien un flex que se parte. */
  display: flex;
  align-items: center;
  gap: 0.4em;
  min-width: 0;
  white-space: nowrap;
}
/* Visita: alineada a la derecha, con el balón o la tarjeta del lado de afuera (el texto se lee igual). */
.fe-away .fe-row {
  justify-content: flex-end;
}
.fe-away .fe-ball,
.fe-away .fe-cards {
  order: 9;
}
.fe-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  text-transform: var(--fe-transform);
}
.fe-ball {
  flex: none;
  width: 0.9em;
  height: 0.9em;
  color: var(--fe-accent);
}
.fe-count {
  flex: none;
  color: var(--fe-accent);
}
.fe-own {
  flex: none;
  font-size: 0.78em;
  color: var(--fe-muted);
  text-transform: none;
}
.fe-card-row .fe-name {
  color: var(--fe-muted);
}
.fe-cards {
  flex: none;
  display: flex;
  gap: 0.14em;
  min-width: 0.9em;
  justify-content: center;
}
.fe-card {
  display: block;
  width: 0.5em;
  height: 0.7em;
  border-radius: 0.08em;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
}
.fe-yellow {
  background: #facc15;
}
.fe-red {
  background: #ef4444;
}
</style>
