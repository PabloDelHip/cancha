<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ExternalLink, MapPin, Medal, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import type { LeagueSummary } from '@/types'
import { getErrorMessage, leagueService } from '@/services'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import FormField from '@/components/common/FormField.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

/**
 * Mis ligas: cada liga agrupa mis torneos (Apertura, Clausura, copas…) y construye su histórico.
 * Primero se crea la liga; luego, sus torneos. Solo se borra una liga vacía.
 */
const leagues = ref<LeagueSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const { confirm } = useConfirm()
const toast = useToast()

async function load() {
  loading.value = true
  error.value = null
  try {
    leagues.value = await leagueService.mine()
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

// ─── Crear / editar ─────────────────────────────────────────────────────────
const dialog = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ name: '', city: '', description: '' })
const saving = ref(false)
const formError = ref<string | null>(null)
function open(l?: LeagueSummary) {
  editingId.value = l?.id ?? null
  form.name = l?.name ?? ''
  form.city = l?.city ?? ''
  form.description = l?.description ?? ''
  formError.value = null
  dialog.value = true
}
async function save() {
  if (form.name.trim().length < 3) {
    formError.value = 'Escribe un nombre de al menos 3 caracteres.'
    return
  }
  saving.value = true
  formError.value = null
  const input = { name: form.name.trim(), city: form.city.trim() || null, description: form.description.trim() || null }
  try {
    if (editingId.value) await leagueService.update(editingId.value, input)
    else await leagueService.create(input)
    toast.success(editingId.value ? 'Liga actualizada.' : 'Liga creada. Ahora crea su primer torneo.')
    dialog.value = false
    await load()
  } catch (e) {
    formError.value = getErrorMessage(e)
  } finally {
    saving.value = false
  }
}
async function remove(l: LeagueSummary) {
  const ok = await confirm({ title: `¿Borrar ${l.name}?`, message: 'La liga está vacía; no se borra ningún torneo.', confirmLabel: 'Borrar liga', tone: 'danger' })
  if (!ok) return
  try {
    await leagueService.remove(l.id)
    toast.success('Liga borrada.')
    await load()
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <PageHeader eyebrow="Panel del organizador" title="Mis ligas" subtitle="Cada liga reúne sus torneos (Apertura, Clausura, copas…) y su historia.">
      <template #actions>
        <AppButton @click="open()"><Plus class="size-4" aria-hidden="true" /> Nueva liga</AppButton>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <ul v-else-if="leagues.length" class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <li v-for="l in leagues" :key="l.id" class="card flex flex-col gap-3 p-5">
        <div class="flex items-start gap-3">
          <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-pitch-950 text-lime-300"><Medal class="size-6" aria-hidden="true" /></span>
          <div class="min-w-0 flex-1">
            <p class="display text-2xl leading-tight break-words text-zinc-950">{{ l.name }}</p>
            <p class="flex flex-wrap items-center gap-x-3 text-sm text-zinc-500">
              <span>{{ l.tournaments }} {{ l.tournaments === 1 ? 'torneo' : 'torneos' }}</span>
              <span v-if="l.city" class="inline-flex items-center gap-1"><MapPin class="size-3.5" aria-hidden="true" /> {{ l.city }}</span>
            </p>
            <p v-if="l.isDefault" class="mt-1 text-xs text-amber-700">Creada automáticamente con tus torneos anteriores: cámbiale el nombre.</p>
          </div>
        </div>
        <p v-if="l.description" class="text-sm text-zinc-600">{{ l.description }}</p>
        <div class="mt-auto flex flex-wrap gap-2">
          <AppButton :to="{ name: 'admin-tournaments', query: { new: '1', league: l.id } }" size="sm"><Plus class="size-4" aria-hidden="true" /> Nuevo torneo</AppButton>
          <AppButton :to="{ name: 'league', params: { id: l.id } }" variant="secondary" size="sm"><ExternalLink class="size-4" aria-hidden="true" /> Ver liga</AppButton>
          <AppButton variant="ghost" size="sm" @click="open(l)"><Pencil class="size-4" aria-hidden="true" /> Editar</AppButton>
          <AppButton v-if="!l.tournaments" variant="ghost" size="sm" class="text-red-700" @click="remove(l)"><Trash2 class="size-4" aria-hidden="true" /> Borrar</AppButton>
        </div>
      </li>
    </ul>
    <EmptyState v-else :icon="Medal" title="Crea tu primera liga" description="Primero la liga; después sus torneos (Apertura, Clausura, copas…). Todo suma a su historia." class="card">
      <AppButton @click="open()"><Plus class="size-4" aria-hidden="true" /> Nueva liga</AppButton>
    </EmptyState>

    <BaseModal :open="dialog" :title="editingId ? 'Editar liga' : 'Nueva liga'" description="El nombre con el que se conoce tu liga." @close="saving || (dialog = false)">
      <form id="league-form" class="space-y-4" @submit.prevent="save">
        <FormField id="lg-name" label="Nombre" required>
          <input id="lg-name" v-model="form.name" class="input" placeholder="Liga Fut 7 Cancún" maxlength="80" autofocus />
        </FormField>
        <FormField id="lg-city" label="Ciudad" hint="Opcional">
          <input id="lg-city" v-model="form.city" class="input" placeholder="Cancún, Q. Roo" maxlength="80" />
        </FormField>
        <FormField id="lg-desc" label="Descripción" hint="Opcional">
          <textarea id="lg-desc" v-model="form.description" class="input min-h-24" maxlength="500" placeholder="Liga amateur de fútbol 7 desde 2022…" />
        </FormField>
        <p v-if="formError" class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="dialog = false">Cancelar</AppButton>
        <AppButton type="submit" form="league-form" :loading="saving">{{ editingId ? 'Guardar' : 'Crear liga' }}</AppButton>
      </template>
    </BaseModal>
  </div>
</template>
