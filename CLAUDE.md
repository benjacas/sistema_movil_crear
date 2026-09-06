# CREAR — Portal de Autogestión (Alumno/Tutor)

PWA de autogestión para la Escuela de Danzas CREAR. Los alumnos/tutores consultan
horarios, pagan cuotas, ven asistencia, notas y notifican avisos institucionales.

**Comparte base de datos en Supabase** con un sistema de gestión administrativa
que está construyendo una compañera de grupo, en paralelo, como proyecto aparte.

## Stack

Vite + HTML multi-página (sin router, sin framework) + Tailwind CSS + JavaScript vanilla + Supabase.

## Regla crítica: `services/` y `lib/` son código COMPARTIDO

Estas dos carpetas, en la raíz del repo (fuera de `front/`), son literalmente el
mismo código que usa el sistema de administración de mi compañera. Reglas:

- **Nunca modificar una función que ya existe** en `services/*.js`. Si hace falta
  otro comportamiento, agregar una función nueva al final del archivo con un
  comentario tipo `//----------------------------SISTEMA DE AUTOGESTION MOVIL-----------------------------------------`
  para que sea obvio en un diff qué agregó cada proyecto.
- Si una tarea requiere una tabla o columna que no existe todavía en Supabase,
  documentar el schema propuesto como comentario al principio del archivo del
  service (ver `services/notificaciones.js` como ejemplo) y avisarme para
  coordinarlo con mi compañera antes de asumir que ya existe.
- `lib/supabase.js` crea el cliente de Supabase a partir de `front/.env`
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Hoy tiene placeholders, no
  credenciales reales — es esperado que las consultas reales fallen.

## Cómo correr / buildear

`lib/` y `services/` están fuera de `front/`, así que Node necesita
`node_modules` en **dos lugares**:

```bash
npm install          # en la raíz del repo (para que lib/services resuelvan @supabase/supabase-js)
cd front && npm install
npm run dev           # o: npm run build
```

Si el build falla con "Cannot find module '@supabase/supabase-js'" al importar
algo de `services/`, es este problema — correr `npm install` en la raíz.

## Patrón de datos: modo demo sin credenciales reales

Todavía no hay acceso a Supabase. Cada página usa `front/src/mock/dataSource.js`
→ `conFallback(consultaReal, valorMock, etiqueta)`: intenta el service real y,
si falla, usa un mock con la MISMA forma exacta (`front/src/mock/mockData.js`).

```js
const cuotas = await conFallback(() => getCuotasByAlumno(alumno.id), cuotasDemo, 'cuotas del alumno')
```

Al construir una página nueva que lee datos: escribir el mock primero (copiando
la forma que devuelve el service real), después envolver la llamada con
`conFallback`. El día que haya credenciales reales, no hay que tocar nada.

**Excepción:** las mutaciones (crear/editar/borrar) NO se envuelven en
`conFallback` — si fallan, hay que mostrarle al usuario que no se pudo guardar
(ver `perfil.js` → `guardarCambios()` como referencia), nunca simular un éxito.

## Estructura de una página protegida

Toda página del portal (menos `index.html`, el login) sigue este esqueleto:

```html
<header id="app-header"></header>
<main>...contenido propio...</main>
<nav id="app-nav"></nav>
<script type="module" src="/src/mipagina.js"></script>
```

```js
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'

const alumno = requireSesion()      // redirige a index.html si no hay sesión
if (alumno) {
  renderShell({ active: 'mipagina', title: 'Mi Página' })
  cargarDatos(alumno)
}
```

Al agregar una página nueva, sumarla también a `front/vite.config.js` →
`build.rollupOptions.input`, si no Vite no la incluye en `npm run build`.

## Componentes compartidos (`front/src/components/`)

- **`shell.js`** → `renderShell({ active, title })`: pinta el header (logo,
  campanita de notificaciones con badge, ícono de perfil, botón salir) y el
  nav inferior (Inicio/Pagos/Asistencia/Grupos/Notas). La lista de tabs vive
  en la constante `TABS` al principio del archivo.
- **`modal.js`** → `abrirModal(html)` / `cerrarModal()`: bottom-sheet genérico,
  se inyecta solo una vez en el DOM. Usarlo para cualquier detalle/confirmación
  en vez de crear un modal nuevo por página (ver `notificaciones.js` y
  `grupos.js` como ejemplos de uso).

## Utilidades (`front/src/utils/format.js`)

