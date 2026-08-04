// Sesión guardada en localStorage: no es Supabase Auth, solo recuerda qué
// alumno inició sesión (ver services/auth.js -> loginByDni). La van a usar
// todas las páginas del portal, no solo el login.
const STORAGE_KEY = 'crear_portal_alumno'

export function guardarSesion(alumno) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alumno))
}

export function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null
  } catch {
    return null
  }
}

export function cerrarSesion() {
  localStorage.removeItem(STORAGE_KEY)
}
