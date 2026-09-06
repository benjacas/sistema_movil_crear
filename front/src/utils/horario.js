// El campo `grupos.horario` es texto libre (ej: "Lunes y Miércoles 18:00–19:30"),
// no datos estructurados. Esto intenta extraer día(s) + rango horario para
// poder armar un calendario semanal. Si el texto no matchea ningún día
// conocido, devuelve [] y quien llama debe mostrar el texto tal cual como
// respaldo (ver grupos.js → `sinHorarioEstructurado`).
//
// LIMITACIÓN CONOCIDA: esto es "mejor esfuerzo" sobre texto libre. Si el
// formato de carga en el sistema de administración cambia mucho, hay que
// ajustar el regex acá o, mejor a largo plazo, proponerle a la otra parte
// del proyecto pasar `horario` a datos estructurados (día + hora_inicio +
// hora_fin) en vez de texto.

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function quitarAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const DIAS_NORMALIZADOS = DIAS_SEMANA.map(quitarAcentos)

/**
 * 'Lunes y Miércoles 18:00–19:30' -> [
 *   { dia: 'Lunes', horaInicio: '18:00', horaFin: '19:30' },
 *   { dia: 'Miércoles', horaInicio: '18:00', horaFin: '19:30' },
 * ]
 */
export function parsearHorario(texto) {
  if (!texto) return []
  const normalizado = quitarAcentos(texto)

  const diasEncontrados = DIAS_SEMANA.filter((_, i) => normalizado.includes(DIAS_NORMALIZADOS[i]))
  if (!diasEncontrados.length) return []

  // Rango horario tipo "18:00-19:30", "18:00 – 19:30" o "18:00 a 19:30"
  const match = texto.match(/(\d{1,2}:\d{2})\s*(?:-|–|a)\s*(\d{1,2}:\d{2})/)
  const [horaInicio, horaFin] = match ? [match[1], match[2]] : [null, null]

  return diasEncontrados.map((dia) => ({ dia, horaInicio, horaFin }))
}

export { DIAS_SEMANA }
