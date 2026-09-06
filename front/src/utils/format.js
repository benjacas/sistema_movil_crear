// Utilidades de formato usadas en varias páginas del portal.
// Todo lo que sea "cómo se muestra un dato" vive acá, para no repetir
// lógica de formato copiada y pegada en cada página.

const formatterARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

/** 15000 -> "$15.000" */
export function formatMoneda(monto) {
  const numero = Number(monto)
  if (Number.isNaN(numero)) return '$0'
  return formatterARS.format(numero)
}

/** '2026-08-31' -> '31/08/2026' */
export function formatFecha(fechaISO) {
  if (!fechaISO) return '—'
  const [year, month, day] = fechaISO.split('-')
  if (!year || !month || !day) return fechaISO
  return `${day}/${month}/${year}`
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-08' -> 'Agosto 2026' */
export function formatMesLabel(mesISO) {
  if (!mesISO) return '—'
  const [year, month] = mesISO.split('-').map(Number)
  const nombre = MESES[month - 1] ?? mesISO
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${year}`
}

// Config visual de cada estado de cuota — se usa en Home y en Pagos,
// así el color/etiqueta de "vencida" es siempre el mismo en toda la app.
const ESTADOS_CUOTA = {
  pagada: { label: 'Pagada', dot: 'bg-emerald-400', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pendiente: { label: 'Pendiente', dot: 'bg-amber-400', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  vencida: { label: 'Vencida', dot: 'bg-red-400', classes: 'bg-red-50 text-red-700 ring-red-200' },
}

export function badgeEstadoCuota(estado) {
  return ESTADOS_CUOTA[estado] ?? { label: estado ?? '—', dot: 'bg-gray-300', classes: 'bg-gray-50 text-gray-600 ring-gray-200' }
}

/** '2026-08-28T10:00:00' -> '28/08, 10:00' */
export function formatFechaHora(fechaISO) {
  if (!fechaISO) return '—'
  const [fecha, hora] = fechaISO.split('T')
  const [year, month, day] = fecha.split('-')
  const horaCorta = hora ? hora.slice(0, 5) : ''
  return horaCorta ? `${day}/${month}, ${horaCorta}` : `${day}/${month}/${year}`
}

// Config visual por tipo de notificación — color e iniciales del chip.
const TIPOS_NOTIFICACION = {
  institucional: { label: 'Institucional', classes: 'bg-primary-light text-primary', letra: 'i' },
  vencimiento: { label: 'Pagos', classes: 'bg-amber-50 text-amber-600', letra: '$' },
  inasistencia: { label: 'Asistencia', classes: 'bg-red-50 text-red-600', letra: '!' },
  evento: { label: 'Eventos', classes: 'bg-emerald-50 text-emerald-600', letra: '★' },
}

export function infoTipoNotificacion(tipo) {
  return TIPOS_NOTIFICACION[tipo] ?? { label: 'Aviso', classes: 'bg-gray-100 text-gray-500', letra: '•' }
}

/** Calcula % de asistencia a partir de una lista de registros con { presente: boolean } */
export function calcularPorcentajeAsistencia(registros) {
  if (!registros?.length) return 0
  const presentes = registros.filter((r) => r.presente).length
  return Math.round((presentes / registros.length) * 100)
}

/** '19:00:00' (columna `time` de Postgres) -> '19:00' */
export function formatHora(horaSQL) {
  if (!horaSQL) return '—'
  return horaSQL.slice(0, 5)
}

// Config visual por estado de entrada — se usa en "Mis entradas".
const ESTADOS_ENTRADA = {
  pagado: { label: 'Pagada', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pendiente_pago: { label: 'Pendiente de pago', classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  cancelado: { label: 'Cancelada', classes: 'bg-gray-100 text-gray-500 ring-gray-200' },
  expirado: { label: 'Expirada', classes: 'bg-gray-100 text-gray-500 ring-gray-200' },
}

export function badgeEstadoEntrada(estado) {
  return ESTADOS_ENTRADA[estado] ?? { label: estado ?? '—', classes: 'bg-gray-50 text-gray-600 ring-gray-200' }
}
