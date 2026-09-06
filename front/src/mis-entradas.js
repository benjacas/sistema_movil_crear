import { getEntradasByAlumno } from '../../services/eventos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { entradasAlumnoDemo } from './mock/mockData.js'
import { formatFecha, formatHora, badgeEstadoEntrada } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'eventos', title: 'Mis entradas' })
  cargarEntradas(alumno)
}

async function cargarEntradas(alumno) {
  const entradas = await conFallback(
    () => getEntradasByAlumno(alumno.id),
    entradasAlumnoDemo,
    'entradas del alumno'
  )
  pintarEntradas(entradas)
}

function agruparPorEvento(entradas) {
  const grupos = new Map()
  for (const entrada of entradas) {
    if (!grupos.has(entrada.evento_id)) {
      grupos.set(entrada.evento_id, { evento: entrada.eventos, entradas: [] })
    }
    grupos.get(entrada.evento_id).entradas.push(entrada)
  }
  return [...grupos.values()]
}

function pintarEntradas(entradas) {
  const contenedor = document.getElementById('lista-mis-entradas')
  if (!entradas.length) {
    contenedor.innerHTML = '<p class="text-xs text-gray-400 px-1">Todavía no compraste entradas a ningún evento.</p>'
    return
  }

  const grupos = agruparPorEvento(entradas)
  contenedor.innerHTML = grupos.map((grupo) => `
    <div class="bg-white rounded-2xl border border-primary-light shadow-card p-4">
      <p class="text-sm font-bold text-gray-800">${grupo.evento?.nombre ?? 'Evento'}</p>
      <p class="text-xs text-gray-400 mb-3">
        ${formatFecha(grupo.evento?.fecha)} · ${formatHora(grupo.evento?.hora)} hs · ${grupo.evento?.lugar ?? ''}
      </p>
      <div class="space-y-2">
        ${grupo.entradas.map((entrada) => {
          const badge = badgeEstadoEntrada(entrada.estado)
          return `
            <div class="p-3 rounded-xl bg-primary-subtle">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs text-gray-500">Fila ${entrada.fila} · Butaca ${entrada.columna}</p>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 shrink-0 ${badge.classes}">
                  ${badge.label}
                </span>
              </div>
              ${entrada.estado === 'pagado' ? `
                <p class="text-center font-mono text-lg font-bold tracking-[0.3em] text-gray-800 mt-2">${entrada.codigo}</p>
                <p class="text-center text-[10px] text-gray-300">Presentá este código en la puerta</p>
              ` : `
                <p class="text-xs text-gray-400 mt-2">Código: <span class="font-mono">${entrada.codigo}</span></p>
              `}
            </div>
          `
        }).join('')}
      </div>
    </div>
  `).join('')
}
