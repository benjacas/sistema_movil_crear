import { getAlumnoById, updateAlumno } from '../../services/alumnos.js'
import { getPadresByAlumno } from '../../services/padres.js'
import { requireSesion } from './guard.js'
import { guardarSesion } from './sesion.js'
import { renderShell } from './components/shell.js'
import { conFallback } from './mock/dataSource.js'
import { alumnoPerfilDemo, padresDemo } from './mock/mockData.js'
import { formatFecha } from './utils/format.js'

const sesion = requireSesion()

// Campos que el alumno puede editar desde el portal. Nombre, DNI y fecha de
// nacimiento los administra la academia (además, DNI + fecha de nacimiento
// son la clave del login actual — ver services/auth.js).
const CAMPOS_EDITABLES = ['telefono', 'email', 'domicilio']

let perfilActual = null
const form = document.getElementById('form-perfil')
const btnEditar = document.getElementById('btn-editar')
const btnCancelar = document.getElementById('btn-cancelar')
const btnGuardar = document.getElementById('btn-guardar')
const acciones = document.getElementById('acciones-edicion')
const mensaje = document.getElementById('perfil-mensaje')

if (sesion) {
  renderShell({ active: 'perfil', title: 'Mi perfil' })
  cargarPerfil(sesion)

  btnEditar.addEventListener('click', () => setModoEdicion(true))
  btnCancelar.addEventListener('click', () => {
    pintarPerfil(perfilActual)
    setModoEdicion(false)
  })
  form.addEventListener('submit', guardarCambios)
}

async function cargarPerfil(sesion) {
  const [perfil, tutores] = await Promise.all([
    conFallback(() => getAlumnoById(sesion.id), alumnoPerfilDemo, 'perfil del alumno'),
    conFallback(() => getPadresByAlumno(sesion.id), padresDemo, 'tutores del alumno'),
  ])
  perfilActual = perfil
  pintarPerfil(perfil)
  pintarTutores(tutores)
}

function pintarPerfil(perfil) {
  document.getElementById('ver-nombre').textContent = perfil.nombre ?? '—'
  document.getElementById('ver-apellido').textContent = perfil.apellido ?? '—'
  document.getElementById('ver-dni').textContent = perfil.dni ?? '—'
  document.getElementById('ver-fecha-nacimiento').textContent = formatFecha(perfil.fecha_nacimiento)

  for (const campo of CAMPOS_EDITABLES) {
    form.elements[campo].value = perfil[campo] ?? ''
  }
}

function pintarTutores(tutores) {
  const lista = document.getElementById('lista-tutores')
  if (!tutores?.length) {
    lista.innerHTML = '<li class="text-xs text-gray-400">No hay tutores vinculados a este alumno.</li>'
    return
  }
  lista.innerHTML = tutores.map((t) => `
    <li class="p-2.5 rounded-xl bg-primary-subtle">
      <p class="text-sm font-semibold text-gray-800">${t.nombre} ${t.apellido}</p>
      <p class="text-xs text-gray-400">${t.telefono ?? 'sin teléfono'} · ${t.email ?? 'sin email'}</p>
    </li>
  `).join('')
}

function setModoEdicion(activo) {
  for (const campo of CAMPOS_EDITABLES) {
    form.elements[campo].disabled = !activo
  }
  acciones.classList.toggle('hidden', !activo)
  acciones.classList.toggle('flex', activo)
  btnEditar.classList.toggle('hidden', activo)
  ocultarMensaje()
}

function mostrarMensaje(texto, tipo = 'exito') {
  mensaje.textContent = texto
  mensaje.className = `text-xs rounded-xl px-4 py-2.5 ${
    tipo === 'exito'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : 'bg-red-50 text-red-600 border border-red-200'
  }`
}

function ocultarMensaje() {
  mensaje.className = 'hidden text-xs rounded-xl px-4 py-2.5'
}

async function guardarCambios(evento) {
  evento.preventDefault()
  ocultarMensaje()
  btnGuardar.disabled = true
  btnGuardar.textContent = 'Guardando...'

  const cambios = Object.fromEntries(CAMPOS_EDITABLES.map((campo) => [campo, form.elements[campo].value.trim()]))

  try {
    const actualizado = await updateAlumno(sesion.id, cambios)
    perfilActual = actualizado
    guardarSesion({ ...sesion, ...actualizado }) // por si nombre/apellido se usan en otras pantallas
    pintarPerfil(actualizado)
    setModoEdicion(false)
    mostrarMensaje('Tus datos se guardaron correctamente.')
  } catch (error) {
    // Esperable mientras no haya conexión real a Supabase (ver README).
    mostrarMensaje('No se pudo guardar todavía: ' + error.message, 'error')
  } finally {
    btnGuardar.disabled = false
    btnGuardar.textContent = 'Guardar cambios'
  }
}
