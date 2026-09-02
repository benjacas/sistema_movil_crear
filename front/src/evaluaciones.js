import { getEvaluacionesByAlumno } from '../../services/evaluaciones.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { evaluacionesDemo } from './mock/mockData.js'
import { formatFecha } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'evaluaciones', title: 'Evaluaciones' })
  cargarEvaluaciones(alumno)
}

async function cargarEvaluaciones(alumno) {
  const evaluaciones = await conFallback(
    () => getEvaluacionesByAlumno(alumno.id),
    evaluacionesDemo,
    'evaluaciones del alumno'
  )
  pintarEvaluaciones(evaluaciones)
}

function pintarEvaluaciones(evaluaciones) {
  const lista = document.getElementById('lista-evaluaciones')
  if (!evaluaciones.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400 px-1">Todavía no tenés evaluaciones cargadas.</li>'
    return
  }

  lista.innerHTML = evaluaciones.map((eva) => `
    <li class="bg-white rounded-2xl border border-primary-light p-4 shadow-card">
      <div class="flex items-center justify-between mb-2">
        <div>
          <p class="text-sm font-bold text-gray-800">${eva.plantillas_evaluacion?.nombre ?? 'Evaluación'}</p>
          <p class="text-xs text-gray-400">${eva.grupos?.nombre ?? ''} · ${formatFecha(eva.fecha)}</p>
        </div>
      </div>
      <ul class="space-y-2 mt-3 pt-3 border-t border-primary-light">
        ${(eva.evaluacion_detalle ?? []).map((detalle) => `
          <li class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold text-gray-700">${detalle.criterios?.nombre ?? 'Criterio'}</p>
              ${detalle.observacion ? `<p class="text-[11px] text-gray-400 mt-0.5">${detalle.observacion}</p>` : ''}
            </div>
            <span class="text-sm font-black text-primary shrink-0">${detalle.nota}</span>
          </li>
        `).join('')}
      </ul>
    </li>
  `).join('')
}
