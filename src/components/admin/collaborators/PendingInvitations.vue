<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, UserPlus, X } from 'lucide-vue-next'
import type { ReceivedInvitation } from '@/types'
import { collaboratorService, getErrorMessage } from '@/services'
import { ensureAdminData } from '@/stores'
import { useToast } from '@/composables/useToast'
import { ROLE_LABEL } from '@/utils/labels'
import AppButton from '@/components/common/AppButton.vue'

/** Invitaciones a colaborar dirigidas a mi cuenta (por correo). Se aceptan o rechazan aquí. */
const router = useRouter()
const toast = useToast()
const items = ref<ReceivedInvitation[]>([])
const busy = ref<string | null>(null)

onMounted(async () => {
  try {
    items.value = await collaboratorService.mine()
  } catch {
    items.value = []
  }
})

async function accept(inv: ReceivedInvitation) {
  busy.value = inv.id
  try {
    const { tournamentId } = await collaboratorService.acceptMine(inv.id)
    await ensureAdminData(true)
    toast.success(`Ya colaboras en ${inv.tournament?.name ?? 'el torneo'} como ${ROLE_LABEL[inv.role]}.`)
    await router.push({ name: 'admin-tournament', params: { id: tournamentId } })
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = null
  }
}
async function decline(inv: ReceivedInvitation) {
  busy.value = inv.id
  try {
    await collaboratorService.decline(inv.id)
    items.value = items.value.filter((x) => x.id !== inv.id)
    toast.success('Invitación rechazada.')
  } catch (e) {
    toast.error(getErrorMessage(e))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <section v-if="items.length" aria-labelledby="pending-inv-title" class="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
    <h2 id="pending-inv-title" class="mb-2 flex items-center gap-2 font-bold text-sky-950"><UserPlus class="size-5" aria-hidden="true" /> Te invitaron a colaborar</h2>
    <ul class="space-y-2">
      <li v-for="inv in items" :key="inv.id" class="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm">
        <p class="min-w-0 flex-1">
          <strong>{{ inv.tournament?.name ?? 'Torneo' }}</strong> como {{ ROLE_LABEL[inv.role] }}
          <span class="text-zinc-500">· invita {{ inv.invitedBy ?? 'el organizador' }}</span>
        </p>
        <AppButton size="sm" :loading="busy === inv.id" @click="accept(inv)"><Check class="size-4" aria-hidden="true" /> Aceptar</AppButton>
        <AppButton size="sm" variant="ghost" :disabled="busy === inv.id" @click="decline(inv)"><X class="size-4" aria-hidden="true" /> Rechazar</AppButton>
      </li>
    </ul>
  </section>
</template>
