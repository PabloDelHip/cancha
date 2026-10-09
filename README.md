# Cancha · Frontend

Plataforma web para administrar torneos de fútbol amateur/semi-profesional y, a partir de los datos
que generan, construir **perfiles deportivos públicos de los jugadores**.

> Torneo → Partidos → Estadísticas → Perfil del jugador
>
> _Los torneos generan los datos que construyen la identidad deportiva del jugador._

Este es el frontend del MVP. Funciona en dos modos (ver [Variables de entorno](#variables-de-entorno)):
contra el backend NestJS + MongoDB de `../backend`, o como demo aislada con una capa mock
persistida en `localStorage`.

## Stack

- Vue 3 (Composition API, `<script setup lang="ts">`)
- TypeScript
- Vite
- Vue Router
- Pinia
- Axios
- Tailwind CSS v4
- Lucide (iconos)
- ESLint (`eslint-plugin-vue` + `typescript-eslint`)

## Requisitos

- Node.js **20.19+** o **22.12+** (probado con Node 24)
- npm 10+

## Instalación y ejecución

```bash
cp .env.example .env
npm install
npm run dev
```

Abre http://localhost:5173.

| Script              | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                    |
| `npm run build`     | Typecheck (`vue-tsc`) + build de producción |
| `npm run preview`   | Sirve el build                            |
| `npm run typecheck` | Solo comprobación de tipos                |
| `npm run lint`      | ESLint                                    |

## Recorrido de la demo

**Área pública** (sin login):

- `/` — torneo en curso, partidos en juego, jugadores destacados, resultados y próximos partidos.
- `/tournaments` — listado con filtros por estado.
- `/tournaments/:id` — pestañas **Resumen, Tabla, Partidos, Equipos, Goleadores** (cada una con URL propia).
- `/teams/:id` — escudo, estadísticas, plantilla y últimos partidos.
- `/players` — buscador de jugadores.
- `/players/:id` — **perfil deportivo**: números de carrera, forma, estadísticas por partido,
  historial por torneo y trayectoria de equipos.
- `/matches/:id` — marcador, goleadores y participación de cada jugador.

**Panel del organizador** (`/admin`, usuario simulado _Laura Méndez_). El torneo es el contexto:

- `/admin` — resumen de la cuenta: pendientes de capturar, próximos partidos, torneo destacado.
- `/admin/tournaments` — **Mis torneos** (en curso, en preparación, historial). Crear un torneo lleva a su workspace.
- `/admin/tournaments/:id` — **workspace del torneo** con pestañas:
  **Resumen** (guía del siguiente paso, cifras, próximos partidos, últimos resultados, tabla) ·
  **Equipos** (buscar/reutilizar o crear, retirar) → `equipos/:teamId` **plantilla** en el torneo
  (buscar/reutilizar jugador, dorsal, cambio de equipo, baja con historial) · **Jugadores** ·
  **Calendario** (jornadas, generar liga a 1 o 2 vueltas, programar/mover/posponer partidos) ·
  **Tabla** · **Goleadores** · **Configuración** (datos, sistema de competencia, puntuación,
  iniciar/finalizar torneo).
- `/admin/matches/:id` — **captura de resultado**: marcador + estadísticas individuales
  (goles, asistencias, amarillas, rojas). Sumar goles a un jugador actualiza el marcador;
  se avisa si hay goles sin asignar (autogoles) y si sales con cambios sin guardar. Tras guardar
  ofrece "Ver tabla" y "Siguiente partido".
- Un torneo **finalizado** queda de solo lectura en el panel y como historial en el sitio público.
- Las rutas antiguas `/admin/teams`, `/admin/players` y `/admin/matches` redirigen al workspace
  (con `?tournament=<id>`) o a "Mis torneos".

Todo funciona igual contra el backend real y en modo mock: jornadas persistentes, partidos
pospuestos, puntuación del torneo, calendario generado en el servidor (una transacción) e
inmutabilidad del torneo finalizado, que aplica el backend (la UI solo lo refleja). El modo mock
imita esas reglas para la demo; nunca son la seguridad.

Algunos casos que conviene probar:

- _Pablo Hipólito_ (`/players/p-009`) tiene el perfil reclamado por un usuario (badge "Perfil verificado").
- _Diego Ramírez Tirado_ jugó la Copa Invierno 2026 con Tigres y el Apertura 2027 con Halcones:
  su perfil muestra ambos en el historial.
- El partido Halcones vs Deportivo Olas de la jornada 7 está **en juego**: captúralo y verás cómo
  cambian la tabla, los goleadores y el perfil de los jugadores. Tigres vs Real Mazatlán está **pospuesto**.
- _Liga Veteranos · Primavera 2027_ está en **borrador** y sin equipos: sirve para recorrer la guía
  (inscribir equipos → plantillas → generar calendario → iniciar).
- "Restablecer demo" (en `/admin`) vuelve al estado inicial.

## Estructura

```
src/
  assets/            CSS global y tokens de diseño (Tailwind @theme)
  components/
    common/          UI genérica: AppButton, BaseModal, ConfirmDialog, EmptyState, StatCard…
    layout/          AppHeader, AdminSidebar, navegación
    tournaments/     TournamentCard, StandingsTable, TopScorersTable, TournamentForm
    teams/           TeamLogo, FormGuide, TeamForm
    players/         PlayerAvatar, PlayerRow, perfil (header, match log, historial), PlayerForm
    matches/         MatchCard, MatchForm, CaptureTeamPanel
  composables/       useLeagueData, useTournamentStats, usePlayerProfile, useEditor, useToast, useConfirm…
  layouts/           PublicLayout, AdminLayout
  mocks/             seed.ts (datos demo) y db.ts (persistencia localStorage)
  router/
  services/          api.ts (Axios) + un servicio por recurso
  stores/            Pinia: tournaments, teams, players, matches, rounds, auth
  types/             Modelo de dominio y contratos de escritura
  utils/             Cálculos puros (tabla, goleadores), formato y etiquetas
  views/
    public/          Páginas públicas (y pestañas del torneo en public/tournament)
    admin/           Panel del organizador (workspace del torneo en admin/tournament)
```

## Variables de entorno

| Variable        | Por defecto                 | Descripción                                                           |
| --------------- | --------------------------- | --------------------------------------------------------------------- |
| `VITE_API_URL`  | `http://localhost:3000/api` | URL base de la API REST (NestJS).                                     |
| `VITE_USE_MOCKS`| `true`                      | `true`: demo aislada con mocks/localStorage. `false`: usa el backend real en `VITE_API_URL`. |

Para usar el backend real (ver [README raíz](../README.md)): levanta MongoDB con `docker compose up -d`,
arranca `../backend` (`npm run seed && npm run start:dev`) y pon `VITE_USE_MOCKS=false` en `.env`.
Con backend real el botón "Restablecer demo" no aparece (usa `npm run seed` en el backend) y el
badge "Perfil verificado" no se muestra (el backend aún no tiene cuentas de usuario).

## Decisiones de arquitectura

### Modelo de dominio (`src/types`)

```
Player ─< TeamMembership >─ Team        un jugador cambia de equipo sin perder su historial
Tournament ─< TournamentTeam >─ Team    un equipo puede jugar varios torneos
Match ─< PlayerMatchStats >─ Player     las estadísticas pertenecen al contexto de un partido
User ─ ─ ─ Player (opcional)            un jugador puede reclamar su perfil con una cuenta
```

- **Player ≠ User.** Un organizador registra jugadores que no tienen cuenta. `Player.userId` y
  `User.playerId` quedan listos para el futuro flujo de "reclamar perfil" (no implementado).
- **Player no conoce su equipo.** La relación vive en `TeamMembership` (con dorsal y fechas).
  Cambiar de equipo cierra la membresía vigente y abre una nueva; nunca se borra historial.
- **`PlayerMatchStats` guarda el `teamId`** con el que se jugó ese partido, para que el historial
  sea correcto aunque el jugador cambie después de club. La existencia del registro = partido jugado.
- **Datos derivados no se persisten.** Goleadores y totales del jugador se calculan con funciones
  puras (`src/utils/stats.ts`) a partir de partidos y estadísticas. Solo cuentan partidos
  **finalizados**.
- **La tabla de posiciones la calcula el backend** (`GET /tournaments/:id/standings`, puntuación de
  `Tournament.settings`, desempate PTS → DG → GF). `useTournamentStats` la pide a través del store
  `standings` cuando cambian equipos, resultados o puntuación; la UI no la recalcula. En modo mock
  el servicio mock hace de backend y usa `computeStandings` (única copia local de esas reglas).
- Ids `string` para mapear directamente a `ObjectId` de MongoDB.

### Capas

```
Vista/Componente → Store (Pinia) / Composable → Service → (mock | Axios)
```

- **Los componentes no saben de dónde vienen los datos.** Solo hablan con stores y composables.
- **Servicios** (`src/services/*Service.ts`): cada uno define una interfaz y dos implementaciones,
  `http` (Axios) y `mock`. `VITE_USE_MOCKS` elige cuál se exporta. Pasar al backend real es cambiar
  esa variable y ajustar los endpoints si el contrato final difiere.
- **Mocks** (`src/mocks`): la semilla se genera con un PRNG de semilla fija, así que es
  determinista y **coherente por construcción** (cada gol del marcador tiene un goleador del
  equipo correcto, y cada participación corresponde a una membresía vigente en esa fecha).
  Las escrituras se guardan en `localStorage`; la latencia simulada hace visibles los estados de carga.
- **Stores**: guardan colecciones normalizadas por recurso y exponen búsquedas (`get`, `rosterOf`,
  `ofTournament`…). Lo que combina varios stores vive en composables (`useTournamentStats`,
  `usePlayerProfile`) para no duplicar estado.
- UI transversal (toasts, confirmaciones) usa composables con estado a nivel de módulo, no Pinia.

### Conexión con el backend

Los servicios `http` consumen el API de `../backend` (documentado en su README y en Swagger,
`http://localhost:3000/api/docs`). Todas las diferencias de contrato se resuelven en
`src/services/mappers.ts`, así que vistas y stores no cambiaron:

- enums del API en mayúsculas (`GOALKEEPER`, `FOOTBALL_7`, `SCHEDULED`…) ↔ valores cortos del front;
- `jerseyNumber` ↔ `shirtNumber`, `format` ↔ `modality`, `active` ↔ `status` de la membresía;
- se descartan participaciones con `played: false` (el front cuenta cada registro como partido jugado);
- los listados del API están paginados (máx. 100): `fetchAll()` en `src/services/api.ts` recorre las páginas.

**Perfil del jugador:** `/players/:id` hace UNA petición (`GET /players/:id/profile`) y pinta el
agregado del servidor; no descarga colecciones ni recalcula estadísticas (`usePlayerProfile`). En
modo mock, `src/mocks/playerProfile.ts` implementa el mismo contrato. Las respuestas públicas traen
`Player.age`; la fecha de nacimiento exacta solo llega al custodio (`playersStore.birthDateOf`).

**Limitación conocida:** el resto de vistas públicas y el panel aún descargan colecciones completas
y calculan goleadores en cliente (la tabla y el perfil ya vienen del backend); paginar queda para
cuando haya datos reales de uso.

### Autenticación y panel del organizador

**Rutas**

| Ruta                   | Acceso                                                        |
| ---------------------- | ------------------------------------------------------------- |
| Todo el área pública   | Sin cuenta (inicio, torneos, tabla, partidos, equipos, goleadores, jugadores, perfiles) |
| `/login`, `/register`  | Solo sin sesión (con sesión redirigen a `/admin`)             |
| `/admin/**`            | Requiere sesión. Sin sesión → `/login?redirect=<ruta>` y, tras entrar, vuelve a esa ruta (solo rutas internas) |

**User ≠ Player.** `User` es una cuenta que inicia sesión (hoy siempre `role: 'ORGANIZER'`:
`{ id, firstName, lastName, email, role }`, nunca con contraseña). `Player` es una identidad
deportiva que existe aunque la persona nunca cree cuenta. Vincularlos (reclamar perfil) queda
para más adelante.

**Ownership.** `Tournament.organizerId` decide **quién administra** un torneo, no quién lo ve:
todos los torneos siguen siendo públicos. El panel muestra solo lo propio (torneos del usuario y
equipos/jugadores que registró, `createdBy`); equipos y jugadores siguen siendo globales. Al crear
un torneo no hay selector de organizador: lo asigna la sesión. Esto es comportamiento de UI; la
seguridad real la aplica el backend (403).

**Usuarios demo (SOLO DESARROLLO)** — contraseña `Demo12345`:

| Email                        | Modo        | Administra                                                  |
| ---------------------------- | ----------- | ----------------------------------------------------------- |
| `demo@cancha.local`          | mock y API  | Liga Mazatlán Apertura 2027, Copa Puerto Invierno 2026, Liga Veteranos |
| `organizador2@cancha.local`  | solo mock   | Liga Cancún 2027                                            |

Una cuenta nueva (`/register`) empieza vacía: el dashboard muestra "Aún no tienes torneos" y una
guía de primeros pasos.

**Cómo funciona según `VITE_USE_MOCKS`**

- `true` — **auth mock (solo demo)**: usuarios y credenciales en la base mock del navegador
  (credenciales en una tabla aparte de `User`, en texto plano: es una demo). La sesión es el id del
  usuario en `localStorage` (`cancha:mock-session`), así sobrevive a F5. Los servicios mock aplican
  las mismas reglas de ownership que el backend (403 al editar lo ajeno). "Restablecer demo" vuelve
  a los dos usuarios iniciales.
- `false` — **API real (JWT)**: `authService` usa Axios. El access token vive solo en memoria
  (authStore + cliente HTTP) y se envía como `Authorization: Bearer`; el refresh token es una cookie
  **HttpOnly** que JS no puede leer (`withCredentials`). Nunca se guardan tokens en `localStorage`.
  Tras F5, `initializeAuth()` hace `POST /auth/refresh` → `GET /auth/me`. Ante un 401 el interceptor
  hace un único refresh compartido (single-flight), reintenta una vez y, si falla, lleva al login.

`localStorage` solo guarda, en ambos modos, el indicador no secreto `cancha:has-session`, para que
el header público muestre "Mi panel" sin llamar a `/auth` en cada visita anónima.

**Piezas**

- `services/authService.ts` — contrato `login / register / refresh / me / logout` con implementación
  mock y Axios; los componentes no saben cuál usan.
- `stores/auth.ts` — `user`, `accessToken`, `isAuthenticated`, `isInitializing`, `loading`, `error` y
  `login / register / logout / refresh / fetchMe / initializeAuth`.
- `router/index.ts` — guard de `/admin/**` y de rutas solo-invitado.
- `mocks/session.ts`, `mocks/ownership.ts` — sesión y reglas de propiedad del modo demo.

### Diseño y accesibilidad

- Identidad "cancha": verde profundo + acento lima, tipografía condensada (Barlow Condensed) para cifras.
- Móvil primero en el área pública: navegación inferior, tabla de posiciones con columnas
  reducidas y columna del equipo fija, carrusel de jugadores, marcadores compactos.
- Escudos generados con los colores del club cuando no hay logo.
- Labels en todos los campos, `aria-invalid`/`aria-describedby` en errores, diálogos con foco
  atrapado y cierre con Esc, estados de foco visibles, "saltar al contenido".

## Siguientes pasos

- Consumir los endpoints agregados del backend en lugar de colecciones completas.
- Flujo de "reclamar perfil" (User ↔ Player).

## Cobertura de torneos

Todos los torneos muestran la competición completa: equipos, partidos, tabla, goleadores y estructura. El modo de seguimiento parcial fue retirado. Los campos antiguos se normalizan a cobertura completa y equipos seguidos vacíos al leerlos; no se borran partidos, resultados ni estadísticas. La API rechaza `PARTIAL` y listas de equipos seguidos no vacías.

## Información y condiciones del torneo

Los torneos pueden incluir temporada, descripción, horarios, cuotas y costos, reglamento en texto, premios y contacto con privacidad por campo. El formulario conserva las reglas deportivas y reutiliza la fecha límite y el cupo existentes. El logo utiliza la integración actual de Cloudinary; los PDF no están habilitados. Ver [contrato e inventario](../docs/tournament-information.md).
