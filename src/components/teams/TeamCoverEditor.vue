<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ImagePlus, Monitor, Move, Smartphone, Trash2 } from 'lucide-vue-next'
import type { CoverPosition, Team, TeamCompetition } from '@/types'
import { teamService } from '@/services'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { downscale, pickProblem, uploadErrorMessage, PICKABLE_IMAGE_TYPES } from '@/utils/imageFile'
import AppButton from '@/components/common/AppButton.vue'
import TeamHero from '@/components/teams/profile/TeamHero.vue'

/**
 * Portada del perfil del equipo, como en Facebook: se sube una foto y se arrastra para elegir qué
 * parte se ve. La vista previa es el encabezado real del perfil, al ancho de un escritorio o de un
 * celular, para que el encuadre sea exactamente el que verá la gente. Sin foto: el diseño de siempre.
 */
const props = defineProps<{ team: Team }>()
const emit = defineEmits<{ changed: [team: Team] }>()
const toast = useToast()
const { confirm } = useConfirm()

const current = ref<TeamCompetition[]>([])
onMounted(async () => {
  try {
    current.value = (await teamService.profile(props.team.id)).competitions.filter((c) => c.current)
  } catch {
    current.value = [] // la vista previa funciona igual sin sus torneos
  }
})

const editing = ref(false)
const position = ref<CoverPosition>({ ...(props.team.coverPosition ?? { x: 50, y: 50 }) })
watch(
  () => props.team.coverPosition,
  (p) => {
    if (!editing.value) position.value = { ...(p ?? { x: 50, y: 50 }) }
  },
)
const progress = ref<number | null>(null)
const saving = ref(false)
const busy = computed(() => progress.value !== null || saving.value)
const hero = computed(() => ({ ...props.team, city: props.team.city ?? null }))

// Vista previa a escala: el perfil se dibuja a su ancho real y se reduce para caber aquí.
const device = ref<'desktop' | 'phone'>('desktop')
const WIDTH = { desktop: 1280, phone: 390 } as const
const frame = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
const frameWidth = ref(0)
const innerHeight = ref(0)
const scale = computed(() => (frameWidth.value ? Math.min(1, frameWidth.value / WIDTH[device.value]) : 1))
let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(() => {
    frameWidth.value = frame.value?.clientWidth ?? 0
    innerHeight.value = inner.value?.offsetHeight ?? 0
  })
  if (frame.value) observer.observe(frame.value)
  if (inner.value) observer.observe(inner.value)
})
onBeforeUnmount(() => observer?.disconnect())

const input = ref<HTMLInputElement | null>(null)
async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  const problem = pickProblem(file)
  if (problem) return toast.error(problem)
  progress.value = 0
  try {
    const updated = await teamService.uploadCover(props.team.id, await downscale(file, 1920), (p) => (progress.value = p))
    emit('changed', updated)
    position.value = { x: 50, y: 50 }
    editing.value = true // como en Facebook: recién subida, a acomodarla
    toast.success('Foto subida. Arrástrala para acomodarla y guarda.')
  } catch (err) {
    toast.error(uploadErrorMessage(err))
  } finally {
    progress.value = null
  }
}

async function savePosition() {
  saving.value = true
  try {
    emit('changed', await teamService.setCoverPosition(props.team.id, position.value))
    editing.value = false
    toast.success('Portada guardada.')
  } catch (err) {
    toast.error(uploadErrorMessage(err))
  } finally {
    saving.value = false
  }
}
function cancel() {
  position.value = { ...(props.team.coverPosition ?? { x: 50, y: 50 }) }
  editing.value = false
}
async function removeCover() {
  const ok = await confirm({
    title: '¿Quitar la foto de portada?',
    message: 'El perfil volverá a mostrar la portada con los colores del equipo.',
    confirmLabel: 'Quitar portada',
    tone: 'danger',
  })
  if (!ok) return
  saving.value = true
  try {
    emit('changed', await teamService.removeCover(props.team.id))
    editing.value = false
    toast.success('Portada quitada.')
  } catch (err) {
    toast.error(uploadErrorMessage(err))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div role="radiogroup" aria-label="Vista previa" class="inline-flex rounded-xl bg-zinc-100 p-1">
        <button
          v-for="d in (['desktop', 'phone'] as const)"
          :key="d"
          type="button"
          role="radio"
          :aria-checked="device === d"
          class="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition"
          :class="device === d ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'"
          @click="device = d"
        >
          <component :is="d === 'desktop' ? Monitor : Smartphone" class="size-4" aria-hidden="true" />
          {{ d === 'desktop' ? 'Computadora' : 'Celular' }}
        </button>
      </div>
      <p v-if="team.coverUrl && !editing" class="text-xs text-zinc-500">Así se ve en el perfil público.</p>
    </div>

    <!-- Vista previa a escala real -->
    <div ref="frame" class="overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200" :class="device === 'phone' && 'mx-auto max-w-[390px]'">
      <div :style="{ height: `${innerHeight * scale}px` }">
        <div ref="inner" :style="{ width: `${WIDTH[device]}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }">
          <TeamHero v-model:position="position" :team="hero" :current="current" :editable="editing && !busy" />
        </div>
      </div>
    </div>

    <p v-if="progress !== null" class="mt-2 text-sm font-semibold text-pitch-700" role="status">Subiendo foto… {{ progress }}%</p>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <template v-if="editing">
        <AppButton :loading="saving" @click="savePosition">Guardar portada</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="cancel">Cancelar</AppButton>
        <span class="text-xs text-zinc-500">Revisa también cómo queda en celular antes de guardar.</span>
      </template>
      <template v-else>
        <AppButton :variant="team.coverUrl ? 'secondary' : 'primary'" :disabled="busy" @click="input?.click()">
          <ImagePlus class="size-4" aria-hidden="true" /> {{ team.coverUrl ? 'Cambiar foto' : 'Subir foto de portada' }}
        </AppButton>
        <template v-if="team.coverUrl">
          <AppButton variant="secondary" :disabled="busy" @click="editing = true"><Move class="size-4" aria-hidden="true" /> Acomodar</AppButton>
          <AppButton variant="ghost" :disabled="busy" @click="removeCover"><Trash2 class="size-4" aria-hidden="true" /> Quitar</AppButton>
        </template>
        <span v-else class="text-xs text-zinc-500">Opcional. Sin foto, el perfil usa los colores del equipo. Ideal: foto horizontal del equipo.</span>
      </template>
    </div>
    <input ref="input" type="file" class="sr-only" :accept="PICKABLE_IMAGE_TYPES.join(',')" tabindex="-1" aria-hidden="true" @change="onPick" />
  </div>
</template>
