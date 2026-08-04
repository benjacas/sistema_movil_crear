import { supabase } from '../lib/supabase'

/**
 * Calcula el monto de una cuota aplicando aumentos trimestrales compuestos.
 *
 * La lógica es: por cada trimestre completo transcurrido desde fechaPrecioBase
 * hasta el mes destino, se aplica el porcentaje de aumento una vez.
 *
 * @param {number} cuotaBase          Monto base en pesos (ej: 10000)
 * @param {number} porcentaje         Porcentaje de aumento (ej: 10 para 10%)
 * @param {string|null} fechaPrecioBase  'YYYY-MM-DD' — desde cuándo rige el precio base
 * @param {string} targetMes          'YYYY-MM' — mes para el que se calcula
 * @returns {number} Monto redondeado a 2 decimales
 */
export function calcularMontoActual(cuotaBase, porcentaje, fechaPrecioBase, targetMes) {
  if (!cuotaBase || cuotaBase <= 0) return 0
  if (!porcentaje || porcentaje <= 0 || !fechaPrecioBase) return cuotaBase

  const ref = new Date(fechaPrecioBase + 'T00:00:00')
  const target = new Date(targetMes + '-01T00:00:00')
  const monthsDiff =
    (target.getFullYear() - ref.getFullYear()) * 12 + (target.getMonth() - ref.getMonth())

  if (monthsDiff <= 0) return cuotaBase

  const quarters = Math.floor(monthsDiff / 3)
  if (quarters === 0) return cuotaBase

  return Math.round(cuotaBase * Math.pow(1 + porcentaje / 100, quarters) * 100) / 100
}

/**
 * Genera cuotas del mes para todos los alumnos con inscripciones activas.
 *
 * Cada alumno recibe UNA cuota cuyo monto es la suma de las cuotas de todos
 * sus grupos (con el ajuste trimestral aplicado individualmente a cada grupo).
 * Los alumnos que ya tienen cuota para ese mes son omitidos (idempotente).
 *
 * @param {string} mes  'YYYY-MM' (ej: '2026-05')
 * @returns {{ generadas: number, omitidas: number }}
 */
export async function generarCuotasDelMes(mes) {
  // 1. Traer todas las inscripciones activas
  const { data: inscripciones, error: errInsc } = await supabase
    .from('inscripciones')
    .select('alumno_id, grupo_id')
    .eq('estado', 'activa')
  if (errInsc) throw new Error('Error al traer inscripciones: ' + errInsc.message)
  if (!inscripciones?.length) return { generadas: 0, omitidas: 0 }

  // 2. Traer datos de cuota de los grupos involucrados
  const grupoIds = [...new Set(inscripciones.map((i) => i.grupo_id))]
  const { data: grupos, error: errGrupos } = await supabase
    .from('grupos')
    .select('id, nombre, cuota_base_mensual, porcentaje_aumento_trimestral, fecha_precio_base')
    .in('id', grupoIds)
  if (errGrupos) throw new Error('Error al traer grupos: ' + errGrupos.message)

  const gruposMap = Object.fromEntries((grupos ?? []).map((g) => [g.id, g]))

  // 3. Sumar monto total por alumno (puede estar en múltiples grupos)
  const montosPorAlumno = {}
  for (const insc of inscripciones) {
    const grupo = gruposMap[insc.grupo_id]
    if (!grupo) continue
    const monto = calcularMontoActual(
      grupo.cuota_base_mensual ?? 0,
      grupo.porcentaje_aumento_trimestral ?? 0,
      grupo.fecha_precio_base,
      mes
    )
    // BUG-FIX (BUG-06): redondear en cada acumulación para evitar
    // errores de punto flotante al sumar varios montos con decimales.
    montosPorAlumno[insc.alumno_id] =
      Math.round(((montosPorAlumno[insc.alumno_id] ?? 0) + monto) * 100) / 100
  }

  // BUG-FIX (BUG-07): excluir alumnos cuyo monto total sea $0 (grupos sin
  // cuota configurada) para no generar cuotas vacías que distorsionen el módulo.
  const alumnoIds = Object.keys(montosPorAlumno).filter((id) => montosPorAlumno[id] > 0)
  if (!alumnoIds.length) return { generadas: 0, omitidas: 0 }

  // 4. Detectar cuáles ya tienen cuota para este mes (evitar duplicados)
  const { data: existentes } = await supabase
    .from('cuotas')
    .select('alumno_id')
    .eq('mes', mes)
    .in('alumno_id', alumnoIds)
  // BUG-FIX (BUG-05): usar String() en ambos lados para comparación segura
  // cuando alumno_id es entero (Object.keys devuelve strings; Supabase puede
  // devolver números si la columna es bigint/serial).
  const yaGenerados = new Set((existentes ?? []).map((c) => String(c.alumno_id)))

  const nuevosIds = alumnoIds.filter((id) => !yaGenerados.has(String(id)))
  if (!nuevosIds.length) return { generadas: 0, omitidas: yaGenerados.size }

  // 5. Calcular fecha de vencimiento = último día del mes
  const [year, month] = mes.split('-').map(Number)
  const fechaVencimiento = new Date(year, month, 0).toISOString().split('T')[0]

  // 6. Insertar cuotas nuevas
  const cuotasAInsertar = nuevosIds.map((alumno_id) => ({
    alumno_id,
    mes,
    monto: montosPorAlumno[alumno_id],
    estado: 'pendiente',
    fecha_vencimiento: fechaVencimiento,
  }))

  const { error: errInsert } = await supabase.from('cuotas').insert(cuotasAInsertar)
  if (errInsert) throw new Error('Error al insertar cuotas: ' + errInsert.message)

  return { generadas: nuevosIds.length, omitidas: yaGenerados.size }
}

