import { getEventosDisponibles } from '../../services/eventos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { eventosDemo } from './mock/mockData.js'
import { formatFecha, formatHora, formatMoneda } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'eventos', title: 'Eventos' })
  cargarEventos()
}

async function cargarEventos() {
  const eventos = await conFallback(() => getEventosDisponibles(), eventosDemo, 'eventos disponibles')
  pintarEventos(eventos)
}

function pintarEventos(eventos) {
  const lista = document.getElementById('lista-eventos')
  if (!eventos.length) {
    lista.innerHTML = '<p class="text-xs text-gray-400 px-1">No hay eventos disponibles por ahora.</p>'
    return
  }

  lista.innerHTML = eventos.map((e) => `
    <a
      href="evento.html?id=${e.id}"
      class="block bg-white rounded-2xl border border-primary-light shadow-card overflow-hidden active:scale-[.99] transition-transform"
    >
      <div class="p-5">
        <p class="text-base font-bold text-gray-800 font-display">${e.nombre}</p>
        <p class="text-xs text-gray-400 mt-1">${formatFecha(e.fecha)} · ${formatHora(e.hora)} hs</p>
        <p class="text-xs text-gray-400 mt-0.5">${e.lugar}</p>
        <div class="flex items-center justify-between mt-4">
          <span class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary-light text-primary">Entradas disponibles</span>
          <span class="text-sm font-black text-gray-800">${formatMoneda(e.precio_entrada)}</span>
        </div>
      </div>
    </a>
  `).join('')
}
