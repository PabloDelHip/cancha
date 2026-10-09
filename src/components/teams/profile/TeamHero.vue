<script setup lang="ts">
import { computed, ref } from "vue";
import { Move, MapPin, Shield } from "lucide-vue-next";
import type { CoverPosition, TeamCompetition, TeamProfile } from "@/types";
import TeamLogo from "@/components/teams/TeamLogo.vue";

/**
 * Identidad del equipo. Solo datos que existen: escudo, nombre, colores y ciudad. La categoría
 * pertenece a cada torneo (se ve en sus competiciones) y el año de fundación no existe en el modelo.
 *
 * Con foto de portada, la foto ocupa el fondo recortada alrededor de `coverPosition` (como en
 * Facebook); sin ella, el diseño de siempre con los colores del equipo. Con `editable` la foto se
 * arrastra para encuadrarla (v-model:position).
 */
const props = withDefaults(
  defineProps<{
    team: TeamProfile["team"];
    current: TeamCompetition[];
    editable?: boolean;
    coverSrc?: string | null;
  }>(),
  {
    editable: false,
    coverSrc: undefined,
  },
);
const position = defineModel<CoverPosition>("position");

const src = computed(
  () =>
    (props.coverSrc !== undefined ? props.coverSrc : props.team.coverUrl) ??
    null,
);
const pos = computed(
  () => position.value ?? props.team.coverPosition ?? { x: 50, y: 50 },
);

// Arrastrar: lo que se mueve el dedo se traduce a % del sobrante de la foto (la parte que no cabe).
const box = ref<HTMLElement | null>(null);
const img = ref<HTMLImageElement | null>(null);
let drag: {
  x: number;
  y: number;
  start: CoverPosition;
  overX: number;
  overY: number;
} | null = null;
const clamp = (n: number) =>
  Math.min(100, Math.max(0, Math.round(n * 10) / 10));
