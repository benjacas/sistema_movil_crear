import { loginByDni } from '../../services/auth.js'
import { guardarSesion } from './sesion.js'

const form = document.getElementById('form-login')
const btnSubmit = document.getElementById('btn-submit')
const errorBox = document.getElementById('login-error')

function mostrarError(mensaje) {
  errorBox.textContent = mensaje
  errorBox.classList.remove('hidden')
}

function ocultarError() {
  errorBox.textContent = ''
  errorBox.classList.add('hidden')
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  ocultarError()

  const dni = form.dni.value
  const fechaNacimiento = form.fecha_nacimiento.value

  btnSubmit.disabled = true
  btnSubmit.textContent = 'Verificando...'

  try {
    const alumno = await loginByDni(dni, fechaNacimiento)
    guardarSesion(alumno)
    window.location.href = 'home.html'
  } catch (error) {
    mostrarError(error.message)
    btnSubmit.disabled = false
    btnSubmit.textContent = 'Ingresar'
  }
})

// MODO DEMO — temporal, para poder ver el resto del portal sin tener
// todavía las credenciales reales de Supabase en .env. Borrar este bloque
// (y el botón en index.html) cuando el login de verdad esté probado y andando.
const btnDemo = document.getElementById('btn-demo')
btnDemo?.addEventListener('click', () => {
  guardarSesion({ id: 'demo', nombre: 'Alumno', apellido: 'Demo', dni: '00000000' })
  window.location.href = 'home.html'
})
