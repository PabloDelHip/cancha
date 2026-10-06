<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Camera, ImagePlus, Trash2 } from 'lucide-vue-next'
import type { UploadProgress } from '@/types'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { pickProblem, uploadErrorMessage, PICKABLE_IMAGE_TYPES } from '@/utils/imageFile'
import AppButton from '@/components/common/AppButton.vue'
import ImageCropDialog from './ImageCropDialog.vue'

/**
 * Foto de jugador / logo de equipo. Elegir (o arrastrar) → encuadrar → subir. La URL la genera el
 * servidor al guardar en Cloudinary: nunca se escribe a mano.
 *
 * - Con `upload` (ficha existente): se sube al confirmar el encuadre, con progreso; `remove` la quita.
 * - Sin `upload` (ficha nueva, aún sin id): la imagen recortada queda en `v-model:draft` y quien crea
 *   la ficha la sube después de crearla.
 */
const props = withDefaults(
  defineProps<{
    shape: 'circle' | 'square'
    currentUrl: string | null | undefined
    title: string
    /** Lado máximo de la imagen subida (px). */
    size: number
    upload?: (image: Blob, onProgress: UploadProgress) => Promise<unknown>
    remove?: () => Promise<unknown>
    disabled?: boolean
  }>(),
  { upload: undefined, remove: undefined, disabled: false },
)
const draft = defineModel<Blob | null>('draft', { default: null })
const toast = useToast()
const { confirm } = useConfirm()

const input = ref<HTMLInputElement | null>(null)
const cropSrc = ref<string | null>(null)
const progress = ref<number | null>(null)
const removing = ref(false)
const dragging = ref(false)
const busy = computed(() => progress.value !== null || removing.value)

// Vista previa local del borrador (ficha nueva).
const draftUrl = ref<string | null>(null)
watch(
  draft,
  (blob) => {
    if (draftUrl.value) URL.revokeObjectURL(draftUrl.value)
    draftUrl.value = blob ? URL.createObjectURL(blob) : null
  },
  { immediate: true },
)
// Tras subir, la versión optimizada tarda un instante en generarse en la CDN de Cloudinary: se sigue
// mostrando el recorte local hasta que la remota carga (sin hueco en blanco ni parpadeo).
const localPreview = ref<string | null>(null)
function dropLocalPreview() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = null
}
/** Cuando la URL remota carga (o falla), se suelta el recorte local. */
function swapWhenLoaded(url: string | null | undefined) {
  if (!localPreview.value) return
  if (!url) return dropLocalPreview()
  const img = new Image()
  img.onload = dropLocalPreview
  img.onerror = dropLocalPreview
  img.src = url
}
watch(() => props.currentUrl, swapWhenLoaded)
onBeforeUnmount(() => {
  if (draftUrl.value) URL.revokeObjectURL(draftUrl.value)
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  dropLocalPreview()
})

const shown = computed(() => draftUrl.value ?? localPreview.value ?? props.currentUrl ?? null)
const hasImage = computed(() => Boolean(shown.value))
const noun = computed(() => (props.shape === 'circle' ? 'foto' : 'logo'))
const rounded = computed(() => (props.shape === 'circle' ? 'rounded-full' : 'rounded-2xl'))

function choose() {
  if (!props.disabled && !busy.value) input.value?.click()
}
function take(file: File | undefined) {
  if (!file) return
  const problem = pickProblem(file)
  if (problem) {
    toast.error(problem)
    return
  }
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = URL.createObjectURL(file)
}
function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  take(el.files?.[0])
  el.value = '' // permite volver a elegir el mismo archivo
}
function onDrop(e: DragEvent) {
  dragging.value = false
  if (!props.disabled && !busy.value) take(e.dataTransfer?.files?.[0])
}
function closeCrop() {
  if (cropSrc.value) URL.revokeObjectURL(cropSrc.value)
  cropSrc.value = null
}

async function onCropped(image: Blob) {
  closeCrop()
  if (!props.upload) {
    draft.value = image
    return
  }
  progress.value = 0
  const before = props.currentUrl
  try {
    await props.upload(image, (p) => (progress.value = p))
    dropLocalPreview()
    localPreview.value = URL.createObjectURL(image)
    await nextTick() // las props del padre ya reflejan la URL nueva
    if (props.currentUrl !== before) swapWhenLoaded(props.currentUrl)
    toast.success(props.shape === 'circle' ? 'Foto actualizada.' : 'Logo actualizado.')
  } catch (e) {
    toast.error(uploadErrorMessage(e))
  } finally {
    progress.value = null
  }
}

