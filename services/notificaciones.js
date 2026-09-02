import { supabase } from '../lib/supabase'

/**
 * NOTA DE SCHEMA (tablas nuevas, todavía no creadas en Supabase — a validar
 * con el sistema de administración antes de migrar):
 *
 * notificaciones
 *   id                uuid/bigint PK
 *   alumno_id         FK -> alumnos.id, NULL = aviso institucional para todos
 *   titulo            text
 *   mensaje           text
 *   tipo              text  ('institucional' | 'vencimiento' | 'inasistencia' | 'evento')
 *   fecha_creacion    timestamp, default now()
 *   referencia_id     uuid/bigint NULL  (ej: id de la cuota o del evento relacionado)
 *
 * notificaciones_leidas   (para poder marcar como leído incluso un aviso masivo)
 *   notificacion_id   FK -> notificaciones.id
 *   alumno_id         FK -> alumnos.id
 *   fecha_lectura     timestamp, default now()
 *   PK (notificacion_id, alumno_id)
 *
 * Se separan en dos tablas (en vez de un campo `leida` en `notificaciones`)
 * porque un mismo aviso institucional (alumno_id = NULL) lo reciben todos
 * los alumnos, pero cada uno lo lee en un momento distinto.
 */

/**
 * Trae las notificaciones de un alumno: las dirigidas a él/ella puntualmente
 * más las institucionales (alumno_id = NULL), ordenadas de más reciente a
 * más antigua, con el estado de lectura ya resuelto para ESE alumno.
 */
export async function getNotificacionesByAlumno(alumno_id) {
  const { data: notificaciones, error } = await supabase
    .from('notificaciones')
    .select('id, titulo, mensaje, tipo, fecha_creacion, referencia_id, alumno_id')
    .or(`alumno_id.eq.${alumno_id},alumno_id.is.null`)
    .order('fecha_creacion', { ascending: false })
  if (error) throw error
  if (!notificaciones?.length) return []

  const { data: leidas } = await supabase
    .from('notificaciones_leidas')
    .select('notificacion_id')
    .eq('alumno_id', alumno_id)
    .in('notificacion_id', notificaciones.map((n) => n.id))

  const leidasSet = new Set((leidas ?? []).map((l) => l.notificacion_id))
  return notificaciones.map((n) => ({ ...n, leida: leidasSet.has(n.id) }))
}

/** Cantidad de notificaciones sin leer — para el badge de la campanita. */
export async function getCantidadNoLeidas(alumno_id) {
  const notificaciones = await getNotificacionesByAlumno(alumno_id)
  return notificaciones.filter((n) => !n.leida).length
}

/** Marca una notificación puntual como leída por este alumno (idempotente). */
export async function marcarComoLeida(notificacion_id, alumno_id) {
  const { error } = await supabase
    .from('notificaciones_leidas')
    .upsert([{ notificacion_id, alumno_id }], { onConflict: 'notificacion_id,alumno_id' })
  if (error) throw error
}

/** Marca varias notificaciones como leídas de una — se usa al abrir la bandeja. */
export async function marcarTodasComoLeidas(alumno_id, notificacion_ids) {
  if (!notificacion_ids?.length) return
  const registros = notificacion_ids.map((notificacion_id) => ({ notificacion_id, alumno_id }))
  const { error } = await supabase
    .from('notificaciones_leidas')
    .upsert(registros, { onConflict: 'notificacion_id,alumno_id' })
  if (error) throw error
}

//----------------------------AVISOS AUTOMÁTICOS-----------------------------------------
// Estas funciones las dispara el sistema de administración (botón manual o,
// más adelante, una tarea programada/cron) — no las llama el portal de
// alumnos. Viven acá porque la lógica de negocio ("¿cuándo aviso?") es la
// misma para ambos sistemas y no tiene sentido duplicarla.

/**
 * Genera un aviso de "vencimiento próximo" para cada cuota pendiente cuya
 * fecha de vencimiento cae dentro de `diasAntes` días. Es idempotente: si
 * ya existe una notificación con esa `referencia_id` (id de la cuota), no
 * la duplica.
 */