/**
 * Trae todas las cuotas de un mes con el nombre del alumno.
 * Ordenadas por estado (vencida → pendiente → pagada).
 *
 * @param {string} mes  'YYYY-MM'
 */
export async function getCuotasDelMes(mes) {
  const ORDEN_ESTADO = { vencida: 0, pendiente: 1, pagada: 2 }

  const { data, error } = await supabase
    .from('cuotas')
    .select('id, alumno_id, mes, monto, estado, fecha_vencimiento')
    .eq('mes', mes)
  if (error) throw error
  if (!data?.length) return []

  const alumnoIds = [...new Set(data.map((c) => c.alumno_id))]
  const { data: alumnos } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido')
    .in('id', alumnoIds)
  const alumnosMap = Object.fromEntries((alumnos ?? []).map((a) => [a.id, a]))

  return data
    .map((c) => ({ ...c, alumnos: alumnosMap[c.alumno_id] ?? null }))
    .sort((a, b) => {
      const diff = (ORDEN_ESTADO[a.estado] ?? 9) - (ORDEN_ESTADO[b.estado] ?? 9)
      if (diff !== 0) return diff
      return (a.alumnos?.apellido ?? '').localeCompare(b.alumnos?.apellido ?? '')
    })
}

/**
 * Marca como 'vencida' las cuotas pendientes cuya fecha_vencimiento ya pasó.
 * Llamar al montar el módulo de Pagos para mantener los estados actualizados.
 */
export async function marcarCuotasVencidas() {
  const hoy = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('cuotas')
    .update({ estado: 'vencida' })
    .eq('estado', 'pendiente')
    .lt('fecha_vencimiento', hoy)
  if (error) throw error
}

/**
 * Cancela (elimina) las cuotas pendientes y vencidas de un alumno.
 * Se llama cuando el alumno ya no tiene ninguna inscripción activa.
 */
export async function cancelarCuotasPendientes(alumno_id) {
  const { error } = await supabase
    .from('cuotas')
    .delete()
    .eq('alumno_id', alumno_id)
    .in('estado', ['pendiente', 'vencida'])
  if (error) throw error
}

/**
 * Historial completo de cuotas y pagos de un alumno, ordenado por mes descendente.
 */
export async function getHistorialPagosByAlumno(alumno_id) {
  const { data: cuotas, error } = await supabase
    .from('cuotas')
    .select('id, mes, monto, estado, fecha_vencimiento')
    .eq('alumno_id', alumno_id)
    .order('mes', { ascending: false })
  if (error) throw error
  if (!cuotas?.length) return []

  const cuotaIds = cuotas.map((c) => c.id)
  const { data: pagos } = await supabase
    .from('pagos')
    .select('id, cuota_id, monto_pagado, fecha_pago, metodo')
    .in('cuota_id', cuotaIds)

  const pagosMap = Object.fromEntries((pagos ?? []).map((p) => [p.cuota_id, p]))
  return cuotas.map((c) => ({ ...c, pago: pagosMap[c.id] ?? null }))
}

/**
 * Calcula el resumen de cuotas del mes actual para el dashboard u otros módulos.
 * @returns {{ total: number, pendiente: number, vencida: number, pagada: number, montoTotal: number }}
 */
export async function getResumenCuotasDelMes(mes) {
  const { data, error } = await supabase
    .from('cuotas')
    .select('estado, monto')
    .eq('mes', mes)
  if (error) throw error

  const cuotas = data ?? []
  return {
    total: cuotas.length,
    pendiente: cuotas.filter((c) => c.estado === 'pendiente').length,
    vencida: cuotas.filter((c) => c.estado === 'vencida').length,
    pagada: cuotas.filter((c) => c.estado === 'pagada').length,
    montoTotal: cuotas.reduce((sum, c) => sum + Number(c.monto), 0),
    montoRecaudado: cuotas
      .filter((c) => c.estado === 'pagada')
      .reduce((sum, c) => sum + Number(c.monto), 0),
  }
}
