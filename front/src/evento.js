import {
  getEventoById,
  getAsientosOcupados,
  crearReservaTemporal,
  cancelarReserva,
  crearPreferenciaPago,
} from '../../services/eventos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { eventosDemo, asientosOcupadosDemoPorEvento } from './mock/mockData.js'
import { formatFecha, formatHora, formatMoneda } from './utils/format.js'

const alumno = requireSesion()
const eventoId = new URLSearchParams(window.location.search).get('id')

let evento = null
let ocupados = new Set()
const deshabilitados = new Set()
const seleccionados = new Set()
// Asientos que ya tienen una fila real en `entradas` (pendiente_pago) creada
// en esta sesión — para no volver a intentar reservarlos si el alumno agrega
// más asientos después de un intento parcial, y para poder cancelarlos si
// los deselecciona antes de pagar.
const entradasPorAsiento = new Map()

if (alumno) {
  renderShell({ active: 'eventos', title: 'Detalle del evento' })
  if (!eventoId) {
    mostrarError('Falta indicar qué evento querés ver.')
  } else {
    cargarEvento(eventoId)
  }
  document.getElementById('btn-reservar').addEventListener('click', reservarYPagar)
}

async function cargarEvento(id) {
  const [eventoCargado, ocupadosCargados] = await Promise.all([
    conFallback(() => getEventoById(id), eventosDemo.find((e) => e.id === id) ?? null, 'detalle del evento'),
    conFallback(() => getAsientosOcupados(id), asientosOcupadosDemoPorEvento[id] ?? [], 'asientos ocupados'),
  ])

  if (!eventoCargado) {
    mostrarError('No encontramos este evento.')
    return
  }

  evento = eventoCargado
  ocupados = new Set(ocupadosCargados)
  for (const key of evento.asientos_deshabilitados ?? []) deshabilitados.add(key)

  pintarInfoEvento(evento)
  pintarMapa()
  document.getElementById('evento-contenido').classList.remove('hidden')
}

function mostrarError(texto) {
  document.getElementById('evento-info').innerHTML = `<p class="text-sm text-gray-500 py-6 text-center">${texto}</p>`
}

function pintarInfoEvento(evento) {
  document.getElementById('evento-info').innerHTML = `
    <p class="text-lg font-bold text-gray-800 font-display">${evento.nombre}</p>
    <p class="text-xs text-gray-400 mt-1">${formatFecha(evento.fecha)} · ${formatHora(evento.hora)} hs · ${evento.lugar}</p>
    ${evento.descripcion ? `<p class="text-xs text-gray-500 mt-2">${evento.descripcion}</p>` : ''}
    <p class="text-sm font-black text-primary mt-3">${formatMoneda(evento.precio_entrada)} <span class="text-xs font-normal text-gray-400">por entrada</span></p>
  `
}

function pintarMapa() {
  const contenedor = document.getElementById('mapa-asientos')
  const filas = []

  for (let fila = 1; fila <= evento.filas; fila++) {
    const butacas = []
    for (let columna = 1; columna <= evento.columnas; columna++) {
      const key = `${fila}-${columna}`
      if (deshabilitados.has(key)) {
        butacas.push('<span class="w-7 h-7 inline-block shrink-0"></span>')
        continue
      }

      const esMio = entradasPorAsiento.has(key)
      const esSeleccionado = seleccionados.has(key)
      const esOcupado = !esMio && ocupados.has(key)
      const clases = esOcupado
        ? 'bg-gray-200 text-gray-300 cursor-not-allowed'
        : esSeleccionado
          ? 'bg-primary text-white cursor-pointer'
          : 'bg-white border border-primary-light text-gray-400 hover:border-primary cursor-pointer'

      butacas.push(`
        <button
          type="button"
          data-fila="${fila}"
          data-columna="${columna}"
          ${esOcupado ? 'disabled' : ''}
          title="Fila ${fila}, Butaca ${columna}"
          class="w-7 h-7 shrink-0 rounded-md text-[9px] font-semibold flex items-center justify-center transition-colors ${clases}"
        >${columna}</button>
      `)
    }
    filas.push(`
      <div class="flex items-center gap-1.5">
        <span class="w-4 text-[9px] text-gray-300 shrink-0 text-center">${fila}</span>
        ${butacas.join('')}
      </div>
    `)
  }

  contenedor.innerHTML = filas.join('')
  contenedor.querySelectorAll('button[data-fila]').forEach((boton) => {
    boton.addEventListener('click', () => alternarAsiento(Number(boton.dataset.fila), Number(boton.dataset.columna)))
  })
}

