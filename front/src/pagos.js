import { getCuotasByAlumno } from '../../services/pagos.js'
import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { cuotasDemo } from './mock/mockData.js'
import { formatMoneda, formatFecha, formatMesLabel, badgeEstadoCuota } from './utils/format.js'

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'pagos', title: 'Pagos' })
  cargarCuotas(alumno)
}

async function cargarCuotas(alumno) {
  const cuotas = await conFallback(() => getCuotasByAlumno(alumno.id), cuotasDemo, 'cuotas del alumno')
  pintarCuotas(cuotas)
}

function pintarCuotas(cuotas) {
  const lista = document.getElementById('lista-cuotas')
  if (!cuotas.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400 px-1">Todavía no hay cuotas generadas.</li>'
    return
  }

  lista.innerHTML = cuotas.map((cuota) => {
    const badge = badgeEstadoCuota(cuota.estado)
    const pago = cuota.pagos?.[0]
    const puedePagar = cuota.estado === 'pendiente' || cuota.estado === 'vencida'

    return `
      <li class="bg-white rounded-2xl border border-primary-light p-4 shadow-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-800 capitalize">${formatMesLabel(cuota.mes)}</p>
            <p class="text-xs text-gray-400 mt-0.5">Vence: ${formatFecha(cuota.fecha_vencimiento)}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-black text-gray-800">${formatMoneda(cuota.monto)}</p>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 mt-1 ${badge.classes}">
              <span class="w-1.5 h-1.5 rounded-full ${badge.dot}"></span>
              ${badge.label}
            </span>
          </div>
        </div>

        ${pago ? `
          <p class="text-xs text-gray-400 mt-3 pt-3 border-t border-primary-light">
            Pagado el ${formatFecha(pago.fecha_pago)} · ${pago.metodo}
          </p>
        ` : ''}

        ${puedePagar ? `
          <button
            type="button"
            disabled
            title="Integración con Mercado Pago pendiente"
            class="w-full mt-3 py-2.5 rounded-xl bg-primary-light text-primary/50 text-xs font-semibold cursor-not-allowed"
          >
            Pagar (próximamente)
          </button>
        ` : ''}
      </li>
    `
  }).join('')
}
