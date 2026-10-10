<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Camera, ImageOff, Trash2, Upload } from 'lucide-vue-next'
import type { EvidenceKind, MatchEvidence } from '@/types'
import { getErrorMessage, sheetService } from '@/services'
import { useToast } from '@/composables/useToast'
import { EVIDENCE_KIND, EVIDENCE_KINDS, ROLE_LABEL } from '@/utils/labels'
import { formatDate, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FormField from '@/components/common/FormField.vue'

/**
 * Fotografías de evidencia del partido (2D): cédula arbitral, alineaciones, incidencias, marcador.
 * Son privadas: cada miniatura usa una URL temporal (5 min) que da el servidor tras comprobar
 * permisos. Subir es opcional y nunca es requisito para cerrar la ficha.
 *
 * Reintentos: cada foto elegida recibe una clave de subida única; si la red falla y se reintenta,
 * el servidor reconoce la clave y no la duplica.
 */
const MAX_BYTES = 8 * 1024 * 1024
const props = defineProps<{ matchId: string; evidence: MatchEvidence[]; users?: Record<string, string>; canUpload: boolean; canRemove: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const active = computed(() => props.evidence.filter((e) => e.status === 'ACTIVE'))
const removed = computed(() => props.evidence.filter((e) => e.status === 'REMOVED'))
const urls = reactive(new Map<string, string>())
const broken = reactive(new Set<string>())
async function loadUrls() {
  await Promise.all(
    active.value.filter((e) => !urls.has(e.id)).map(async (e) => {
      try {
        urls.set(e.id, (await sheetService.evidenceUrl(props.matchId, e.id)).url)
      } catch {
        broken.add(e.id)
      }
    }),
  )
}
watch(() => props.evidence, loadUrls, { immediate: true })

// ─── Subida ────────────────────────────────────────────────────────────────
const form = reactive<{ file: File | null; kind: EvidenceKind; description: string; key: string }>({ file: null, kind: 'REFEREE_REPORT', description: '', key: '' })
const progress = ref<number | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null
  if (file && file.size > MAX_BYTES) {
    toast.error('La fotografía supera 8 MB.')
    form.file = null
    return
  }
  form.file = file
  // Una clave por foto elegida: reintentar la misma no la duplica.
  form.key = crypto.randomUUID().replace(/-/g, '')
}
async function upload() {
  if (!form.file) return toast.error('Elige o toma una fotografía.')
  progress.value = 0
  try {
    const res = await sheetService.uploadEvidence(props.matchId, { file: form.file, kind: form.kind, description: form.description, uploadKey: form.key }, (p) => (progress.value = p))
    toast.success(res.duplicate ? 'La fotografía ya estaba guardada.' : 'Fotografía guardada.')
    Object.assign(form, { file: null, description: '', key: '' })
    if (fileInput.value) fileInput.value.value = ''
    emit('changed')
  } catch (e) {
    toast.error(`${getErrorMessage(e)} Puedes reintentar: no se duplicará.`)
  } finally {
    progress.value = null
  }
}

// ─── Ver y retirar ─────────────────────────────────────────────────────────
const viewing = ref<MatchEvidence | null>(null)
async function open(e: MatchEvidence) {
  viewing.value = e
  try {
    // URL nueva al ampliar: la de la miniatura pudo vencer.
    urls.set(e.id, (await sheetService.evidenceUrl(props.matchId, e.id)).url)
  } catch (err) {
    toast.error(getErrorMessage(err))
  }
}
const removing = reactive<{ id: string | null; reason: string; busy: boolean }>({ id: null, reason: '', busy: false })
async function remove() {
  if (!removing.id) return
  if (removing.reason.trim().length < 3) return toast.error('Indica el motivo para retirarla.')
  removing.busy = true
  try {
    await sheetService.removeEvidence(props.matchId, removing.id, removing.reason.trim())
    toast.success('Fotografía retirada. El registro se conserva en el historial.')
    Object.assign(removing, { id: null, reason: '' })
    viewing.value = null
    emit('changed')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    removing.busy = false
  }
}
const when = (iso: string) => {
  const d = new Date(iso)
  return `${formatDate(toISODate(d))} ${d.toTimeString().slice(0, 5)}`
}
const who = (id: string, role: string | null) => `${props.users?.[id] ?? 'Alguien'}${role ? ` (${ROLE_LABEL[role as keyof typeof ROLE_LABEL] ?? role})` : ''}`
</script>

<template>
  <div class="space-y-4">
    <ul v-if="active.length" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="e in active" :key="e.id">
        <button type="button" class="group block w-full overflow-hidden rounded-xl border border-zinc-200 text-left focus-visible:outline-2 focus-visible:outline-pitch-500" @click="open(e)">
          <div class="flex aspect-[4/3] items-center justify-center bg-zinc-100">
            <img v-if="urls.get(e.id) && !broken.has(e.id)" :src="urls.get(e.id)" :alt="`${EVIDENCE_KIND[e.kind]}${e.description ? `: ${e.description}` : ''}`" class="size-full object-cover transition group-hover:scale-105" loading="lazy" @error="broken.add(e.id)" />
            <ImageOff v-else class="size-6 text-zinc-400" aria-hidden="true" />
          </div>
          <p class="truncate px-2 pt-1.5 text-xs font-semibold text-zinc-900">{{ EVIDENCE_KIND[e.kind] }}</p>
          <p class="truncate px-2 pb-1.5 text-[11px] text-zinc-500">{{ e.description || when(e.createdAt) }}</p>
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-zinc-500">Sin fotografías. Son opcionales.</p>

    <form v-if="canUpload" class="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 p-3 sm:grid-cols-[minmax(0,1fr)_12rem]" @submit.prevent="upload">
      <FormField id="ev-file" label="Fotografía" hint="JPG, PNG o WebP · hasta 8 MB">
        <input id="ev-file" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="input py-1.5 text-sm" @change="pick" />
      </FormField>
      <FormField id="ev-kind" label="Tipo">
        <select id="ev-kind" v-model="form.kind" class="input">
          <option v-for="k in EVIDENCE_KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
      </FormField>
      <FormField id="ev-desc" label="Descripción" hint="Opcional" class="sm:col-span-2">
        <input id="ev-desc" v-model="form.description" class="input" maxlength="300" placeholder="Ej. cédula firmada por el árbitro central" />
      </FormField>
      <div class="flex items-center justify-end gap-3 sm:col-span-2">
        <span v-if="progress !== null" class="text-xs text-zinc-500" aria-live="polite">Subiendo… {{ progress }}%</span>
        <AppButton type="submit" :loading="progress !== null" :disabled="!form.file"><Upload class="size-4" aria-hidden="true" /> Subir fotografía</AppButton>
      </div>
    </form>

    <details v-if="removed.length" class="text-xs text-zinc-500">
      <summary class="cursor-pointer font-semibold">{{ removed.length }} retirada{{ removed.length === 1 ? '' : 's' }}</summary>
      <ul class="mt-1 space-y-0.5">
        <li v-for="e in removed" :key="e.id">{{ EVIDENCE_KIND[e.kind] }} · retirada por {{ who(e.removed!.by, e.removed!.role) }} el {{ when(e.removed!.at) }}: {{ e.removed!.reason }}</li>
      </ul>
    </details>

    <BaseModal :open="!!viewing" :title="viewing ? EVIDENCE_KIND[viewing.kind] : 'Fotografía'" :description="viewing ? `${viewing.description ? `${viewing.description} · ` : ''}subida por ${who(viewing.uploadedBy, viewing.uploadedRole)} el ${when(viewing.createdAt)}` : undefined" size="lg" @close="removing.busy || ((viewing = null), (removing.id = null))">
      <div v-if="viewing" class="space-y-3">
        <img v-if="urls.get(viewing.id)" :src="urls.get(viewing.id)" :alt="EVIDENCE_KIND[viewing.kind]" class="max-h-[70vh] w-full rounded-xl bg-zinc-100 object-contain" />
        <form v-if="canRemove && removing.id === viewing.id" class="flex flex-wrap items-end gap-2 rounded-xl bg-red-50 p-3" @submit.prevent="remove">
          <FormField id="ev-remove" label="Motivo para retirarla" class="min-w-56 flex-1">
            <input id="ev-remove" v-model="removing.reason" class="input" maxlength="300" placeholder="Ej. es de otro partido" />
          </FormField>
          <AppButton variant="secondary" size="sm" @click="removing.id = null">Cancelar</AppButton>
          <AppButton type="submit" variant="danger" size="sm" :loading="removing.busy">Retirar</AppButton>
        </form>
      </div>
      <template #footer>
        <AppButton v-if="canRemove && viewing && removing.id !== viewing.id" variant="ghost" class="mr-auto text-red-700" @click="Object.assign(removing, { id: viewing.id, reason: '' })">
          <Trash2 class="size-4" aria-hidden="true" /> Retirar
        </AppButton>
        <AppButton variant="secondary" @click="viewing = null"><Camera class="size-4" aria-hidden="true" /> Cerrar</AppButton>
      </template>
    </BaseModal>
  </div>
</template>
