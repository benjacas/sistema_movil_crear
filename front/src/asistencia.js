import { getAsistenciasByAlumno } from '../../services/asistencias.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { asistenciasDemo } from './mock/mockData.js'
import { formatFecha, calcularPorcentajeAsistencia } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'asistencia', title: 'Asistencia' })
  cargarAsistencias(alumno)
}

async function cargarAsistencias(alumno) {
  const registros = await conFallback(() => getAsistenciasByAlumno(alumno.id), asistenciasDemo, 'asistencias del alumno')
  pintarResumenPorGrupo(registros)
  pintarHistorial(registros)
}

function agruparPorGrupo(registros) {
  const grupos = {}
  for (const registro of registros) {
    const nombre = registro.grupos?.nombre ?? 'Sin grupo'
    if (!grupos[nombre]) grupos[nombre] = []
    grupos[nombre].push(registro)
  }
  return grupos
}

function pintarResumenPorGrupo(registros) {
  const contenedor = document.getElementById('resumen-por-grupo')
  if (!registros.length) {
    contenedor.innerHTML = '<p class="col-span-2 text-xs text-gray-400 px-1">Todavía no hay registros de asistencia.</p>'
    return
  }

  const porGrupo = agruparPorGrupo(registros)
  contenedor.innerHTML = Object.entries(porGrupo).map(([nombre, regs]) => {
    const porcentaje = calcularPorcentajeAsistencia(regs)
    const color = porcentaje >= 80 ? 'text-emerald-500' : porcentaje >= 60 ? 'text-amber-500' : 'text-red-500'
    return `
      <div class="bg-white rounded-2xl border border-primary-light p-4 shadow-card">
        <p class="text-2xl font-black ${color}">${porcentaje}%</p>
        <p class="text-xs text-gray-400 mt-0.5">${nombre}</p>
      </div>
    `
  }).join('')
}

function pintarHistorial(registros) {
  const lista = document.getElementById('lista-asistencias')
  if (!registros.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400">Sin registros todavía.</li>'
    return
  }

  const ordenados = [...registros].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
  lista.innerHTML = ordenados.map((registro) => `
    <li class="flex items-center justify-between p-2.5 rounded-xl bg-primary-subtle">
      <div>
        <p class="text-sm font-semibold text-gray-800">${registro.grupos?.nombre ?? 'Grupo'}</p>
        <p class="text-xs text-gray-400">${formatFecha(registro.fecha)}</p>
      </div>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${
        registro.presente
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-red-50 text-red-700 ring-red-200'
      }">
        ${registro.presente ? 'Presente' : 'Ausente'}
      </span>
    </li>
  `).join('')
}
