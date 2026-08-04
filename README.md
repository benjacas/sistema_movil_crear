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
│   ├── padres.js
│   ├── pagos.js
│   ├── profesores.js
│   ├── sueldos.js
│   └── dashboard.js
└── front/                  # la PWA en sí (lo único que corre en el navegador del alumno)
    ├── index.html            # módulo: login
    ├── home.html              # módulo: inicio
    ├── src/
    │   ├── styles.css          # entrada de Tailwind
    │   ├── session.js          # guarda/lee/borra el alumno logueado (localStorage)
    │   ├── login.js             # lógica del módulo de login
    │   └── home.js               # lógica del módulo de inicio
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

- ✅ **Login** (`index.html`): formulario de DNI + fecha de nacimiento, conectado a `services/auth.js` → `loginByDni()`. Si coincide, guarda la sesión en `localStorage` (`session.js`) y no navega todavía a ningún lado (falta conectar el redirect a Inicio).
- 🚧 **Inicio** (`home.html`): maqueta visual con datos de ejemplo fijos en el HTML (no llama a Supabase todavía). Falta: traer los datos reales del alumno logueado usando `services/pagos.js` y `services/inscripciones.js`, y bloquear el acceso si no hay sesión.
- ⬜ Pagos, Asistencia, Grupos, Evaluaciones: no empezados. Los links de la navegación inferior ya apuntan a `pagos.html`, `asistencia.html`, `grupos.html`, `evaluaciones.html`, que todavía no existen (dan 404 a propósito, hasta que se construyan).

## Decisiones pendientes / a revisar

- **Login por DNI + fecha de nacimiento** (`services/auth.js`) es una verificación de identidad simple, **no es autenticación real** (no hay contraseña, no usa Supabase Auth). El sistema de administración sí usa `supabase.auth.signInWithPassword` para el staff. Si la base tiene Row Level Security (RLS) activado, puede que las consultas anónimas del portal no traigan datos — hay que probarlo contra la base real y, si hace falta, migrar a un login más robusto (magic link / OTP por email, por ejemplo).
- **Compartir `services/` de verdad** (monorepo con workspaces) está pendiente de charlarlo con Marti, dueña del repo `SistemaWeb_CREAR`.
