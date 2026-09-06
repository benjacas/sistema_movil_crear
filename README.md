# sistema_movil_crear — Portal de Alumnos

PWA de autogestión para alumnos y familias de la Academia de Danzas CREAR. Es el complemento del sistema de administración interna ([SistemaWeb_CREAR](https://github.com/mbordon1/SistemaWeb_CREAR)): la idea es que un alumno pueda ver sus propios datos (cuotas, asistencia, grupos, evaluaciones) sin necesitar que la administracion se lo busque a mano.

## Estructura del repo

```
sistema_movil_crear/
├── lib/
│   └── supabase.js        # cliente de Supabase (createClient), lo usan todos los services/
├── services/               # capa de acceso a datos — funciones que hablan con Supabase
│   ├── alumnos.js
│   ├── auth.js              # login por DNI + fecha de nacimiento (portal de alumnos)
│   ├── asistencias.js
│   ├── cuotas.js
│   ├── evaluaciones.js
│   ├── grupos.js
│   ├── inscripciones.js
│   ├── notificaciones.js    # nuevo — tablas todavía no creadas, ver nota de schema en el archivo
│   ├── padres.js
│   ├── pagos.js
│   ├── profesores.js
│   ├── sueldos.js
│   └── dashboard.js
└── front/                  # la PWA en sí (lo único que corre en el navegador del alumno)
    ├── index.html            # módulo: login
    ├── home.html              # módulo: inicio
    ├── pagos.html             # módulo: estado de cuotas
    ├── asistencia.html        # módulo: % de asistencia e historial
    ├── grupos.html            # módulo: mis grupos y horarios
    ├── evaluaciones.html      # módulo: notas y devoluciones
    ├── perfil.html            # módulo: datos personales + tutores vinculados
    ├── notificaciones.html    # módulo: bandeja de avisos institucionales y automáticos
    ├── src/
    │   ├── styles.css          # entrada de Tailwind
    │   ├── sesion.js            # guarda/lee/borra el alumno logueado (localStorage)
    │   ├── guard.js             # protege páginas: sin sesión, redirige a index.html
    │   ├── login.js             # lógica del módulo de login
    │   ├── home.js              # lógica del módulo de inicio
    │   ├── pagos.js
    │   ├── asistencia.js
    │   ├── grupos.js
    │   ├── evaluaciones.js
    │   ├── perfil.js
    │   ├── notificaciones.js
    │   ├── components/
    │   │   ├── shell.js         # header + navegación inferior, compartidos por todas las páginas
    │   │   └── modal.js         # bottom sheet genérico (detalle de notificación, detalle de grupo/disciplina)
    │   ├── utils/
    │   │   └── format.js        # moneda, fechas, badges de estado, % de asistencia
    │   └── mock/
    │       ├── mockData.js      # fixtures con la MISMA forma que devuelve cada service real
    │       └── dataSource.js    # conFallback(): intenta Supabase real, si falla usa el mock
    ├── public/logo.png
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

### ¿Por qué `services/` y `lib/` están fuera de `front/`?

Porque son código **compartido con el sistema de administración**. Hoy en día `SistemaWeb_CREAR` tiene su propia copia idéntica de `services/` (en `src/services/`) — literalmente los mismos archivos, pegados a mano. La idea a futuro es unificar ambos repos en un monorepo (con workspaces) para que `services/` viva en un solo lugar y un cambio ahí se refleje automáticamente en los dos proyectos, sin copiar y pegar

Mientras tanto, dejamos `services/` y `lib/` en la raíz de este repo (no adentro de `front/`) a propósito, para que el día que se arme el monorepo sea un movimiento de carpetas simple, no una reescritura.

## Stack

| Herramienta | Para qué la usamos |
|---|---|
| **Vite** | Servidor de desarrollo con recarga automática, y arma los archivos finales (HTML/CSS/JS optimizados) para producción. No usamos ningún framework de UI (nada de React/Vue) — decisión consciente para no sumar una curva de aprendizaje extra; Vite funciona igual de bien con HTML y JavaScript "de toda la vida". |
| **Tailwind CSS** | Clases utilitarias para estilos (`px-4`, `rounded-2xl`, etc.) en vez de escribir CSS aparte. Los colores de marca (violeta `#6D5AE6`, etc.) están definidos una sola vez en `tailwind.config.js`, y son los mismos que usa `SistemaWeb_CREAR` para que ambos productos se sientan de la misma familia. |
| **vite-plugin-pwa** | Genera el manifest y el service worker que permiten "instalar" el sitio como si fuera una app nativa en el celular. |
| **Supabase** | Base de datos + cliente JS (`@supabase/supabase-js`). Es la misma base que usa el sistema de administración. |

### Multi-página, sin router de JavaScript

Cada pantalla del portal es un archivo `.html` independiente con su propio script (`login.js`, `home.js`, ...) — como un sitio web tradicional, con links `<a href="...">` normales entre páginas. No hay un router de JavaScript decidiendo qué mostrar. Esto es más simple de entender y depurar que una SPA, al costo de tener que actualizar el DOM a mano en cada script (buscar el elemento y cambiarlo) en vez de que se actualice solo.

Cuando se agrega una página nueva hay que sumarla en dos lugares:
1. El archivo `.html` en `front/` + su script en `front/src/`.
2. `front/vite.config.js` → `build.rollupOptions.input`, para que Vite la incluya al generar la build de producción.

## Cómo correrlo localmente

```bash
cd front
npm install
cp .env.example .env      # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre la URL que indique la terminal (por defecto `http://localhost:5173`).

## Estado actual

- ✅ **Login** (`index.html`): formulario de DNI + fecha de nacimiento, conectado a `services/auth.js` → `loginByDni()`. Guarda la sesión en `localStorage` (`sesion.js`) y redirige a `home.html`.
- ✅ **Inicio, Pagos, Asistencia, Grupos, Evaluaciones, Perfil, Notificaciones**: 7 páginas protegidas construidas y conectadas a sus services reales. El ícono de perfil y la campanita de notificaciones (con badge de no leídas) viven en el header, no en la barra inferior, para no saturarla en mobile. Todas comparten el mismo layout (`components/shell.js`) y quedan bloqueadas si no hay sesión (`guard.js`).
- ✅ **Detalle de disciplina en Grupos**: cada tarjeta de grupo abre un modal (`components/modal.js`, genérico y reutilizable) con profesora a cargo, horario, cupo disponible y cuota mensual. Usa `getGrupoById()`, nuevo en `services/grupos.js`.
- 🆕 **`services/notificaciones.js` es un archivo nuevo, no una tabla que ya existía**. Contiene la propuesta de schema (`notificaciones` + `notificaciones_leidas`) como comentario al principio del archivo — hay que validarla con el sistema de administración y crear las tablas en Supabase antes de que deje de andar en modo demo. También incluye `generarAvisosVencimientoProximo()` y `generarAvisosInasistenciaReiterada()`, pensadas para dispararse desde el sistema de administración (botón manual o cron), no desde el portal.
- 🚧 **Perfil — edición de datos**: el alumno puede editar teléfono, email y domicilio (`updateAlumno`). Nombre, DNI y fecha de nacimiento quedan de solo lectura porque DNI + fecha de nacimiento son la clave del login actual — si se cambia el modelo de login más adelante, revisar si conviene habilitarlos.
- 🚧 **Sin acceso a Supabase todavía**: cada página usa `mock/dataSource.js` → `conFallback()` para intentar la consulta real y, si falla (falta `.env`, tabla inexistente, etc.), mostrar datos de ejemplo (`mock/mockData.js`) con la misma forma exacta que devolvería Supabase. **Esto es temporal**: una vez que el `.env` tenga las credenciales reales y el schema esté migrado, hay que sacar el `conFallback(...)` de cada página y dejar solo la llamada al service — no hace falta tocar nada más.
- ⬜ **Pago electrónico (Mercado Pago)**: el botón "Pagar" en `pagos.html` está deshabilitado a propósito; la integración con la pasarela de pago es un módulo aparte, todavía no empezado.
- ⬜ **Toma de asistencia por profesoras / Liquidación de sueldos / Venta de entradas**: son los módulos del rol Profesor y del módulo Eventos — fuera del alcance de esta primera etapa (autenticación + estructura base + rol Alumno/Tutor).

## Decisiones pendientes / a revisar

- **Login por DNI + fecha de nacimiento** (`services/auth.js`) es una verificación de identidad simple, **no es autenticación real** (no hay contraseña, no usa Supabase Auth). El sistema de administración sí usa `supabase.auth.signInWithPassword` para el staff. Si la base tiene Row Level Security (RLS) activado, puede que las consultas anónimas del portal no traigan datos — hay que probarlo contra la base real y, si hace falta, migrar a un login más robusto (magic link / OTP por email, por ejemplo). **Esto también condiciona el uso de RLS + views**: sin `auth.uid()` real, no se puede restringir a nivel de base de datos que cada alumno vea solo lo suyo.
- **Views para el portal**: se evaluó usar `VIEW`/`MATERIALIZED VIEW` en Supabase para simplificar los joins que hoy se arman a mano en JS (ver comentarios "BUG-FIX" en `services/alumnos.js`, `services/dashboard.js`, etc.) y para no acoplar el portal a tablas grandes del sistema de gestión académica. Pendiente de definir junto con el otro proyecto una vez que haya acceso a la base real.
- **Compartir `services/` de verdad** (monorepo con workspaces)