function onDown(e: PointerEvent) {
  if (!props.editable || !box.value || !img.value?.naturalWidth) return;
  const { clientWidth: cw, clientHeight: ch } = box.value;
  const { naturalWidth: nw, naturalHeight: nh } = img.value;
  const scale = Math.max(cw / nw, ch / nh);
  // En la vista previa el perfil va escalado: el sobrante se pasa a píxeles de pantalla.
  const screen = box.value.getBoundingClientRect().width / cw;
  drag = {
    x: e.clientX,
    y: e.clientY,
    start: { ...pos.value },
    overX: (nw * scale - cw) * screen,
    overY: (nh * scale - ch) * screen,
  };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function onMove(e: PointerEvent) {
  if (!drag) return;
  position.value = {
    x:
      drag.overX > 0
        ? clamp(drag.start.x - ((e.clientX - drag.x) / drag.overX) * 100)
        : 50,
    y:
      drag.overY > 0
        ? clamp(drag.start.y - ((e.clientY - drag.y) / drag.overY) * 100)
        : 50,
  };
}
function onUp() {
  drag = null;
}
/** Teclado: flechas mueven el encuadre de 2 en 2 (accesible sin ratón). */
function onKey(e: KeyboardEvent) {
  const step = {
    ArrowLeft: [-2, 0],
    ArrowRight: [2, 0],
    ArrowUp: [0, -2],
    ArrowDown: [0, 2],
  }[e.key];
  if (!props.editable || !step) return;
  e.preventDefault();
  position.value = {
    x: clamp(pos.value.x + step[0]!),
    y: clamp(pos.value.y + step[1]!),
  };
}
</script>

<template>
  <!-- Se adapta a SU ancho (container query), no al de la pantalla: así la vista previa "Celular" del
       editor de portada es exacta. -->
  <div class="@container">
    <section
      class="relative overflow-hidden text-white"
      :style="{ backgroundColor: team.colors.primary }"
    >
      <template v-if="src">
        <!-- Angosto (celular): la foto es una franja arriba y el contenido va debajo, como en Facebook.
           Ancho: la foto ocupa todo el fondo. -->
        <div
          ref="box"
          class="relative aspect-[16/9] @2xl:absolute @2xl:inset-0 @2xl:aspect-auto"
        >
          <img
            ref="img"
            :src="src"
            alt=""
            draggable="false"
            class="absolute inset-0 size-full object-cover select-none"
            :style="{ objectPosition: `${pos.x}% ${pos.y}%` }"
          />
          <!-- Para que el nombre se lea sobre cualquier foto -->
          <div
            class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45 @2xl:from-black/20 @2xl:via-black/30 @2xl:to-black/75"
            aria-hidden="true"
          />
          <div
            v-if="editable"
            class="absolute inset-0 z-10 cursor-grab touch-none outline-none focus-visible:ring-4 focus-visible:ring-lime-400 focus-visible:ring-inset active:cursor-grabbing"
            tabindex="0"
            role="slider"
            aria-label="Encuadre de la portada: arrastra la foto o usa las flechas"
            :aria-valuetext="`horizontal ${pos.x}%, vertical ${pos.y}%`"
            @pointerdown="onDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onUp"
            @keydown="onKey"
          >
            <span
              class="pointer-events-none absolute top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold whitespace-nowrap backdrop-blur"
            >
              <Move class="size-4" aria-hidden="true" /> Arrastra para acomodar
              la foto
            </span>
          </div>
        </div>
        <!-- Debajo de la franja (celular): fondo con el color del equipo, oscurecido como el diseño de siempre -->
        <div
          class="absolute inset-x-0 top-[56.25cqw] bottom-0 bg-gradient-to-b from-black/45 to-black/65 @2xl:hidden"
          aria-hidden="true"
        />
      </template>
      <template v-else>
        <div
          class="absolute inset-0 bg-gradient-to-b from-black/25 to-black/65"
          aria-hidden="true"
        />
        <div
          class="absolute inset-y-0 right-0 w-1/3 opacity-25"
          :style="{
            background: `linear-gradient(110deg, transparent 30%, ${team.colors.secondary} 30.2%)`,
          }"
          aria-hidden="true"
        />
      </template>
      <!-- Con foto: en ancho, más alto para que la foto luzca; en celular, el escudo se monta sobre la franja -->
      <div
        class="relative mx-auto max-w-6xl px-4 pb-20 @2xl:px-6 @2xl:pb-24"
        :class="[
          src ? 'pt-0 @2xl:pt-52' : 'pt-8 @2xl:pt-12',
          editable && 'pointer-events-none',
        ]"
      >
        <div
          class="flex flex-col gap-5 @2xl:flex-row @2xl:items-end @2xl:gap-7"
        >
          <div
            class="w-fit rounded-3xl bg-white/95 p-3 shadow-lg"
            :class="src && '-mt-14 @2xl:mt-0'"
          >
            <TeamLogo :team="team" size="xl" />
          </div>
          <div class="min-w-0 flex-1">
            <p
              class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-white/85"
            >
              <span
                class="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium"
              >
                <Shield class="size-3.5" aria-hidden="true" /> Perfil del equipo
              </span>
              <span
                v-if="team.city"
                class="inline-flex items-center gap-1 font-medium"
              >
                <MapPin class="size-4" aria-hidden="true" /> {{ team.city }}
              </span>
            </p>
            <h1
              class="display mt-2 text-[2.75rem] leading-[0.92] break-words @2xl:text-7xl"
            >
              {{ team.name }}
            </h1>
          </div>
        </div>

        <div class="mt-6">
          <p class="eyebrow text-white/70">
            {{
              current.length > 1
                ? `Compite actualmente en ${current.length} torneos`
                : "Compite actualmente en"
            }}
          </p>
          <ul
            v-if="current.length"
            class="mt-2 grid gap-2 @2xl:flex @2xl:flex-wrap"
          >
            <li
              v-for="c in current"
              :key="c.tournament.id"
              class="flex min-w-0 items-center justify-between gap-4 rounded-2xl bg-black/20 px-4 py-2.5 ring-1 ring-white/15 backdrop-blur @2xl:max-w-sm"
            >
              <RouterLink
                :to="{ name: 'tournament', params: { id: c.tournament.id } }"
                class="min-w-0 font-semibold break-words hover:underline"
              >
                {{ c.tournament.name }}
              </RouterLink>
              <span
                v-if="c.standing"
                class="tabular shrink-0 text-sm text-white/85"
              >
                <span class="font-display text-lg font-bold text-white"
                  >{{ c.standing.position }}º</span
                >
                de {{ c.standing.teams }}
              </span>
              <!-- Un equipo puede tener partidos aunque aún no tenga posición. -->
              <span v-else class="shrink-0 text-xs text-white/70">{{
                c.record.played
                  ? `${c.record.played} PJ`
                  : c.tournament.status === "draft"
                    ? "Por empezar"
                    : "Sin partidos aún"
              }}</span>
            </li>
          </ul>
          <p v-else class="mt-1 text-sm text-white/75">Sin torneos en curso.</p>
        </div>
      </div>
    </section>
  </div>
</template>
