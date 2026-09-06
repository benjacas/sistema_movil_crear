import { requireSesion } from './guard.js'
import { renderShell } from './components/shell.js'

// Página de vuelta del checkout de Mercado Pago (una de las 3 `back_urls`
// que arma la Edge Function crear-preferencia-pago). El estado real del pago
// lo confirma el webhook server-side — esta pantalla solo le muestra al
// alumno un mensaje según el `status` con el que Mercado Pago lo redirige.
const INFO_POR_ESTADO = {
  success: {
    icono: '✓',
    clasesIcono: 'bg-emerald-50 text-emerald-600',
    titulo: '¡Pago acreditado!',
    mensaje: 'Tu entrada ya está confirmada. La vas a encontrar en "Mis entradas".',
  },
  pending: {
    icono: '⏳',
    clasesIcono: 'bg-amber-50 text-amber-600',
    titulo: 'Pago pendiente',
    mensaje: 'Todavía estamos esperando la confirmación de Mercado Pago. Te avisamos apenas se acredite.',
  },
  failure: {
    icono: '✕',
    clasesIcono: 'bg-red-50 text-red-600',
    titulo: 'No se pudo procesar el pago',
    mensaje: 'Tu reserva sigue disponible por unos minutos — podés intentar pagarla de nuevo.',
  },
}

const alumno = requireSesion()
if (alumno) {
  renderShell({ active: 'eventos', title: 'Resultado del pago' })
  pintarResultado()
}

function pintarResultado() {
  const status = new URLSearchParams(window.location.search).get('status')
  const info = INFO_POR_ESTADO[status] ?? {
    icono: '?',
    clasesIcono: 'bg-gray-100 text-gray-500',
    titulo: 'No pudimos confirmar el estado del pago',
    mensaje: 'Revisá "Mis entradas" para ver si tu reserva ya se acreditó.',
  }

  document.getElementById('resultado-pago').innerHTML = `
    <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-bold ${info.clasesIcono}">
      ${info.icono}
    </div>
    <p class="text-lg font-bold text-gray-800 font-display mt-4">${info.titulo}</p>
    <p class="text-sm text-gray-500 mt-2">${info.mensaje}</p>
    <div class="mt-6 space-y-2">
      <a href="mis-entradas.html" class="block w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold text-center hover:bg-primary-dark transition-colors">
        Ver mis entradas
      </a>
      ${status === 'failure' ? `
        <a href="eventos.html" class="block w-full py-3 rounded-xl border border-primary-light text-primary text-sm font-semibold text-center hover:bg-primary-light transition-colors">
          Volver a intentar
        </a>
      ` : ''}
    </div>
  `
}
