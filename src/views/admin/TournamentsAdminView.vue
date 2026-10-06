<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import type { Tournament, TournamentInput } from '@/types'
import { useHomeStore, useTournamentsStore } from '@/stores'
import { leagueService, USE_MOCKS } from '@/services'
import { useOrganizerOptIn } from '@/composables/useOrganizerOptIn'
import { useAdminData } from '@/composables/useLeagueData'
import { useEditor } from '@/composables/useEditor'
import PageHeader from '@/components/common/PageHeader.vue'
import AppButton from '@/components/common/AppButton.vue'
import BaseModal from '@/components/common/BaseModal.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import TournamentForm from '@/components/tournaments/TournamentForm.vue'
import AdminTournamentCard from '@/components/admin/AdminTournamentCard.vue'

const { loading, error, reload } = useAdminData()
const tournaments = useTournamentsStore()
const editor = useEditor<Tournament>()
const router = useRouter()
const route = useRoute()
/** Nombre de cada liga mía (para mostrarla en las tarjetas). */
const leagueNames = ref(new Map<string, string>())
/** "Nuevo torneo" desde Mis ligas: ?new=1&league=<id> abre el alta con esa liga. */
const presetLeague = ref<string | undefined>(typeof route.query.league === 'string' ? route.query.league : undefined)
onMounted(async () => {
  if (route.query.new === '1') editor.create()
  if (USE_MOCKS) return
  try {
    leagueNames.value = new Map((await leagueService.mine()).map((l) => [l.id, l.name]))
  } catch {
    // Sin nombres de liga: las tarjetas se ven igual.
  }
})
const home = useHomeStore()
const optIn = useOrganizerOptIn()

/** "Quiero organizar un torneo": activa la capacidad y abre directamente el alta. */
async function enableOrganizer() {
  if (await optIn.enable(false)) editor.create()
}

const groups = computed(() =>
  [
    { key: 'active', title: 'En curso', items: tournaments.mine.filter((t) => t.status === 'active') },
    { key: 'draft', title: 'En preparación', items: tournaments.mine.filter((t) => t.status === 'draft') },
    { key: 'finished', title: 'Historial', items: tournaments.mine.filter((t) => t.status === 'finished') },
  ].filter((g) => g.items.length),
)

/** Al crear, se entra directo al workspace del torneo: ahí la guía muestra el siguiente paso. */
function onSubmit(input: TournamentInput) {
  editor.save(async () => {
    const created = await tournaments.create({ ...input, status: 'draft' })
    await router.push({ name: 'admin-tournament', params: { id: created.id } })
  }, 'Torneo creado. Sigue los pasos para ponerlo en marcha.')
}
</script>

<template>
  <div>
    <PageHeader
      :eyebrow="home.canOrganize ? 'Panel del organizador' : 'Organizar torneos'"
      title="Mis torneos"
      :subtitle="tournaments.mine.length ? `${tournaments.mine.length} ${tournaments.mine.length === 1 ? 'torneo' : 'torneos'} a tu cargo` : home.canOrganize ? 'Crea y administra tus ligas.' : 'Opcional: tu cuenta puede administrar equipos y también organizar.'"
    >
      <template v-if="home.canOrganize" #actions>
        <AppButton @click="editor.create()"><Plus class="size-4" aria-hidden="true" /> Nuevo torneo</AppButton>
      </template>
    </PageHeader>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :message="error" @retry="reload" />
    <EmptyState
      v-else-if="!home.canOrganize"
      illustrated
      title="¿Organizas un torneo?"
      description="Activa la opción de organizar para crear ligas, generar calendarios y capturar resultados. Es opcional: tus equipos e inscripciones siguen igual y puedes hacer las dos cosas con la misma cuenta."
      class="card"
    >
      <AppButton :loading="optIn.enabling.value" @click="enableOrganizer"><Plus class="size-4" aria-hidden="true" /> Quiero organizar un torneo</AppButton>
    </EmptyState>
    <EmptyState
      v-else-if="!tournaments.mine.length"
      illustrated
      title="Aún no tienes torneos"
      description="Crea tu primer torneo. Después Cancha te guía: inscribir equipos, registrar jugadores, generar el calendario y capturar resultados."
      class="card"
    >
      <AppButton @click="editor.create()"><Plus class="size-4" aria-hidden="true" /> Crear torneo</AppButton>
    </EmptyState>

    <div v-else class="space-y-8">
      <section v-for="g in groups" :key="g.key" :aria-labelledby="`group-${g.key}`">
        <h2 :id="`group-${g.key}`" class="eyebrow mb-3">{{ g.title }} · {{ g.items.length }}</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AdminTournamentCard v-for="t in g.items" :key="t.id" :tournament="t" :league-name="t.leagueId ? leagueNames.get(t.leagueId) : undefined" />
          <button
            v-if="g.key === groups[0]?.key"
            type="button"
            class="flex min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 text-sm font-semibold text-zinc-500 transition hover:border-pitch-400 hover:bg-pitch-50/50 hover:text-pitch-700"
            @click="editor.create()"
          >
            <span class="grid size-10 place-items-center rounded-full bg-white shadow-sm"><Plus class="size-5" aria-hidden="true" /></span>
            Nuevo torneo
          </button>
        </div>
      </section>
    </div>

    <BaseModal
      :open="editor.open.value && home.canOrganize"
      title="Nuevo torneo"
      description="Empieza como borrador: lo inicias cuando tengas equipos y calendario."
      size="lg"
      @close="editor.close()"
    >
      <TournamentForm
        v-if="editor.open.value"
        form-id="tournament-form"
        :initial="null"
        :default-league-id="presetLeague"
        @submit="onSubmit"
      />
      <template #footer>
        <AppButton variant="secondary" :disabled="editor.saving.value" @click="editor.close()">Cancelar</AppButton>
        <AppButton type="submit" form="tournament-form" :loading="editor.saving.value">Crear torneo</AppButton>
      </template>
    </BaseModal>
  </div>
</template>