async function onRemove() {
  if (!props.remove) {
    draft.value = null
    return
  }
  const ok = await confirm({
    title: props.shape === 'circle' ? '¿Quitar la foto?' : '¿Quitar el logo?',
    message: props.shape === 'circle' ? 'Se mostrarán sus iniciales en su lugar.' : 'Se mostrará el escudo generado con los colores del equipo.',
    confirmLabel: 'Quitar',
    tone: 'danger',
  })
  if (!ok) return
  removing.value = true
  try {
    await props.remove()
    toast.success(props.shape === 'circle' ? 'Foto quitada.' : 'Logo quitado.')
  } catch (e) {
    toast.error(uploadErrorMessage(e))
  } finally {
    removing.value = false
  }
}

const ring = 2 * Math.PI * 46 // círculo del indicador de progreso (r = 46 en un viewBox de 100)
</script>

<template>
  <div
    class="flex items-center gap-4 rounded-2xl border-2 border-dashed p-3 transition-colors sm:p-4"
    :class="dragging ? 'border-pitch-500 bg-pitch-50' : 'border-transparent'"
    @dragenter.prevent="dragging = !disabled"
    @dragover.prevent
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <button
      type="button"
      class="group relative size-24 shrink-0 overflow-hidden bg-zinc-100 ring-1 ring-zinc-200 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch-500 sm:size-28"
      :class="[rounded, disabled ? 'cursor-default' : 'cursor-pointer hover:ring-pitch-400']"
      :aria-label="hasImage ? `Cambiar ${noun}` : `Subir ${noun}`"
      :disabled="disabled || busy"
      @click="choose"
    >
      <img v-if="shown" :src="shown" :alt="title" class="size-full object-cover" :class="shape === 'square' && 'bg-white object-contain p-1'" />
      <div v-else class="grid size-full place-items-center"><slot name="fallback" /></div>
      <span
        v-if="!disabled && !busy"
        class="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        <Camera class="size-6" />
      </span>
      <span v-if="progress !== null" class="absolute inset-0 grid place-items-center bg-black/55 text-white" role="status" :aria-label="`Subiendo ${progress}%`">
        <svg viewBox="0 0 100 100" class="absolute inset-2 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(255 255 255 / 0.25)" stroke-width="6" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="#a3e635" stroke-width="6" stroke-linecap="round" :stroke-dasharray="ring" :stroke-dashoffset="ring * (1 - progress / 100)" class="transition-[stroke-dashoffset]" />
        </svg>
        <span class="tabular text-sm font-bold">{{ progress }}%</span>
      </span>
    </button>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-zinc-900">{{ title }}</p>
      <p class="mt-0.5 text-xs text-zinc-500">
        <template v-if="progress !== null">Subiendo…</template>
        <template v-else-if="draft">Lista para guardarse con la ficha.</template>
        <template v-else>JPG, PNG o WebP. Podrás encuadrarla antes de subirla.</template>
      </p>
      <div v-if="!disabled" class="mt-2 flex flex-wrap gap-2">
        <AppButton variant="secondary" size="sm" :disabled="busy" @click="choose">
          <ImagePlus class="size-4" aria-hidden="true" /> {{ hasImage ? `Cambiar ${noun}` : `Subir ${noun}` }}
        </AppButton>
        <AppButton v-if="hasImage && (remove || draft)" variant="ghost" size="sm" :loading="removing" :disabled="busy" @click="onRemove">
          <Trash2 class="size-4" aria-hidden="true" /> Quitar
        </AppButton>
      </div>
    </div>

    <input ref="input" type="file" class="sr-only" tabindex="-1" aria-hidden="true" :accept="PICKABLE_IMAGE_TYPES.join(',')" @change="onPick" />
    <ImageCropDialog
      :open="cropSrc !== null"
      :src="cropSrc"
      :shape="shape"
      :size="size"
      :title="shape === 'circle' ? 'Encuadra la foto' : 'Encuadra el logo'"
      :confirm-label="upload ? (shape === 'circle' ? 'Guardar foto' : 'Guardar logo') : 'Usar imagen'"
      @close="closeCrop"
      @confirm="onCropped"
    />
  </div>
</template>
