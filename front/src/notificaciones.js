import { getNotificacionesByAlumno, marcarComoLeida, marcarTodasComoLeidas } from '../../services/notificaciones.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { notificacionesDemo } from './mock/mockData.js'
import { formatFechaHora, infoTipoNotificacion } from './utils/format.js'

// A dónde manda el botón de acción del modal, según el tipo de aviso.
// 'institucional' no tiene CTA: es solo informativo.
const CTA_POR_TIPO = {
  vencimiento: { label: 'Ver mis pagos', href: 'pagos.html' },
  inasistencia: { label: 'Ver mi asistencia', href: 'asistencia.html' },
  // 'evento' queda sin CTA hasta que exista el módulo de Eventos.
}

const sesion = requireSesion()
let notificacionesActuales = []

const modal = document.getElementById('modal-notificacion')

if (sesion) {
  renderShell({ active: 'notificaciones', title: 'Notificaciones' })
  cargarNotificaciones(sesion)

  document.getElementById('btn-marcar-todas').addEventListener('click', () => marcarTodas(sesion))
  document.getElementById('btn-cerrar-modal').addEventListener('click', cerrarModal)
  document.getElementById('modal-backdrop').addEventListener('click', cerrarModal)
}

async function cargarNotificaciones(sesion) {
  const notificaciones = await conFallback(
    () => getNotificacionesByAlumno(sesion.id),
    notificacionesDemo,
    'notificaciones del alumno'
  )
  notificacionesActuales = notificaciones
  pintarNotificaciones(notificaciones)
  document.getElementById('btn-marcar-todas').classList.toggle('hidden', !notificaciones.some((n) => !n.leida))
}

function pintarNotificaciones(notificaciones) {
  const lista = document.getElementById('lista-notificaciones')
  if (!notificaciones.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400 px-1">No tenés notificaciones todavía.</li>'
    return
  }

  lista.innerHTML = notificaciones.map((n) => {
    const info = infoTipoNotificacion(n.tipo)
    return `
      <li
        data-id="${n.id}"
        class="flex gap-3 p-4 rounded-2xl border shadow-card cursor-pointer transition-colors ${
          n.leida ? 'bg-white border-primary-light' : 'bg-primary-light/40 border-primary-light'
        }"
      >
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${info.classes}">
          ${info.letra}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold text-gray-800">${n.titulo}</p>
            ${!n.leida ? '<span class="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"></span>' : ''}
          </div>
          <p class="text-xs text-gray-500 mt-0.5 truncate">${n.mensaje}</p>
          <p class="text-[10px] text-gray-300 mt-1.5">${info.label} · ${formatFechaHora(n.fecha_creacion)}</p>
        </div>
      </li>
    `
  }).join('')

  lista.querySelectorAll('li[data-id]').forEach((li) => {
    li.addEventListener('click', () => abrirDetalle(sesion, li.dataset.id))
  })
}

function abrirDetalle(sesion, notificacion_id) {
  const notificacion = notificacionesActuales.find((n) => String(n.id) === String(notificacion_id))
  if (!notificacion) return

  const info = infoTipoNotificacion(notificacion.tipo)
  document.getElementById('modal-icono').className = `w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 ${info.classes}`
  document.getElementById('modal-icono').textContent = info.letra
  document.getElementById('modal-tipo').textContent = info.label
  document.getElementById('modal-titulo').textContent = notificacion.titulo
  document.getElementById('modal-fecha').textContent = formatFechaHora(notificacion.fecha_creacion)
  document.getElementById('modal-mensaje').textContent = notificacion.mensaje

  const cta = document.getElementById('modal-cta')
  const ctaInfo = CTA_POR_TIPO[notificacion.tipo]
  if (ctaInfo) {
    cta.href = ctaInfo.href
    cta.textContent = ctaInfo.label
    cta.classList.remove('hidden')
  } else {
    cta.classList.add('hidden')
  }

  modal.classList.remove('hidden')

  if (!notificacion.leida) marcarUna(sesion, notificacion_id)
}

function cerrarModal() {
  modal.classList.add('hidden')
}

async function marcarUna(sesion, notificacion_id) {
  const notificacion = notificacionesActuales.find((n) => String(n.id) === String(notificacion_id))
  if (!notificacion || notificacion.leida) return

  notificacion.leida = true // optimista: se ve al toque, aunque falle el guardado remoto
  pintarNotificaciones(notificacionesActuales)
  document.getElementById('btn-marcar-todas').classList.toggle('hidden', !notificacionesActuales.some((n) => !n.leida))

  try {
    await marcarComoLeida(notificacion_id, sesion.id)
  } catch (error) {
    console.warn('[modo demo] no se pudo guardar el estado de lectura:', error.message)
  }
}

async function marcarTodas(sesion) {
  const idsNoLeidas = notificacionesActuales.filter((n) => !n.leida).map((n) => n.id)
  if (!idsNoLeidas.length) return

  notificacionesActuales = notificacionesActuales.map((n) => ({ ...n, leida: true }))
  pintarNotificaciones(notificacionesActuales)
  document.getElementById('btn-marcar-todas').classList.add('hidden')

  try {
    await marcarTodasComoLeidas(sesion.id, idsNoLeidas)
  } catch (error) {
    console.warn('[modo demo] no se pudo guardar el estado de lectura:', error.message)
  }
}

