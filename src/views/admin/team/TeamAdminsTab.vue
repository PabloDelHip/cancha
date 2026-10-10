<script setup lang="ts">
import { ref } from 'vue'
import { Crown, UserCog, UserMinus, UserPlus } from 'lucide-vue-next'
import type { TeamAdminEntry } from '@/types'
import { teamManagementService } from '@/services'
import { useTeamManagement } from '@/composables/useTeamManagement'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { formatDate, toISODate } from '@/utils/format'
import AppButton from '@/components/common/AppButton.vue'
import FormField from '@/components/common/FormField.vue'
import TeamRoleBadge from '@/components/admin/team/TeamRoleBadge.vue'

/**
 * Administradores del equipo (GET /teams/:id/admins). El propietario agrega delegados por correo
 * (sin buscador de cuentas: se escribe el correo exacto) y los quita. Los delegados solo consultan.
 * No hay acciones sobre el propietario: cambiarlo o renunciar llegará con la transferencia.
 */
const { team, teamId, admins, isOwner, reloadAdmins, actionFailed } = useTeamManagement()
const auth = useAuthStore()
const { confirm } = useConfirm()
const toast = useToast()

const email = ref('')
const emailError = ref('')
const saving = ref(false)
const busy = ref<string | null>(null)

const name = (a: TeamAdminEntry) => `${a.firstName} ${a.lastName}`.trim()
const isMe = (a: TeamAdminEntry) => a.userId === auth.user?.id

async function addManager() {
  emailError.value = ''
  const value = email.value.trim()
  if (!/^\S+@\S+\.\S+$/.test(value)) {
    emailError.value = 'Escribe un correo válido.'
    return
  }
  saving.value = true
  try {
    const result = await teamManagementService.addManager(teamId(), value)
    admins.value = result
    email.value = ''
    toast.success('Delegado agregado. Ya puede administrar el equipo y su plantilla.')
  } catch (e) {
    // 404: no hay cuenta con ese correo. Mensaje neutro, sin datos de ninguna cuenta.
    emailError.value = await actionFailed(e, 'No encontramos una cuenta de Kisokar con ese correo. Pídele que se registre primero.')
  } finally {
    saving.value = false
  }
}

async function removeManager(a: TeamAdminEntry) {
  const ok = await confirm({
    title: `¿Quitar a ${name(a)} como delegado?`,
    message: `${name(a)} dejará de poder administrar ${team.value?.name} y su plantilla. Su cuenta no se elimina.`,
    confirmLabel: 'Quitar como delegado',
    tone: 'danger',
  })
  if (!ok) return
  busy.value = a.userId
  try {
    await teamManagementService.removeManager(teamId(), a.userId)
    toast.success(`${name(a)} ya no es delegado.`)
    await reloadAdmins()
  } catch (e) {
    toast.error(await actionFailed(e))
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="space-y-8">
    <section aria-labelledby="owner-title">
      <h2 id="owner-title" class="eyebrow mb-2">Propietario</h2>
      <div v-if="admins?.owner" class="card flex items-center gap-3 px-4 py-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-lime-400 text-pitch-950"><Crown class="size-5" aria-hidden="true" /></span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-zinc-900">{{ name(admins.owner) }}<span v-if="isMe(admins.owner)" class="font-normal text-zinc-500"> (tú)</span></p>
          <p class="text-xs text-zinc-500">Desde {{ formatDate(toISODate(new Date(admins.owner.since))) }}</p>
        </div>
        <TeamRoleBadge role="owner" />
      </div>
      <p v-else class="card px-4 py-3 text-sm text-zinc-500">Este equipo aún no tiene propietario.</p>
    </section>

    <section aria-labelledby="managers-title">
      <h2 id="managers-title" class="eyebrow mb-2">Delegados · {{ admins?.managers.length ?? 0 }}</h2>
      <ul v-if="admins?.managers.length" class="card divide-y divide-zinc-100 overflow-hidden">
        <li v-for="m in admins.managers" :key="m.userId" class="flex items-center gap-3 px-4 py-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-pitch-100 text-pitch-900"><UserCog class="size-5" aria-hidden="true" /></span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-zinc-900">{{ name(m) }}<span v-if="isMe(m)" class="font-normal text-zinc-500"> (tú)</span></p>
            <p class="text-xs text-zinc-500">Delegado desde {{ formatDate(toISODate(new Date(m.since))) }}</p>
          </div>
          <AppButton v-if="isOwner" variant="ghost" size="sm" :loading="busy === m.userId" :aria-label="`Quitar a ${name(m)} como delegado`" @click="removeManager(m)">
            <UserMinus class="size-4" aria-hidden="true" /><span class="max-sm:sr-only">Quitar como delegado</span>
          </AppButton>
        </li>
      </ul>
      <p v-else class="card px-4 py-3 text-sm text-zinc-500">Todavía no hay delegados.</p>
      <p class="mt-2 text-xs text-zinc-500">Los delegados administran la plantilla y la presentación del equipo. No pueden cambiar su nombre ni gestionar a otros administradores.</p>
    </section>

    <section v-if="isOwner" aria-labelledby="add-manager-title" class="card p-4">
      <h2 id="add-manager-title" class="font-semibold text-zinc-900">Agregar delegado</h2>
      <p class="mb-3 text-sm text-zinc-500">La persona debe tener una cuenta en Kisokar.</p>
      <form class="flex flex-col gap-3 sm:flex-row sm:items-start" novalidate @submit.prevent="addManager">
        <FormField id="manager-email" label="Correo de la persona" :error="emailError" class="flex-1">
          <input id="manager-email" v-model="email" type="email" class="input" autocomplete="off" placeholder="correo@ejemplo.com" :aria-invalid="!!emailError" />
        </FormField>
        <AppButton type="submit" :loading="saving" class="sm:mt-6"><UserPlus class="size-4" aria-hidden="true" /> Agregar</AppButton>
      </form>
    </section>
  </div>
</template>
