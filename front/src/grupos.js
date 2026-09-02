import { getInscripcionesActivasByAlumno } from '../../services/inscripciones.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { inscripcionesDemo } from './mock/mockData.js'
import { formatFecha } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'grupos', title: 'Grupos' })
  cargarGrupos(alumno)
}

async function cargarGrupos(alumno) {
  const inscripciones = await conFallback(
    () => getInscripcionesActivasByAlumno(alumno.id),
    inscripcionesDemo,
    'grupos del alumno'
  )
  pintarGrupos(inscripciones)
}

function pintarGrupos(inscripciones) {
  const lista = document.getElementById('lista-grupos-detalle')
  if (!inscripciones.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400 px-1">Todavía no tenés grupos asignados.</li>'
    return
  }

  lista.innerHTML = inscripciones.map((i) => `
    <li class="bg-white rounded-2xl border border-primary-light p-4 shadow-card">
      <div class="flex items-center justify-between">
        <p class="text-sm font-bold text-gray-800">${i.grupo?.nombre ?? 'Grupo'}</p>
        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary">
          ${i.grupo?.nivel ?? '—'}
        </span>
      </div>
      <p class="text-xs text-gray-400 mt-1.5">${i.grupo?.horario ?? 'Horario a confirmar'}</p>
      <p class="text-[10px] text-gray-300 mt-2">Inscripto desde el ${formatFecha(i.fecha)}</p>
    </li>
  `).join('')
}
