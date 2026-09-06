import { cerrarSesion, obtenerSesion } from '../sesion.js'
import { getCantidadNoLeidas } from '../../../services/notificaciones.js'
import { conFallback } from '../mock/dataSource.js'
import { notificacionesDemo } from '../mock/mockData.js'

// Un solo lugar para la lista de tabs. Agregar una página nueva al portal
// es sumar un item acá (más el punto 2 del README: vite.config.js input).
const TABS = [
  { key: 'home', label: 'Inicio', href: 'home.html' },
  { key: 'pagos', label: 'Pagos', href: 'pagos.html' },
  { key: 'asistencia', label: 'Asistencia', href: 'asistencia.html' },
  { key: 'grupos', label: 'Grupos', href: 'grupos.html' },
  { key: 'evaluaciones', label: 'Notas', href: 'evaluaciones.html' },
]

/**
 * Dibuja el header superior y la navegación inferior dentro de los
 * contenedores #app-header y #app-nav de la página, y conecta el botón
 * de cerrar sesión. Cada página solo necesita:
 *
 *   <header id="app-header"></header>
 *   ...contenido propio de la página...
 *   <nav id="app-nav"></nav>
 *
 *   <script type="module">
 *     import { renderShell } from './components/shell.js'
 *     renderShell({ active: 'pagos', title: 'Pagos' })
 *   </script>
 */
export function renderShell({ active, title }) {
  const header = document.getElementById('app-header')
  const nav = document.getElementById('app-nav')

  if (header) {
    header.className = 'bg-white border-b border-primary-light px-4 h-14 flex items-center justify-between shrink-0 sticky top-0 z-10'
    header.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style="background: linear-gradient(135deg, #6D5AE6, #8B7AEE)">
          <span class="text-white text-[10px] font-black">C</span>
        </div>
        <span class="text-sm font-bold text-gray-800">${title}</span>
      </div>
      <div class="flex items-center gap-3">
        <a href="notificaciones.html" title="Notificaciones" class="relative w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          active === 'notificaciones' ? 'bg-primary-light text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary-light'
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
          <span id="badge-notificaciones" class="hidden absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold items-center justify-center"></span>
        </a>
        <a href="eventos.html" title="Eventos" class="w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          active === 'eventos' ? 'bg-primary-light text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary-light'
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/><path d="M9 5v14"/></svg>
        </a>
        <a href="perfil.html" title="Mi perfil" class="w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          active === 'perfil' ? 'bg-primary-light text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary-light'
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </a>
        <button id="btn-logout" class="text-xs font-semibold text-gray-400 hover:text-primary transition-colors">
          Salir
        </button>
      </div>
    `
    header.querySelector('#btn-logout').addEventListener('click', () => {
      cerrarSesion()
      window.location.href = 'index.html'
    })

    cargarBadgeNotificaciones()
  }

  if (nav) {
    nav.className = 'bg-white border-t border-primary-light pb-safe shrink-0'
    nav.innerHTML = `
      <div class="flex">
        ${TABS.map((tab) => `
          <a href="${tab.href}" class="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
            tab.key === active ? 'text-primary' : 'text-gray-400 hover:text-primary'
          }">
            <div class="px-3 py-1 rounded-xl ${tab.key === active ? 'bg-primary-light' : ''}">
              <span class="text-[10px] font-semibold leading-none">${tab.label}</span>
            </div>
          </a>
        `).join('')}
      </div>
    `
  }
}

async function cargarBadgeNotificaciones() {
  const sesion = obtenerSesion()
  if (!sesion) return
  const noLeidasMock = notificacionesDemo.filter((n) => !n.leida).length
  const cantidad = await conFallback(() => getCantidadNoLeidas(sesion.id), noLeidasMock, 'notificaciones sin leer')
  const badge = document.getElementById('badge-notificaciones')
  if (!badge || !cantidad) return
  badge.textContent = cantidad > 9 ? '9+' : String(cantidad)
  badge.classList.remove('hidden')
  badge.classList.add('flex')
}