export async function generarAvisosVencimientoProximo(diasAntes = 3) {
  const hoy = new Date()
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + diasAntes)
  const hoyISO = hoy.toISOString().split('T')[0]
  const limiteISO = limite.toISOString().split('T')[0]

  const { data: cuotas, error } = await supabase
    .from('cuotas')
    .select('id, alumno_id, mes, fecha_vencimiento')
    .eq('estado', 'pendiente')
    .gte('fecha_vencimiento', hoyISO)
    .lte('fecha_vencimiento', limiteISO)
  if (error) throw error
  if (!cuotas?.length) return { generados: 0 }

  const { data: existentes } = await supabase
    .from('notificaciones')
    .select('referencia_id')
    .eq('tipo', 'vencimiento')
    .in('referencia_id', cuotas.map((c) => c.id))
  const yaAvisadas = new Set((existentes ?? []).map((n) => n.referencia_id))

  const nuevas = cuotas
    .filter((c) => !yaAvisadas.has(c.id))
    .map((c) => ({
      alumno_id: c.alumno_id,
      tipo: 'vencimiento',
      referencia_id: c.id,
      titulo: 'Vencimiento próximo',
      mensaje: `Tu cuota de ${c.mes} vence el ${c.fecha_vencimiento}.`,
    }))
  if (!nuevas.length) return { generados: 0 }

  const { error: errInsert } = await supabase.from('notificaciones').insert(nuevas)
  if (errInsert) throw errInsert
  return { generados: nuevas.length }
}

/**
 * Genera un aviso de "inasistencias reiteradas" para alumnos con 3 o más
 * ausencias consecutivas en un mismo grupo (contando desde el registro más
 * reciente hacia atrás). No duplica avisos ya emitidos para esa racha.
 */
export async function generarAvisosInasistenciaReiterada(minimoConsecutivas = 3) {
  const { data: asistencias, error } = await supabase
    .from('asistencias')
    .select('alumno_id, grupo_id, fecha, presente')
    .order('fecha', { ascending: false })
  if (error) throw error
  if (!asistencias?.length) return { generados: 0 }

  // Agrupar por alumno+grupo y contar ausencias consecutivas desde la más reciente.
  const porAlumnoGrupo = {}
  for (const registro of asistencias) {
    const clave = `${registro.alumno_id}__${registro.grupo_id}`
    if (!porAlumnoGrupo[clave]) porAlumnoGrupo[clave] = []
    porAlumnoGrupo[clave].push(registro)
  }

  const candidatos = []
  for (const [clave, registros] of Object.entries(porAlumnoGrupo)) {
    let consecutivas = 0
    for (const r of registros) {
      if (r.presente) break
      consecutivas++
    }
    if (consecutivas >= minimoConsecutivas) {
      const [alumno_id, grupo_id] = clave.split('__')
      candidatos.push({ alumno_id, grupo_id, consecutivas })
    }
  }
  if (!candidatos.length) return { generados: 0 }

  // referencia_id = "alumno_id-grupo_id" para poder chequear duplicados por racha actual.
  const referencias = candidatos.map((c) => `${c.alumno_id}-${c.grupo_id}-${c.consecutivas}`)
  const { data: existentes } = await supabase
    .from('notificaciones')
    .select('referencia_id')
    .eq('tipo', 'inasistencia')
    .in('referencia_id', referencias)
  const yaAvisadas = new Set((existentes ?? []).map((n) => n.referencia_id))

  const nuevas = candidatos
    .map((c) => ({ ...c, referencia_id: `${c.alumno_id}-${c.grupo_id}-${c.consecutivas}` }))
    .filter((c) => !yaAvisadas.has(c.referencia_id))
    .map((c) => ({
      alumno_id: c.alumno_id,
      tipo: 'inasistencia',
      referencia_id: c.referencia_id,
      titulo: 'Inasistencias reiteradas',
      mensaje: `Registramos ${c.consecutivas} ausencias seguidas. ¡Te esperamos en la próxima clase!`,
    }))
  if (!nuevas.length) return { generados: 0 }

  const { error: errInsert } = await supabase.from('notificaciones').insert(nuevas)
  if (errInsert) throw errInsert
  return { generados: nuevas.length }
}
