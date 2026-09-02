/**
 * Ejecuta `consultaReal` (una función que llama a un service de Supabase).
 * Si falla — porque no hay .env todavía, porque la tabla no existe, o
 * porque se cortó la conexión — devuelve `valorMock` en su lugar y avisa
 * por consola, para no bloquear el desarrollo de las pantallas.
 *
 * BORRAR el uso de este wrapper (dejar solo `consultaReal()`) una vez que
 * el proyecto esté conectado a la base de datos real y probado.
 *
 * @param {() => Promise<any>} consultaReal
 * @param {any} valorMock
 * @param {string} etiqueta   nombre corto para identificar el log en consola
 */
export async function conFallback(consultaReal, valorMock, etiqueta = 'consulta') {
  try {
    return await consultaReal()
  } catch (error) {
    console.warn(`[modo demo] "${etiqueta}" falló, usando datos de ejemplo. Motivo:`, error.message)
    return valorMock
  }
}