`formatMoneda`, `formatFecha`, `formatFechaHora`, `formatMesLabel`,
`badgeEstadoCuota`, `infoTipoNotificacion`, `calcularPorcentajeAsistencia`.
Cualquier lógica de "cómo se muestra un dato" va acá, no repetida en cada página.

## `front/src/utils/horario.js` — parser de horario en texto libre

`grupos.horario` es texto libre (`"Lunes y Miércoles 18:00–19:30"`), no datos
estructurados. `parsearHorario(texto)` intenta extraer día(s) + rango horario
para poder armar calendarios (ver `grupos.js` → calendario semanal). Es
"mejor esfuerzo": si el texto no matchea, devuelve `[]` y hay que mostrar el
texto original como respaldo, nunca ocultarlo. Documentado como decisión
pendiente abajo — el fix real a largo plazo es estructurar ese campo.

## Diseño

- Layout mobile-first: `max-w-md mx-auto`, contenedor `flex flex-col h-svh`.
- Tarjetas: `bg-white rounded-2xl border border-primary-light shadow-card p-4/p-5`.
- Colores custom de Tailwind: `primary`, `primary-light`, `primary-subtle`,
  `primary-dark` (ver `front/tailwind.config.js`).
- Tipografía: Inter (texto general) + Playfair Display (`font-display`, para
  títulos destacados). Ya están cargadas en cada `<head>`.
- Es PWA (`vite-plugin-pwa`, `manifest.webmanifest` generado en build).

## Estado actual (actualizar al terminar cada tarea)

✅ Login (DNI + fecha de nacimiento — **no es Supabase Auth real**, ver
"Decisiones pendientes" abajo) · Home · Pagos · Asistencia · Grupos (con
detalle de disciplina en modal) · Evaluaciones · Perfil (editable) ·
Notificaciones (bandeja + detalle en modal, con CTA según tipo) ·
**Eventos y venta de entradas**: `services/eventos.js` con schema
propuesto, Edge Functions de Mercado Pago (`supabase/functions/`) y las
4 páginas del portal (`eventos.html` cartelera, `evento.html` con mapa
de asientos interactivo + reserva/pago, `evento-resultado.html`,
`mis-entradas.html`) — acceso desde un 3er ícono en el header. Probado
en modo demo con mock data (grid de asientos, selección, y el manejo de
error de `crearReservaTemporal`/`crearPreferenciaPago` cuando falla la
conexión). Todavía no se probó contra Mercado Pago ni Supabase reales
(faltan los pasos manuales — ver "Decisiones pendientes").

⬜ Sin empezar: (ninguno por ahora).

⬜ Sin empezar: (ninguno por ahora — Eventos es el último módulo grande del alcance).

## Decisiones pendientes (no resolver sin consultar)

- El login por DNI+fecha de nacimiento no usa Supabase Auth. Si la base tiene
  RLS activado, las queries anónimas del portal pueden no traer nada. No
  migrar el login por tu cuenta — es una decisión a coordinar.
- Tablas `notificaciones` / `notificaciones_leidas` (schema propuesto dentro
  de `services/notificaciones.js`) todavía no existen en Supabase real.
- Se evaluó usar VIEWs de Supabase para simplificar los joins que hoy se arman
  a mano en JS en varios services — pendiente de diseñar junto al otro proyecto.
- `grupos.horario` es texto libre; el calendario semanal lo parsea con
  mejor esfuerzo (`utils/horario.js`). A largo plazo convendría estructurarlo
  (día + hora_inicio + hora_fin) — pendiente de proponerlo al otro proyecto.
- **Mercado Pago requiere pasos manuales fuera de código**, que no puede
  hacer Claude Code: crear cuenta de Developer, generar credenciales de
  prueba, guardar `MP_ACCESS_TOKEN` como secreto de Supabase
  (`supabase secrets set MP_ACCESS_TOKEN=...`), deployar las Edge Functions
  (`supabase functions deploy ...`) y configurar la URL del webhook en el
  panel de Mercado Pago. Ver el mensaje de tarea del módulo de Eventos.

## Flujo de trabajo

La planificación (qué construir, en qué orden, specs de cada feature) se
define en una conversación aparte con Claude en claude.ai — a vos te van a
llegar como un mensaje de tarea con el detalle ya definido. Si algo del spec
no cierra con el código real (un service que no existe, un campo distinto al
esperado), avisar en vez de asumir.
