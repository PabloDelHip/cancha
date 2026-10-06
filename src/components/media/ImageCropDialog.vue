<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { Cropper, CircleStencil, RectangleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { RotateCw, ZoomIn, ZoomOut, Undo2 } from 'lucide-vue-next'
import BaseModal from '@/components/common/BaseModal.vue'
import AppButton from '@/components/common/AppButton.vue'
import { exportSquare } from '@/utils/imageFile'

/**
 * Encuadre de la imagen antes de subirla: arrastra para mover, rueda/pellizco o botones para el zoom,
 * giro de 90°. Círculo para fotos de jugador, cuadrado para logos. Emite la imagen ya recortada y
 * comprimida (como mucho `size` px).
 */
const props = defineProps<{ open: boolean; src: string | null; shape: 'circle' | 'square'; size: number; title: string; confirmLabel: string }>()
const emit = defineEmits<{ close: []; confirm: [image: Blob] }>()

const cropper = shallowRef<InstanceType<typeof Cropper> | null>(null)
const working = ref(false)
const error = ref('')
/** La imagen tarda en decodificarse: hasta entonces no hay recorte que confirmar. */
const ready = ref(false)
watch(
  () => props.src,
  () => {
    ready.value = false
    error.value = ''
  },
)
function onError() {
  error.value = 'No pudimos abrir esta imagen. Prueba con otra (JPG, PNG o WebP).'
}

async function confirm() {
  const canvas = cropper.value?.getResult().canvas
  if (!canvas) {
    error.value = 'La imagen aún se está cargando. Inténtalo de nuevo en un momento.'
    return
  }
  working.value = true
  error.value = ''
  try {
    emit('confirm', await exportSquare(canvas, props.size, props.shape === 'circle' ? 'photo' : 'logo'))
  } catch {
    error.value = 'No pudimos procesar la imagen. Prueba con otra.'
  } finally {
    working.value = false
  }
}

/** Encuadre inicial: el mayor cuadrado centrado. */
const defaultSize = ({ imageSize }: { imageSize: { width: number; height: number } }) => {
  const side = Math.min(imageSize.width, imageSize.height)
  return { width: side, height: side }
}
</script>

<template>
  <BaseModal :open="open" :title="title" description="Arrastra para encuadrar y usa el zoom para ajustar." @close="working || emit('close')">
    <div class="-mx-5 -mt-5 bg-zinc-950">
      <Cropper
        v-if="src"
        ref="cropper"
        class="h-[55vh] max-h-[26rem] min-h-64"
        :src="src"
        :stencil-component="shape === 'circle' ? CircleStencil : RectangleStencil"
        :stencil-props="{ aspectRatio: 1, movable: true, resizable: true }"
        :default-size="defaultSize"
        image-restriction="stencil"
        :canvas="{ maxWidth: 2048, maxHeight: 2048, imageSmoothingQuality: 'high' }"
        background-class="bg-zinc-950"
        @ready="ready = true"
        @error="onError"
      />
    </div>
    <div class="mt-4 flex items-center justify-center gap-2" role="toolbar" aria-label="Ajustes del encuadre">
      <AppButton variant="secondary" size="sm" icon aria-label="Alejar" @click="cropper?.zoom(0.8)"><ZoomOut class="size-4" aria-hidden="true" /></AppButton>
      <AppButton variant="secondary" size="sm" icon aria-label="Acercar" @click="cropper?.zoom(1.25)"><ZoomIn class="size-4" aria-hidden="true" /></AppButton>
      <AppButton variant="secondary" size="sm" icon aria-label="Girar 90 grados" @click="cropper?.rotate(90)"><RotateCw class="size-4" aria-hidden="true" /></AppButton>
      <AppButton variant="ghost" size="sm" @click="cropper?.reset()"><Undo2 class="size-4" aria-hidden="true" /> Restablecer</AppButton>
    </div>
    <p v-if="error" class="mt-3 text-center text-sm text-red-600" role="alert">{{ error }}</p>

    <template #footer>
      <AppButton variant="secondary" :disabled="working" @click="emit('close')">Cancelar</AppButton>
      <AppButton :loading="working || (!ready && !error)" :disabled="!ready" @click="confirm">{{ confirmLabel }}</AppButton>
    </template>
  </BaseModal>
</template>
