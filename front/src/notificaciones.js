import { getNotificacionesByAlumno, marcarComoLeida, marcarTodasComoLeidas } from '../../services/notificaciones.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { abrirModal } from './components/modal.js'
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

if (sesion) {
  renderShell({ active: 'notificaciones', title: 'Notificaciones' })
  cargarNotificaciones(sesion)

  document.getElementById('btn-marcar-todas').addEventListener('click', () => marcarTodas(sesion))
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
  const ctaInfo = CTA_POR_TIPO[notificacion.tipo]

  abrirModal(`
    <div class="flex items-center gap-3 mb-3 pr-6">
      <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 ${info.classes}">
        ${info.letra}
      </div>
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">${info.label}</p>
        <p class="text-base font-bold text-gray-800">${notificacion.titulo}</p>
      </div>
    </div>
    <p class="text-xs text-gray-400 mb-3">${formatFechaHora(notificacion.fecha_creacion)}</p>
    <p class="text-sm text-gray-700 leading-relaxed">${notificacion.mensaje}</p>
    ${ctaInfo ? `
      <a href="${ctaInfo.href}" class="block mt-5 w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold text-center hover:bg-primary-dark transition-colors">
        ${ctaInfo.label}
      </a>
    ` : ''}
  `)

  if (!notificacion.leida) marcarUna(sesion, notificacion_id)
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

