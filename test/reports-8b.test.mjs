import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

// 8B: lógica de la pantalla de reportes (sin red): parámetros, periodo, nombre de archivo y errores.
let server, r
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, mode: 'test' })
  r = await server.ssrLoadModule('/src/reports/reports.ts')
})
after(async () => server?.close())

const filled = () => ({ phase: '1', group: 'B', round: '3', teamId: '6adc14eb5e5ce25f77c8318f', from: '2027-02-01', to: '2027-02-28', status: ['FINISHED', 'PENDING_SCHEDULE'], includeInactive: true })

test('solo se envían los filtros que el reporte admite y tienen valor', () => {
  assert.deepEqual(r.reportQuery({ filters: [] }, 'pdf', filled()), { format: 'pdf' })
  assert.deepEqual(r.reportQuery({ filters: ['phase', 'group'] }, 'xlsx', filled()), { format: 'xlsx', phase: '1', group: 'B' })
  assert.deepEqual(r.reportQuery({ filters: ['round', 'teamId', 'from', 'to', 'status'] }, 'csv', filled()), {
    format: 'csv',
    round: '3',
    teamId: '6adc14eb5e5ce25f77c8318f',
    from: '2027-02-01',
    to: '2027-02-28',
    status: 'FINISHED,PENDING_SCHEDULE',
  })
  assert.deepEqual(r.reportQuery({ filters: ['teamId', 'includeInactive'] }, 'pdf', { ...r.emptyFilters(), includeInactive: true }), { format: 'pdf', includeInactive: 'true' })
  // Vacíos y sin bajas: no se envían (el backend rechaza filtros que no aplican).
  assert.deepEqual(r.reportQuery({ filters: ['round', 'teamId', 'from', 'to', 'status', 'includeInactive'] }, 'pdf', r.emptyFilters()), { format: 'pdf' })
  assert.equal(r.activeFilters({ filters: ['teamId', 'from'] }, { ...r.emptyFilters(), teamId: 'x', round: '2' }), 1)
})

test('los estados del filtro son exactamente los del backend', () => {
  assert.deepEqual(r.STATUS_OPTIONS.map((s) => s.value).sort(), ['CANCELLED', 'FINISHED', 'LIVE', 'PENDING_SCHEDULE', 'POSTPONED', 'SCHEDULED', 'SUSPENDED'])
})

test('periodo: «hasta» anterior a «desde» es un error; solo si el reporte tiene periodo', () => {
  const bad = { ...r.emptyFilters(), from: '2027-03-01', to: '2027-02-01' }
  assert.deepEqual(r.filterErrors({ filters: ['from', 'to'] }, bad), { to: '«Hasta» no puede ser anterior a «Desde».' })
  assert.deepEqual(r.filterErrors({ filters: ['teamId'] }, bad), {})
  assert.deepEqual(r.filterErrors({ filters: ['from', 'to'] }, { ...bad, to: '2027-03-01' }), {})
})

test('nombre de archivo: el del servidor si es seguro y con la extensión pedida; si no, genérico', () => {
  const ok = 'attachment; filename="tabla-de-posiciones-liga-norte-2026-10-23.pdf"; filename*=UTF-8\'\'tabla.pdf'
  assert.equal(r.safeFilename(ok, 'pdf'), 'tabla-de-posiciones-liga-norte-2026-10-23.pdf')
  assert.equal(r.safeFilename(ok, 'xlsx', 'standings'), 'standings.xlsx')
  assert.equal(r.safeFilename('attachment; filename="../../etc/passwd.csv"', 'csv'), 'passwd.csv')
  assert.equal(r.safeFilename('attachment; filename="..\\\\win\\\\.hidden.csv"', 'csv'), 'reporte.csv')
  assert.equal(r.safeFilename('attachment; filename="año ñandú.csv"', 'csv'), 'reporte.csv')
  assert.equal(r.safeFilename('attachment; filename=reporte-final.csv', 'csv'), 'reporte-final.csv')
  assert.equal(r.safeFilename(null, 'xlsx', 'finance'), 'finance.xlsx')
})

test('errores: mensajes claros por caso; nunca detalles técnicos', () => {
  const kind = (s, m = null) => r.explainError(s, m).kind
  assert.equal(kind(null), 'network')
  assert.equal(kind(401), 'session')
  assert.equal(kind(403), 'forbidden')
  assert.equal(kind(404), 'not_found')
  assert.equal(kind(429), 'busy')
  assert.equal(kind(500), 'server')
  assert.equal(kind(502), 'server')
  const pdf = r.explainError(400, 'El reporte tiene 4100 filas: para un PDF el máximo es 4000. Descárgalo en Excel o CSV, o aplica filtros')
  assert.equal(pdf.kind, 'pdf_limit')
  assert.match(pdf.message, /Excel o CSV/)
  assert.equal(kind(400, 'El reporte tiene 60000 filas (máximo 50000); aplica filtros'), 'too_large')
  assert.deepEqual(r.explainError(400, 'El torneo no tiene el grupo C'), { kind: 'invalid', message: 'El torneo no tiene el grupo C.' })
  // Mensajes de validación técnicos → genérico.
  assert.equal(r.explainError(400, 'from debe ser YYYY-MM-DD').message, 'Revisa los filtros: alguno no es válido para este reporte.')
  assert.equal(r.explainError(400, 'El reporte «Tabla» no admite: teamId').message, 'Revisa los filtros: alguno no es válido para este reporte.')
  for (const s of [null, 401, 403, 404, 429, 500]) assert.doesNotMatch(r.explainError(s, 'MongoServerError stack at x.js:1').message, /Mongo|stack|\.js/)
})

test('cada reporte tiene categoría y descripción de contenido; finanzas y plantillas no son «deportivas»', () => {
  for (const id of ['standings', 'matches', 'players', 'rosters', 'discipline', 'finance', 'summary']) {
    assert.ok(r.REPORT_CATEGORY[id])
    assert.ok(r.REPORT_CONTENTS[id])
  }
  assert.equal(r.REPORT_CATEGORY.finance, 'finance')
  assert.equal(r.REPORT_CATEGORY.rosters, 'admin')
  assert.doesNotMatch(r.REPORT_CONTENTS.rosters, /nacimiento\b(?! ni)/)
})
