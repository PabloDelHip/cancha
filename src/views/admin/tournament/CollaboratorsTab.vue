<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Copy, Link2, Mail, MessageCircle, Server, Trash2, UserPlus, UsersRound } from 'lucide-vue-next'
import type { CollaboratorRole, Collaborators, OwnerInvitation } from '@/types'
import { collaboratorService, COLLABORATORS_REQUIRE_SERVER, getErrorMessage, USE_MOCKS } from '@/services'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useTournamentWorkspace } from '@/composables/useTournamentWorkspace'
import { COLLABORATOR_ROLES, ROLE_LABEL } from '@/utils/labels'
import { formatDate, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'

/**
 * Colaboradores del torneo (solo el propietario). Se suman aceptando una invitación: un enlace de
 * un solo uso para compartir (WhatsApp) o una invitación al correo de su cuenta. El rol queda fijo
 * en la invitación; después el propietario puede cambiarlo o revocar el acceso.
 */
const props = defineProps<{ id: string }>()
const { tournament } = useTournamentWorkspace(() => props.id)
const { confirm } = useConfirm()
const toast = useToast()

const data = ref<Collaborators | null>(null)
const invitations = ref<OwnerInvitation[]>([])
const loading = ref(true)
const error = ref('')
const busy = ref(false)
const form = reactive<{ kind: 'LINK' | 'ACCOUNT'; role: CollaboratorRole; email: string }>({ kind: 'LINK', role: 'SCORER', email: '' })
/** Enlace recién creado: el token solo se puede mostrar ahora (se guarda cifrado). */
const fresh = ref<{ url: string; role: CollaboratorRole } | null>(null)

async function load() {
  if (USE_MOCKS) return
  loading.value = true
  error.value = ''
  try {
    ;[data.value, invitations.value] = await Promise.all([collaboratorService.members(props.id), collaboratorService.invitations(props.id)])
  } catch (e) {
    error.value = getErrorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => props.id, load, { immediate: true })

const roleLabel = (r: CollaboratorRole) => ROLE_LABEL[r]
const when = (iso: string) => formatDate(toISODate(new Date(iso)))
const whatsapp = computed(() =>
  fresh.value
    ? `https://wa.me/?text=${encodeURIComponent(`Te invito a colaborar como ${roleLabel(fresh.value.role)} en ${tournament.value?.name ?? 'mi torneo'}: ${fresh.value.url}`)}`
    : '',
)

async function invite() {
  busy.value = true
  try {
    if (form.kind === 'LINK') {
      const created = await collaboratorService.invite(props.id, { kind: 'LINK', role: form.role })
      fresh.value = { url: `${window.location.origin}/invite/${created.token}`, role: form.role }
      toast.success('Enlace listo. Cópialo o compártelo ahora: después no se vuelve a mostrar.')
    } else {
      await collaboratorService.invite(props.id, { kind: 'ACCOUNT', role: form.role, email: form.email.trim() })
      // Mismo mensaje exista o no la cuenta: no se revela quién está registrado.
      toast.success('Invitación enviada. Si ese correo tiene (o crea) una cuenta, la verá en su panel.')
      form.email = ''
    }
    invitations.value = await collaboratorService.invitations(props.id)
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = false
  }
}

async function copy() {
  if (!fresh.value) return
  try {
    await navigator.clipboard.writeText(fresh.value.url)
    toast.success('Enlace copiado')
  } catch {
    toast.error('No se pudo copiar: selecciona el enlace y cópialo a mano.')
  }
}

async function changeRole(userId: string, role: CollaboratorRole) {
  try {
    data.value = await collaboratorService.changeRole(props.id, userId, role)
    toast.success('Rol actualizado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
    await load()
  }
}
async function revokeMember(userId: string, name: string | null) {
  const ok = await confirm({ title: `¿Quitar el acceso a ${name ?? 'este colaborador'}?`, message: 'Deja de ver y administrar el torneo de inmediato.', confirmLabel: 'Quitar acceso', tone: 'danger' })
  if (!ok) return
  try {
    data.value = await collaboratorService.revokeMember(props.id, userId)
    toast.success('Acceso revocado.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
async function revokeInvitation(inv: OwnerInvitation) {
  try {
    invitations.value = await collaboratorService.revokeInvitation(props.id, inv.id)
    toast.success('Invitación revocada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  }
}
</script>

<template>
  <div>
    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${COLLABORATORS_REQUIRE_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="load" />
    <div v-else-if="data" class="space-y-8">
      <!-- Invitar -->
      <section aria-labelledby="invite-title" class="card p-4">
        <h2 id="invite-title" class="text-lg font-bold">Invitar a colaborar</h2>
        <p class="mb-4 text-sm text-zinc-500">{{ data.members.length }} de {{ data.limit }} colaboradores. Cada invitación vence en 7 días y sirve una sola vez.</p>
        <form class="space-y-4" @submit.prevent="invite">
          <div role="radiogroup" aria-label="Tipo de invitación" class="flex flex-wrap gap-2">
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold has-[:checked]:border-pitch-700 has-[:checked]:bg-pitch-50">
              <input v-model="form.kind" type="radio" value="LINK" class="accent-pitch-700" /> <Link2 class="size-4" aria-hidden="true" /> Enlace para compartir
            </label>
            <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold has-[:checked]:border-pitch-700 has-[:checked]:bg-pitch-50">
              <input v-model="form.kind" type="radio" value="ACCOUNT" class="accent-pitch-700" /> <Mail class="size-4" aria-hidden="true" /> Al correo de su cuenta
            </label>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField id="inv-role" label="Rol">
              <select id="inv-role" v-model="form.role" class="input">
                <option v-for="r in COLLABORATOR_ROLES" :key="r.value" :value="r.value">{{ r.label }} — {{ r.description }}</option>
              </select>
            </FormField>
            <FormField v-if="form.kind === 'ACCOUNT'" id="inv-email" label="Correo" hint="No se envía ningún correo: lo verá en su panel al entrar.">
              <input id="inv-email" v-model="form.email" type="email" class="input" required maxlength="254" />
            </FormField>
          </div>
          <div class="flex justify-end">
            <AppButton type="submit" :loading="busy" :disabled="form.kind === 'ACCOUNT' && !form.email.trim()"><UserPlus class="size-4" aria-hidden="true" /> {{ form.kind === 'LINK' ? 'Crear enlace' : 'Invitar' }}</AppButton>
          </div>
        </form>
        <div v-if="fresh" class="mt-4 space-y-2 rounded-xl border border-pitch-200 bg-pitch-50 p-3" role="status">
          <p class="text-sm font-semibold text-pitch-900">Enlace para {{ roleLabel(fresh.role) }} (solo se muestra ahora)</p>
          <label class="sr-only" for="inv-link">Enlace de invitación</label>
          <input id="inv-link" :value="fresh.url" readonly class="input font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
          <div class="flex flex-wrap gap-2">
            <AppButton size="sm" @click="copy"><Copy class="size-4" aria-hidden="true" /> Copiar</AppButton>
            <a :href="whatsapp" target="_blank" rel="noopener" class="btn btn-secondary btn-sm"><MessageCircle class="size-4" aria-hidden="true" /> Compartir por WhatsApp</a>
          </div>
        </div>
      </section>

      <!-- Colaboradores -->
      <section aria-labelledby="members-title">
        <h2 id="members-title" class="mb-3 text-lg font-bold">Colaboradores</h2>
        <ul class="card divide-y divide-zinc-100">
          <li class="flex flex-wrap items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-zinc-900">{{ data.owner.name }}</p>
              <p class="text-xs text-zinc-500">{{ data.owner.email }}</p>
            </div>
            <StatusBadge label="Propietario" tone="green" />
          </li>
          <li v-for="m in data.members" :key="m.userId" class="flex flex-wrap items-center gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-zinc-900">{{ m.name }}</p>
              <p class="text-xs text-zinc-500">{{ m.email }} · desde {{ when(m.since) }}</p>
            </div>
            <label class="sr-only" :for="`role-${m.userId}`">Rol de {{ m.name }}</label>
            <select :id="`role-${m.userId}`" class="input w-44" :value="m.role" @change="changeRole(m.userId, ($event.target as HTMLSelectElement).value as CollaboratorRole)">
              <option v-for="r in COLLABORATOR_ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
            </select>
            <AppButton variant="ghost" size="sm" class="text-red-700" :aria-label="`Quitar el acceso a ${m.name}`" @click="revokeMember(m.userId, m.name)"><Trash2 class="size-4" aria-hidden="true" /></AppButton>
          </li>
        </ul>
        <EmptyState v-if="!data.members.length" :icon="UsersRound" title="Aún no hay colaboradores" description="Invita a quien te ayuda con el calendario, los árbitros o la captura de resultados." class="card mt-2" compact />
      </section>

      <!-- Invitaciones pendientes -->
      <section v-if="invitations.length" aria-labelledby="pending-title">
        <h2 id="pending-title" class="mb-3 text-lg font-bold">Invitaciones pendientes</h2>
        <ul class="card divide-y divide-zinc-100">
          <li v-for="inv in invitations" :key="inv.id" class="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <component :is="inv.kind === 'LINK' ? Link2 : Mail" class="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-zinc-900">{{ inv.kind === 'LINK' ? 'Enlace' : inv.email }} · {{ roleLabel(inv.role) }}</p>
              <p class="text-xs text-zinc-500">Creada el {{ when(inv.createdAt) }} · vence el {{ when(inv.expiresAt) }}</p>
            </div>
            <StatusBadge v-if="inv.status === 'EXPIRED'" label="Vencida" tone="neutral" />
            <AppButton variant="ghost" size="sm" class="text-red-700" @click="revokeInvitation(inv)">Revocar</AppButton>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
