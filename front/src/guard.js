import { obtenerSesion } from './sesion.js'

/**
 * Llamar al principio de cada página protegida (home, pagos, asistencia,
 * grupos, evaluaciones). Si no hay alumno logueado, redirige al login y
 * corta la ejecución del resto del script de la página.
 *
 * Uso:
 *   const alumno = requireSesion()
 *   if (!alumno) return   // ya redirigió, no seguir ejecutando
 */
export function requireSesion() {
  const alumno = obtenerSesion()
  if (!alumno) {
    window.location.href = 'index.html'
    return null
  }
  return alumno
}
