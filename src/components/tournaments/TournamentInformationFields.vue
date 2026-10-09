<script setup lang="ts">
import type { TournamentInformation, TournamentRegistrationInfo } from '@/types'
import { CONTACT_FIELDS, WEEKDAYS } from '@/types/tournamentInformation'
import FormField from '@/components/common/FormField.vue'

defineProps<{ section: 'general' | 'schedule' | 'enrollment' | 'rules' | 'awards' | 'contact'; leagueCity?: string | null }>()
const info = defineModel<TournamentInformation>({ required: true })
const registration = defineModel<TournamentRegistrationInfo>('registration', { required: true })
const amount = (value: string) => value.trim() === '' ? null : Number(value)
</script>

<template>
  <div v-if="section === 'general'" class="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
    <FormField id="t-info-season" label="Edición o temporada" hint="Ejemplo: Apertura 2027">
      <input id="t-info-season" :value="info.season ?? ''" type="text" class="input" maxlength="120" @input="info.season = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-city" label="Ciudad" hint="Opcional: déjala vacía para usar la ciudad de la liga.">
      <input id="t-info-city" :value="info.city ?? ''" type="text" class="input" maxlength="80" :placeholder="leagueCity ?? 'Cancún'" @input="info.city = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-state" label="Estado">
      <input id="t-info-state" :value="info.state ?? ''" type="text" class="input" maxlength="80" @input="info.state = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-description" label="Descripción del torneo">
      <textarea id="t-info-description" :value="info.description ?? ''" class="input min-h-24 py-2" rows="3" maxlength="6000" @input="info.description = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
  </div>
  <div v-else-if="section === 'schedule'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <fieldset class="sm:col-span-2">
      <legend class="mb-2 text-sm font-medium text-zinc-700">Días de juego</legend>
      <div class="flex flex-wrap gap-2">
        <label v-for="day in WEEKDAYS" :key="day.value" class="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:border-zinc-300 has-[:checked]:border-pitch-600 has-[:checked]:bg-pitch-50 has-[:checked]:text-pitch-900">
          <input v-model="info.schedule.days" type="checkbox" :value="day.value" class="accent-pitch-700" /> {{ day.label }}
        </label>
      </div>
    </fieldset>
    <FormField id="t-info-schedule-startTime" label="Hora habitual de inicio">
      <input id="t-info-schedule-startTime" :value="info.schedule.startTime ?? ''" type="time" class="input" @input="info.schedule.startTime = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-schedule-endTime" label="Hora habitual de término">
      <input id="t-info-schedule-endTime" :value="info.schedule.endTime ?? ''" type="time" class="input" @input="info.schedule.endTime = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-duration" label="Duración estimada del partido (minutos)">
      <input id="t-info-duration" :value="info.schedule.durationMinutes ?? ''" type="number" min="1" max="1440" step="1" inputmode="numeric" class="input" @input="info.schedule.durationMinutes = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <label class="flex items-center gap-2 text-sm text-zinc-700"><input v-model="info.schedule.variable" type="checkbox" class="accent-pitch-700" /> Los horarios pueden variar</label>
    <FormField id="t-info-schedule-notes" label="Observaciones sobre horarios">
      <textarea id="t-info-schedule-notes" :value="info.schedule.notes ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.schedule.notes = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <p class="text-xs text-zinc-500 sm:col-span-2">Son horarios orientativos. Podrás programar cada partido en la fecha y hora que corresponda.</p>
  </div>
  <div v-else-if="section === 'enrollment'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FormField id="t-info-enrollment-opensOn" label="Apertura de inscripciones" hint="Fecha informativa; no abre automáticamente las inscripciones.">
      <input id="t-info-enrollment-opensOn" :value="info.enrollment.opensOn ?? ''" type="date" class="input" @input="info.enrollment.opensOn = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-deadline" label="Fecha límite de inscripción" hint="Usa la fecha límite existente del enlace de inscripción.">
      <input id="t-info-deadline" :value="registration.deadline ?? ''" type="date" class="input" @input="registration.deadline = ($event.target as HTMLInputElement).value || null" />
    </FormField>
    <FormField id="t-info-max-teams" label="Cupo máximo de equipos" hint="Opcional. Comparte el límite existente de Inscripciones; no crea ni activa el enlace.">
      <input id="t-info-max-teams" :value="registration.maxTeams ?? ''" type="number" min="2" max="128" step="1" inputmode="numeric" class="input" @input="registration.maxTeams = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-payment-mode" label="Tipo de inscripción">
      <select id="t-info-payment-mode" v-model="info.enrollment.paymentMode" class="input" @change="info.enrollment.paymentMode === 'free' && (info.enrollment.teamFee = info.enrollment.playerFee = null)">
        <option :value="null">Sin especificar</option><option value="free">Gratuita</option><option value="paid">De pago</option>
      </select>
    </FormField>
    <FormField id="t-info-currency" label="Moneda" hint="Código de tres letras para todos los importes, por ejemplo MXN o USD.">
      <input id="t-info-currency" v-model="info.costs.currency" maxlength="3" class="input uppercase" @input="info.costs.currency = info.costs.currency.toUpperCase()" />
    </FormField>
    <FormField id="t-info-enrollment-teamFee" label="Inscripción por equipo">
      <input id="t-info-enrollment-teamFee" :value="info.enrollment.teamFee ?? ''" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" class="input" :disabled="info.enrollment.paymentMode === 'free'" @input="info.enrollment.teamFee = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-enrollment-playerFee" label="Inscripción por jugador">
      <input id="t-info-enrollment-playerFee" :value="info.enrollment.playerFee ?? ''" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" class="input" :disabled="info.enrollment.paymentMode === 'free'" @input="info.enrollment.playerFee = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-enrollment-instructions" label="Indicaciones para inscribirse">
      <textarea id="t-info-enrollment-instructions" :value="info.enrollment.instructions ?? ''" class="input min-h-24 py-2" rows="3" maxlength="4000" @input="info.enrollment.instructions = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <h3 class="mt-2 text-sm font-bold text-zinc-900 sm:col-span-2">Costos del torneo</h3>
    <FormField id="t-info-costs-refereeFee" label="Arbitraje por partido">
      <input id="t-info-costs-refereeFee" :value="info.costs.refereeFee ?? ''" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" class="input" @input="info.costs.refereeFee = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-referee-billing" label="El arbitraje se cobra">
      <select id="t-info-referee-billing" v-model="info.costs.refereeBilling" class="input"><option value="match">Por partido completo</option><option value="team">A cada equipo</option></select>
    </FormField>
    <FormField id="t-info-costs-venueFee" label="Cancha por partido">
      <input id="t-info-costs-venueFee" :value="info.costs.venueFee ?? ''" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" class="input" @input="info.costs.venueFee = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-costs-adminFee" label="Otros costos administrativos">
      <input id="t-info-costs-adminFee" :value="info.costs.adminFee ?? ''" type="number" min="0" max="1000000000" step="0.01" inputmode="decimal" class="input" @input="info.costs.adminFee = amount(($event.target as HTMLInputElement).value)" />
    </FormField>
    <FormField id="t-info-costs-adminDescription" label="Descripción de los costos administrativos">
      <textarea id="t-info-costs-adminDescription" :value="info.costs.adminDescription ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.costs.adminDescription = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-costs-paymentNotes" label="Información adicional sobre pagos">
      <textarea id="t-info-costs-paymentNotes" :value="info.costs.paymentNotes ?? ''" class="input min-h-24 py-2" rows="3" maxlength="4000" @input="info.costs.paymentNotes = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <p class="text-xs text-zinc-500 sm:col-span-2">Los costos publicados son informativos. Kikovo no realiza cobros ni procesa pagos.</p>
  </div>
  <div v-else-if="section === 'rules'" class="space-y-4">
    <FormField id="t-info-rules-text" label="Reglamento general" hint="Condiciones de participación, elegibilidad, uniformes y tolerancia.">
      <textarea id="t-info-rules-text" :value="info.rules.text ?? ''" class="input min-h-24 py-2" rows="3" maxlength="20000" @input="info.rules.text = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-rules-notes" label="Observaciones y reglas particulares">
      <textarea id="t-info-rules-notes" :value="info.rules.notes ?? ''" class="input min-h-24 py-2" rows="3" maxlength="4000" @input="info.rules.notes = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <p class="text-xs text-zinc-500">Este texto informa a los participantes. Las reglas de puntuación y eliminatorias se configuran en Formato de competición.</p>
  </div>
  <div v-else-if="section === 'awards'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <FormField id="t-info-awards-champion" label="Premio para el campeón">
      <textarea id="t-info-awards-champion" :value="info.awards.champion ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.awards.champion = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-awards-runnerUp" label="Premio para el subcampeón">
      <textarea id="t-info-awards-runnerUp" :value="info.awards.runnerUp ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.awards.runnerUp = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-awards-topScorer" label="Premio para el campeón de goleo">
      <textarea id="t-info-awards-topScorer" :value="info.awards.topScorer ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.awards.topScorer = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-awards-other" label="Otros premios o reconocimientos">
      <textarea id="t-info-awards-other" :value="info.awards.other ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.awards.other = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
    <FormField id="t-info-awards-description" label="Descripción de la premiación">
      <textarea id="t-info-awards-description" :value="info.awards.description ?? ''" class="input min-h-24 py-2" rows="3" maxlength="2000" @input="info.awards.description = ($event.target as HTMLTextAreaElement).value || null" />
    </FormField>
  </div>
  <div v-else class="space-y-4">
    <p class="text-sm text-zinc-600">Selecciona qué datos podrán consultar los visitantes. Los demás solo los verás tú al editar el torneo.</p>
    <div v-for="field in CONTACT_FIELDS" :key="field.key" class="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <FormField :id="`t-contact-${field.key}`" :label="field.label">
        <textarea v-if="field.key === 'notes'" :id="`t-contact-${field.key}`" :value="info.contact[field.key] ?? ''" rows="3" maxlength="2000" class="input min-h-24 py-2" @input="info.contact[field.key] = ($event.target as HTMLTextAreaElement).value || null" />
        <input v-else :id="`t-contact-${field.key}`" :value="info.contact[field.key] ?? ''" :type="field.key === 'email' ? 'email' : field.key === 'phone' ? 'tel' : ['facebook', 'instagram'].includes(field.key) ? 'url' : 'text'" :maxlength="field.key === 'name' ? 120 : field.key === 'phone' ? 30 : field.key === 'email' ? 254 : 500" :placeholder="['facebook', 'instagram'].includes(field.key) ? 'https://' : undefined" class="input" @input="info.contact[field.key] = ($event.target as HTMLInputElement).value || null" />
      </FormField>
      <label class="flex min-h-10 items-center gap-2 text-sm text-zinc-600"><input v-model="info.contact.publicFields" type="checkbox" :value="field.key" class="accent-pitch-700" /> Mostrar públicamente<span class="sr-only"> {{ field.label }}</span></label>
    </div>
  </div>
</template>