async function alternarAsiento(fila, columna) {
  const key = `${fila}-${columna}`
  if (ocupados.has(key) && !entradasPorAsiento.has(key)) return

  if (seleccionados.has(key)) {
    seleccionados.delete(key)
    const entrada_id = entradasPorAsiento.get(key)
    entradasPorAsiento.delete(key)
    pintarMapa()
    actualizarResumen()
    if (entrada_id) {
      // Optimista: al alumno ya se le ve deseleccionado. Si falla la
      // cancelación remota, el asiento igual se libera solo a los 10 minutos.
      try {
        await cancelarReserva(entrada_id)
      } catch (error) {
        console.warn('[eventos] no se pudo liberar la reserva remota:', error.message)
      }
    }
    return
  }

  seleccionados.add(key)
  pintarMapa()
  actualizarResumen()
}

function actualizarResumen() {
  const resumen = document.getElementById('resumen-seleccion')
  const cantidad = seleccionados.size
  if (!cantidad) {
    resumen.classList.add('hidden')
    return
  }
  resumen.classList.remove('hidden')
  document.getElementById('resumen-cantidad').textContent = cantidad === 1 ? '1 entrada' : `${cantidad} entradas`
  document.getElementById('resumen-total').textContent = formatMoneda(cantidad * evento.precio_entrada)
}

async function reservarYPagar() {
  if (!seleccionados.size) return
  const boton = document.getElementById('btn-reservar')
  boton.disabled = true
  boton.textContent = 'Reservando...'
  ocultarMensajeMapa()

  try {
    const asientosNuevos = [...seleccionados]
      .filter((key) => !entradasPorAsiento.has(key))
      .map((key) => {
        const [fila, columna] = key.split('-').map(Number)
        return { fila, columna }
      })

    if (asientosNuevos.length > 0) {
      const { reservadas, noDisponibles } = await crearReservaTemporal(evento.id, alumno.id, asientosNuevos)
      for (const r of reservadas) entradasPorAsiento.set(`${r.fila}-${r.columna}`, r.id)

      if (noDisponibles.length > 0) {
        for (const nd of noDisponibles) seleccionados.delete(`${nd.fila}-${nd.columna}`)
        ocupados = new Set(await conFallback(
          () => getAsientosOcupados(evento.id),
          asientosOcupadosDemoPorEvento[evento.id] ?? [],
          'asientos ocupados'
        ))
        pintarMapa()
        actualizarResumen()
        const lista = noDisponibles.map((nd) => `Fila ${nd.fila}, Butaca ${nd.columna}`).join(' · ')
        mostrarMensajeMapa(`Estos asientos ya no estaban disponibles: ${lista}. Elegí otro para reemplazarlos.`, 'error')
        return
      }
    }

    const entrada_ids = [...seleccionados].map((key) => entradasPorAsiento.get(key))
    const { init_point } = await crearPreferenciaPago(entrada_ids)
    if (!init_point) throw new Error('Mercado Pago no devolvió un link de pago.')
    window.location.href = init_point
  } catch (error) {
    mostrarMensajeMapa('No se pudo completar la reserva: ' + error.message, 'error')
  } finally {
    boton.disabled = false
    boton.textContent = 'Reservar y pagar'
  }
}

function mostrarMensajeMapa(texto, tipo = 'error') {
  const mensaje = document.getElementById('mensaje-mapa')
  mensaje.textContent = texto
  mensaje.className = `text-xs rounded-xl px-4 py-2.5 ${
    tipo === 'error'
      ? 'bg-red-50 text-red-600 border border-red-200'
      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  }`
}

function ocultarMensajeMapa() {
  document.getElementById('mensaje-mapa').className = 'hidden text-xs rounded-xl px-4 py-2.5'
}
