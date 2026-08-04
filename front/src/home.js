import { cerrarSesion } from './sesion.js'

document.getElementById('btn-logout').addEventListener('click', () => {
  cerrarSesion()
  window.location.href = '/index.html'
})

// PENDIENTE: reemplazar los datos de ejemplo del HTML por datos reales:
//   - services/pagos.js -> getCuotasByAlumno(alumno.id)
//   - services/inscripciones.js -> getInscripcionesActivasByAlumno(alumno.id)
