<script setup lang="ts">
import { computed } from 'vue'
import type { Tournament } from '@/types'
import { CONTACT_FIELDS, defaultTournamentInformation, publicTournament, WEEKDAYS } from '@/types/tournamentInformation'
import { formatDate, formatDateRange } from '@/utils/format'
import { MODALITY_LABELS } from '@/utils/labels'

const props = defineProps<{ tournament: Tournament; leagueCity?: string | null }>()
interface Row { label: string; value: string; href?: string }
interface Section { id: string; title: string; rows: Row[] }
const sections = computed<Section[]>(() => {
  const t = publicTournament(props.tournament)
  const info = defaultTournamentInformation(t.information)
  const groups: Section[] = []
  const row = (label: string, value: string | number | null | undefined, href?: string): Row[] => value !== null && value !== undefined && String(value).trim() !== '' ? [{ label, value: String(value), href }] : []
  const add = (id: string, title: string, rows: Row[]) => { if (rows.length) groups.push({ id, title, rows }) }
  const money = (n: number | null | undefined) => n == null ? null : new Intl.NumberFormat('es-MX', { style: 'currency', currency: info.costs.currency || 'MXN' }).format(n) + ` ${info.costs.currency || 'MXN'}`
  add('general', 'Información general', [
    ...row('Edición / temporada', info.season), ...row('Descripción', info.description),
    ...row('Modalidad', MODALITY_LABELS[t.modality]), ...row('Categoría', t.category),
    ...row('Fechas', formatDateRange(t.startDate, t.endDate)), ...row('Sede principal', t.venue),
    ...row('Ciudad', info.city || props.leagueCity), ...row('Estado', info.state),
  ])
  const s = info.schedule
  const hasSchedule = !!(s.days.length || s.startTime || s.endTime || s.durationMinutes || s.notes || s.variable)
  if (hasSchedule) add('schedule', 'Días y horarios', [
    ...row('Días de juego', WEEKDAYS.filter((day) => s.days.includes(day.value)).map((day) => day.label).join(', ')),
    ...row('Hora habitual de inicio', s.startTime), ...row('Hora habitual de término', s.endTime),
    ...row('Duración estimada', s.durationMinutes ? `${s.durationMinutes} minutos` : null),
    ...row('Disponibilidad', s.variable ? 'Los horarios pueden variar' : null), ...row('Observaciones', s.notes),
  ])
  const e = info.enrollment, c = info.costs
  add('enrollment', 'Inscripciones y costos', [
    ...row('Apertura de inscripciones', e.opensOn ? formatDate(e.opensOn, 'long') : null),
    ...row('Fecha límite', t.registration?.deadline ? formatDate(t.registration.deadline, 'long') : null),
    ...row('Cupo máximo', t.registration?.maxTeams ? `${t.registration.maxTeams} equipos` : null),
    ...row('Inscripción', e.paymentMode === 'free' ? 'Gratuita' : e.paymentMode === 'paid' ? 'De pago' : null),
    ...row('Por equipo', money(e.teamFee)), ...row('Por jugador', money(e.playerFee)), ...row('Cómo inscribirse', e.instructions),
    ...row('Arbitraje', c.refereeFee !== null ? `${money(c.refereeFee)} ${c.refereeBilling === 'team' ? 'por equipo y partido' : 'por partido completo'}` : null),
    ...row('Cancha por partido', money(c.venueFee)), ...row('Otros costos administrativos', money(c.adminFee)),
    ...row('Detalle de costos', c.adminDescription), ...row('Información sobre pagos', c.paymentNotes),
  ])
  add('rules', 'Reglamento', [...row('Reglamento general', info.rules.text), ...row('Reglas particulares', info.rules.notes)])
  add('awards', 'Premios y reconocimientos', [
    ...row('Campeón', info.awards.champion), ...row('Subcampeón', info.awards.runnerUp), ...row('Campeón de goleo', info.awards.topScorer),
    ...row('Otros reconocimientos', info.awards.other), ...row('Premiación', info.awards.description),
  ])
  add('contact', 'Contacto', CONTACT_FIELDS.flatMap(({ key, label }) => {
    const value = info.contact[key]
    const phone = value?.replace(/[^+\d]/g, '')
    const href = key === 'phone' && phone ? `tel:${phone}` : key === 'email' && value ? `mailto:${value}` : ['facebook', 'instagram'].includes(key) && value && /^https?:\/\//i.test(value) ? value : undefined
    return row(label, value, href)
  }))
  return groups
})
</script>

<template>
  <div class="space-y-6">
    <nav aria-label="Información del torneo" class="flex flex-wrap gap-2">
      <a v-for="section in sections" :key="section.id" :href="`#info-${section.id}`" class="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-pitch-500">{{ section.title }}</a>
    </nav>
    <section v-for="section in sections" :id="`info-${section.id}`" :key="section.id" class="card scroll-mt-6 p-4 sm:p-6" :aria-labelledby="`info-title-${section.id}`">
      <h2 :id="`info-title-${section.id}`" class="display mb-4 text-2xl text-zinc-950">{{ section.title }}</h2>
      <dl class="divide-y divide-zinc-100">
        <div v-for="item in section.rows" :key="item.label" class="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt class="text-sm font-semibold text-zinc-500">{{ item.label }}</dt>
          <dd class="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800">
            <a v-if="item.href" :href="item.href" :target="item.href.startsWith('http') ? '_blank' : undefined" rel="noopener noreferrer" class="link break-all">{{ item.value }}</a>
            <template v-else>{{ item.value }}</template>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
