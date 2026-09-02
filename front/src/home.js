import { getInscripcionesActivasByAlumno } from '../../services/inscripciones.js'
import { getCuotasByAlumno } from '../../services/pagos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { inscripcionesDemo, cuotasDemo } from './mock/mockData.js'
import { formatMoneda, formatFecha, formatMesLabel, badgeEstadoCuota } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'home', title: 'Inicio' })
  cargarInicio(alumno)
}

async function cargarInicio(alumno) {
  const [grupos, cuotas] = await Promise.all([
    conFallback(() => getInscripcionesActivasByAlumno(alumno.id), inscripcionesDemo, 'inscripciones activas'),
    conFallback(() => getCuotasByAlumno(alumno.id), cuotasDemo, 'cuotas del alumno'),
  ])

  pintarSaludo(alumno, grupos)
  pintarStats(grupos, cuotas)
  pintarUltimaCuota(cuotas)
  pintarGrupos(grupos)
}

function pintarSaludo(alumno, grupos) {
  document.getElementById('saludo-nombre').textContent = `${alumno.nombre} ${alumno.apellido}`
  const cantidad = grupos.length
  document.getElementById('saludo-grupos').textContent =
    cantidad === 1 ? 'Inscripta en 1 grupo' : `Inscripta en ${cantidad} grupos`
}

function pintarStats(grupos, cuotas) {
  document.getElementById('stat-grupos').textContent = grupos.length
  const pendientes = cuotas.filter((c) => c.estado === 'pendiente' || c.estado === 'vencida').length
  document.getElementById('stat-cuotas-pendientes').textContent = pendientes
}

function pintarUltimaCuota(cuotas) {
  const contenedor = document.getElementById('ultima-cuota')
  const ultima = cuotas[0]
  if (!ultima) {
    contenedor.innerHTML = '<p class="text-xs text-gray-400">Todavía no hay cuotas generadas.</p>'
    return
  }
  const badge = badgeEstadoCuota(ultima.estado)
  contenedor.innerHTML = `
    <div>
      <p class="text-sm font-semibold text-gray-800 capitalize">${formatMesLabel(ultima.mes)}</p>
      <p class="text-xs text-gray-400 mt-0.5">Vence: ${formatFecha(ultima.fecha_vencimiento)}</p>
    </div>
    <div class="text-right">
      <p class="text-lg font-black text-gray-800">${formatMoneda(ultima.monto)}</p>
      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 mt-1 ${badge.classes}">
        <span class="w-1.5 h-1.5 rounded-full ${badge.dot}"></span>
        ${badge.label}
      </span>
    </div>
  `
}

function pintarGrupos(grupos) {
  const lista = document.getElementById('lista-grupos')
  if (!grupos.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400">Todavía no tenés grupos asignados.</li>'
    return
  }
  lista.innerHTML = grupos.map((i) => `
    <li class="p-2.5 rounded-xl bg-primary-subtle">
      <p class="text-sm font-semibold text-gray-800">${i.grupo?.nombre ?? 'Grupo'}</p>
      <p class="text-xs text-gray-400">${i.grupo?.nivel ?? ''} · ${i.grupo?.horario ?? 'Horario a confirmar'}</p>
    </li>
  `).join('')
}
