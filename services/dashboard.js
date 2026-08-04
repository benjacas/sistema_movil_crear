import { supabase } from '../lib/supabase'

export async function getDashboardStats() {
  // Primera ronda: counts y listas raw (sin FK joins para evitar dependencia de constraints)
  const [
    { count: totalAlumnos },
    { count: totalGrupos },
    { count: cuotasPendientesCount },
    { data: alumnosActivosRaw },
    { data: inscRecientesRaw },
    { data: cuotasRaw },
  ] = await Promise.all([
    supabase.from('alumnos').select('*', { count: 'exact', head: true }),
    supabase.from('grupos').select('*', { count: 'exact', head: true }),
    supabase.from('cuotas').select('*', { count: 'exact', head: true }).in('estado', ['pendiente', 'vencida']),
    // Solo alumno_id para contar únicos; no select(*) para minimizar payload
    supabase.from('inscripciones').select('alumno_id').eq('estado', 'activa'),
    supabase.from('inscripciones')
      .select('id, fecha, alumno_id, grupo_id')
      .eq('estado', 'activa')
      .order('fecha', { ascending: false })
      .limit(6),
    supabase.from('cuotas')
      .select('id, mes, monto, estado, alumno_id')
      .in('estado', ['pendiente', 'vencida'])
      .limit(5),
  ])

  // Alumnos únicos con al menos una inscripción activa.
  // Un alumno en 3 grupos tiene 3 registros → se cuenta UNA sola vez.
  const alumnosConClases = new Set((alumnosActivosRaw ?? []).map((i) => i.alumno_id)).size

  // Segunda ronda: resolver nombres sin depender de FK constraints de Supabase
  const rawInsc = inscRecientesRaw ?? []
  const rawCuotas = cuotasRaw ?? []

  const alumnoIds = [...new Set([...rawInsc.map((i) => i.alumno_id), ...rawCuotas.map((c) => c.alumno_id)])]
  const grupoIds = [...new Set(rawInsc.map((i) => i.grupo_id))]

  const [{ data: alumnos }, { data: grupos }] = await Promise.all([
    alumnoIds.length
      ? supabase.from('alumnos').select('id, nombre, apellido').in('id', alumnoIds)
      : { data: [] },
    grupoIds.length
      ? supabase.from('grupos').select('id, nombre, nivel').in('id', grupoIds)
      : { data: [] },
  ])

  const alumnosMap = Object.fromEntries((alumnos ?? []).map((a) => [a.id, a]))
  const gruposMap = Object.fromEntries((grupos ?? []).map((g) => [g.id, g]))

  return {
    totalAlumnos: totalAlumnos ?? 0,
    totalGrupos: totalGrupos ?? 0,
    cuotasPendientes: cuotasPendientesCount ?? 0,
    alumnosConClases,
    inscRecientes: rawInsc.map((i) => ({
      ...i,
      alumnos: alumnosMap[i.alumno_id] ?? null,
      grupos: gruposMap[i.grupo_id] ?? null,
    })),
    cuotasPendientesList: rawCuotas.map((c) => ({
      ...c,
      alumnos: alumnosMap[c.alumno_id] ?? null,
    })),
  }
}
