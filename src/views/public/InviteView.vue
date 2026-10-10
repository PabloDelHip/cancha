<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Server, ShieldCheck, UserPlus } from 'lucide-vue-next'
import type { ReceivedInvitation } from '@/types'
import { collaboratorService, COLLABORATORS_REQUIRE_SERVER, getErrorMessage, USE_MOCKS } from '@/services'
import { ensureAdminData } from '@/stores'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { COLLABORATOR_ROLES, ROLE_LABEL } from '@/utils/labels'
import { formatDate, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'

/**
 * Enlace de invitación a colaborar. Muestra torneo, rol y quién invita; para aceptar hay que
 * iniciar sesión o crear cuenta (y se vuelve aquí). Aceptar es de un solo uso y lo valida el
 * servidor: vencida, revocada o ya usada → mensaje claro.
 */
const props = defineProps<{ token: string }>()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const invitation = ref<ReceivedInvitation | null>(null)
const loading = ref(true)
const error = ref('')
const accepting = ref(false)

watch(
  () => props.token,
  async (token) => {
    if (USE_MOCKS) return
    loading.value = true
    error.value = ''
    try {
      invitation.value = await collaboratorService.preview(token)
    } catch {
      error.value = 'Este enlace de invitación no es válido. Pide uno nuevo al organizador.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const loginTo = computed(() => ({ name: 'login', query: { redirect: route.fullPath } }))
const registerTo = computed(() => ({ name: 'register', query: { redirect: route.fullPath } }))
const roleInfo = computed(() => COLLABORATOR_ROLES.find((r) => r.value === invitation.value?.role))
const STATUS_TEXT: Record<string, string> = {
  ACCEPTED: 'Esta invitación ya se usó.',
  REVOKED: 'El organizador revocó esta invitación.',
  DECLINED: 'Esta invitación fue rechazada.',
  EXPIRED: 'Esta invitación venció. Pide una nueva al organizador.',
}

async function accept() {
  accepting.value = true
  try {
    const { tournamentId } = await collaboratorService.acceptLink(props.token)
    await ensureAdminData(true)
    toast.success(`Listo: ya colaboras como ${ROLE_LABEL[invitation.value!.role]}.`)
    await router.replace({ name: 'admin-tournament', params: { id: tournamentId } })
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    accepting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg px-4 py-10">
    <EmptyState v-if="USE_MOCKS" :icon="Server" title="Requiere el servidor" :description="`${COLLABORATORS_REQUIRE_SERVER}.`" class="card" />
    <LoadingState v-else-if="loading" />
    <EmptyState v-else-if="error" :icon="ShieldCheck" title="Invitación no válida" :description="error" class="card" />
    <section v-else-if="invitation" class="card space-y-4 p-6 text-center" aria-labelledby="invite-title">
      <span class="mx-auto grid size-12 place-items-center rounded-full bg-pitch-950 text-lime-300"><UserPlus class="size-6" aria-hidden="true" /></span>
      <h1 id="invite-title" class="display text-3xl text-zinc-950">{{ invitation.tournament?.name ?? 'Torneo' }}</h1>
      <p class="text-zinc-700">
        <strong>{{ invitation.invitedBy ?? 'El organizador' }}</strong> te invita a colaborar como <strong>{{ ROLE_LABEL[invitation.role] }}</strong>.
      </p>
      <p v-if="roleInfo" class="text-sm text-zinc-500">{{ roleInfo.description }}</p>

      <p v-if="invitation.status !== 'PENDING'" class="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">{{ STATUS_TEXT[invitation.status] }}</p>
      <template v-else-if="!auth.isAuthenticated">
        <p class="text-sm text-zinc-600">Para aceptar, entra con tu cuenta o crea una (gratis). Volverás a esta página.</p>
        <div class="flex flex-wrap justify-center gap-2">
          <AppButton :to="loginTo">Iniciar sesión</AppButton>
          <AppButton :to="registerTo" variant="secondary">Crear cuenta</AppButton>
        </div>
      </template>
      <template v-else>
        <AppButton :loading="accepting" @click="accept"><CheckCircle2 class="size-4" aria-hidden="true" /> Aceptar invitación</AppButton>
        <p class="text-xs text-zinc-500">Vence el {{ formatDate(toISODate(new Date(invitation.expiresAt))) }} · solo se puede usar una vez.</p>
      </template>
    </section>
  </div>
</template>
