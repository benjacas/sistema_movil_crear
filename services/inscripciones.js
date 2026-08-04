import { supabase } from '../lib/supabase'

export async function getInscripciones() {
  const { data, error } = await supabase
    .from('inscripciones')
    .select('id, alumno_id, grupo_id, fecha, estado')
    .order('fecha', { ascending: false })
  if (error) throw error

  // Traer alumnos y grupos en queries separadas para no depender de FKs
  const alumnoIds = [...new Set(data.map((i) => i.alumno_id))]
  const grupoIds = [...new Set(data.map((i) => i.grupo_id))]

  const [{ data: alumnos }, { data: grupos }] = await Promise.all([
    alumnoIds.length ? supabase.from('alumnos').select('id, nombre, apellido, dni').in('id', alumnoIds) : { data: [] },
    grupoIds.length ? supabase.from('grupos').select('id, nombre, nivel, capacidad_maxima').in('id', grupoIds) : { data: [] },
  ])

  const alumnosMap = Object.fromEntries((alumnos ?? []).map((a) => [a.id, a]))
  const gruposMap = Object.fromEntries((grupos ?? []).map((g) => [g.id, g]))

  return data.map((i) => ({
    ...i,
    alumnos: alumnosMap[i.alumno_id] ?? null,
    grupos: gruposMap[i.grupo_id] ?? null,
  }))
}

async function verificarCupo(grupo_id) {
  const { data: grupo, error } = await supabase.from('grupos').select('capacidad_maxima').eq('id', grupo_id).single()
  if (error || !grupo) throw new Error('No se encontró el grupo seleccionado.')
  const { count: inscriptosActivos } = await supabase
    .from('inscripciones').select('*', { count: 'exact', head: true })
    .eq('grupo_id', grupo_id).eq('estado', 'activa')
  // BUG-FIX: comparar con null explícitamente para no permitir inscripción si el count falla
  if (inscriptosActivos == null || inscriptosActivos >= grupo.capacidad_maxima) {
    throw new Error('El grupo no tiene cupo disponible.')
  }
}

// BUG-FIX (BUG-02): agrega verificación de inscripción activa existente
// antes de insertar, para evitar duplicados en el modo "alumno existente".
export async function createInscripcion({ alumno_id, grupo_id }) {
  const { data: existente } = await supabase
    .from('inscripciones')
    .select('id')
    .eq('alumno_id', alumno_id)
    .eq('grupo_id', grupo_id)
    .eq('estado', 'activa')
    .maybeSingle()
  if (existente) throw new Error('El alumno ya tiene una inscripción activa en este grupo.')

  await verificarCupo(grupo_id)
  const fecha = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('inscripciones')
    .insert([{ alumno_id, grupo_id, fecha, estado: 'activa' }])
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function createInscripcionConAlumno({ alumnoData, grupo_ids }) {
  const fecha = new Date().toISOString().split('T')[0]

  for (const grupo_id of grupo_ids) {
    await verificarCupo(grupo_id)
  }

  const { data: alumnoExistente } = await supabase
    .from('alumnos').select('id').eq('dni', alumnoData.dni).maybeSingle()

  let alumno_id
  if (alumnoExistente) {
    alumno_id = alumnoExistente.id
  } else {
    const { data: nuevoAlumno, error: errAlumno } = await supabase
      .from('alumnos')
      .insert([{ ...alumnoData, fecha_alta: fecha }])
      .select('id')
      .single()
    if (errAlumno) throw new Error('Error al crear el alumno: ' + errAlumno.message)
    alumno_id = nuevoAlumno.id
  }

  // BUG-FIX (BUG-01): filtrar solo inscripciones ACTIVAS para permitir
  // re-inscripción de alumnos que tuvieron una baja en el mismo grupo.
  const { data: inscExistentes } = await supabase
    .from('inscripciones')
    .select('grupo_id')
    .eq('alumno_id', alumno_id)
    .eq('estado', 'activa')
    .in('grupo_id', grupo_ids)
  const yaInscripto = new Set((inscExistentes ?? []).map((i) => i.grupo_id))
  const gruposNuevos = grupo_ids.filter((id) => !yaInscripto.has(id))

  if (gruposNuevos.length === 0) throw new Error('El alumno ya está inscripto activamente en todos los grupos seleccionados.')

  const { error } = await supabase.from('inscripciones').insert(
    gruposNuevos.map((grupo_id) => ({ alumno_id, grupo_id, fecha, estado: 'activa' }))
  )
  if (error) throw new Error('Error al crear la inscripción: ' + error.message)

  return { alumno_id, grupos_inscriptos: gruposNuevos.length, grupos_omitidos: yaInscripto.size }
}

//----------------------------SISTEMA DE AUTOGESTION MOVIL-----------------------------------------

// Verifica si el alumno tiene inscripciones activas y devuelve sus datos junto con los grupos asociados
export async function getInscripcionesActivasByAlumno(alumno_id) {
  const { data: inscripciones, error } = await supabase
    .from('inscripciones')
    .select('id, estado, fecha, grupo_id')
    .eq('alumno_id', alumno_id)
    .eq('estado', 'activa')
  if (error) throw error
  if (!inscripciones?.length) return []

  const grupoIds = [...new Set(inscripciones.map((i) => i.grupo_id))]
  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre, nivel, horario')
    .in('id', grupoIds)
  const gruposMap = Object.fromEntries((grupos ?? []).map((g) => [g.id, g]))

  return inscripciones.map((i) => ({ ...i, grupo: gruposMap[i.grupo_id] ?? null }))
}

//busca el id del alumno y aplica los cambios con update
export async function updateInscripcion(id, cambios) {
  const { data, error } = await supabase.from('inscripciones').update(cambios).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data
}
