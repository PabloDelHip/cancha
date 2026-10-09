import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

let server, defaults, publicTournament, informationProblems, PublicInformation, TournamentForm, settings
before(async () => {
  // Existing closed dialogs only reset body overflow; no DOM mount occurs in SSR.
  globalThis.document = { body: { style: {} }, activeElement: null }
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  ;({ defaultTournamentInformation: defaults, publicTournament } = await server.ssrLoadModule('/src/types/tournamentInformation.ts'))
  ;({ informationProblems } = await server.ssrLoadModule('/src/utils/tournamentInformation.ts'))
  PublicInformation = (await server.ssrLoadModule('/src/components/tournaments/TournamentInformation.vue')).default
  TournamentForm = (await server.ssrLoadModule('/src/components/tournaments/TournamentForm.vue')).default
  settings = (await server.ssrLoadModule('/src/utils/labels.ts')).defaultSettings
})
after(async () => { await server?.close(); delete globalThis.document })
const tournament = (information = defaults()) => ({ id: 't', name: 'Copa', category: 'Libre', modality: 'F7', startDate: '2027-04-01', endDate: null, status: 'draft', venue: null, settings: settings(), information, dataCoverage: 'full', trackedTeamIds: [] })
const render = (component, props) => renderToString(createSSRApp(component, props))

test('los valores anteriores funcionan y no crean apartados vacíos', async () => {
  const html = await render(PublicInformation, { tournament: tournament() })
  assert.ok(html.includes('Información general'))
  for (const id of ['schedule', 'enrollment', 'rules', 'awards', 'contact']) assert.ok(!html.includes(`id="info-${id}"`))
})

test('muestra importes cero y texto escapado, y nunca contactos privados', async () => {
  const info = defaults()
  info.costs.venueFee = 0
  info.rules.text = '<script>alert(1)</script>'
  info.contact.name = 'Responsable público'
  info.contact.email = 'secreto@example.com'
  info.contact.publicFields = ['name']
  const html = await render(PublicInformation, { tournament: tournament(info) })
  assert.ok(html.includes('id="info-enrollment"'))
  assert.ok(html.includes('$0.00 MXN'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(!html.includes('<script>alert'))
  assert.ok(html.includes('Responsable público'))
  assert.ok(!html.includes('secreto@example.com'))
  assert.equal(publicTournament(tournament(info)).information.contact.email, null)
  assert.equal(info.contact.email, 'secreto@example.com')
})

test('usa la ciudad de la liga mientras el torneo no tenga una ubicación propia', async () => {
  const t = tournament()
  assert.ok((await render(PublicInformation, { tournament: t, leagueCity: 'Cancún' })).includes('Cancún'))
  t.information.city = 'Playa del Carmen'
  const html = await render(PublicInformation, { tournament: t, leagueCity: 'Cancún' })
  assert.ok(html.includes('Playa del Carmen')); assert.ok(!html.includes('Cancún'))
})

test('valida costos, fechas, horas y enlaces antes de guardar', () => {
  const info = defaults()
  info.enrollment.opensOn = '2027-04-01'
  info.schedule.startTime = '08:00'; info.schedule.endTime = '07:00'
  info.costs.refereeFee = -1; info.contact.instagram = 'javascript:alert(1)'
  assert.equal(informationProblems(info, { deadline: '2027-03-01', maxTeams: null }).length, 4)
})

for (const system of ['league', 'knockout', 'groups_knockout', 'league_playoffs']) {
  test(`conserva los controles deportivos al editar ${system}`, async () => {
    const t = tournament()
    t.settings.system = system
    if (system === 'groups_knockout') { t.settings.groupCount = 2; t.settings.qualifiersPerGroup = 2 }
    if (system === 'league_playoffs') t.settings.playoffTeams = 4
    const html = await render(TournamentForm, { initial: t, formId: 'form' })
    for (const title of ['1. Información general', '2. Formato de competición', '3. Calendario y horarios', '4. Inscripciones y costos', '5. Reglamento', '6. Premios', '7. Contacto']) assert.ok(html.includes(title), title)
    if (system !== 'knockout') { assert.ok(html.includes('id="t-win"')); assert.ok(html.includes('name="rr-legs"')) }
    if (system !== 'league') { assert.ok(html.includes('id="t-ko-tiebreak"')); assert.ok(html.includes('name="ko-legs"')); assert.ok(html.includes('name="reseed"')) }
    if (system === 'groups_knockout') assert.ok(html.includes('id="t-groups"'))
    if (system === 'league_playoffs') assert.ok(html.includes('id="t-playoffs"'))
    assert.equal((html.match(/id="t-start"/g) ?? []).length, 1)
  })
}
