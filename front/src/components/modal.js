// Modal (bottom sheet) genérico y reutilizable. En vez de que cada página
// tenga su propio <div id="modal-..."> en el HTML, este componente se crea
// una sola vez y se le pide que muestre el contenido que haga falta —
// mismo patrón que components/shell.js con el header/nav.

let modalEl = null

function asegurarModal() {
  if (modalEl) return modalEl

  modalEl = document.createElement('div')
  modalEl.id = 'modal-generico'
  modalEl.className = 'hidden fixed inset-0 z-20'
  modalEl.innerHTML = `
    <div class="absolute inset-0 bg-black/40" data-cerrar-modal></div>
    <div class="absolute inset-x-0 bottom-0 max-w-md mx-auto bg-white rounded-t-3xl p-6 pb-8 animate-fade-up max-h-[85vh] overflow-y-auto">
      <button data-cerrar-modal class="absolute top-4 right-5 text-gray-300 hover:text-gray-500 text-xl leading-none px-1">✕</button>
      <div id="modal-generico-contenido"></div>
    </div>
  `
  document.body.appendChild(modalEl)
  modalEl.querySelectorAll('[data-cerrar-modal]').forEach((el) => el.addEventListener('click', cerrarModal))

  return modalEl
}

/** Muestra `html` dentro del modal y lo abre. */
export function abrirModal(html) {
  const modal = asegurarModal()
  modal.querySelector('#modal-generico-contenido').innerHTML = html
  modal.classList.remove('hidden')
}

export function cerrarModal() {
  modalEl?.classList.add('hidden')
}
