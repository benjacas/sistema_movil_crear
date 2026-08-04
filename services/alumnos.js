import { supabase } from '../lib/supabase'

export async function getAlumnos() {
  const { data: alumnos, error } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido, dni, telefono, email, domicilio, fecha_nacimiento, fecha_alta')
    .order('apellido', { ascending: true })
   if (error)throw error

  // BUG-FIX (BUG-04): era .select('... grupos(id, nombre, nivel)') — FK join
  // que Supabase resuelve como null si el constraint no está definido explícitamente.
  // Ahora se usa el patrón consistente con el resto del sistema: queries separadas.
  const { data: inscripciones } = await supabase
    .from('inscripciones')
    .select('id, alumno_id, estado, grupo_id')
    .eq('estado', 'activa')

  const grupoIds = [...new Set((inscripciones ?? []).map((i) => i.grupo_id))]
  const { data: grupos } = grupoIds.length
    ? await supabase.from('grupos').select('id, nombre, nivel').in('id', grupoIds)
    : { data: [] }
  const gruposMap = Object.fromEntries((grupos ?? []).map((g) => [g.id, g]))

  const inscByAlumno = {}
  ;(inscripciones ?? []).forEach((i) => {
    if (!inscByAlumno[i.alumno_id]) inscByAlumno[i.alumno_id] = []
    inscByAlumno[i.alumno_id].push({ ...i, grupos: gruposMap[i.grupo_id] ?? null })
  })

  return alumnos.map((a) => ({ ...a, inscripciones: inscByAlumno[a.id] ?? [] }))
}

export async function getAlumnoById(id) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createAlumno(alumno) {
  const { data, error } = await supabase.from('alumnos').insert([alumno]).select().single()
  if (error) throw error
  return data
}

export async function updateAlumno(id, cambios) {
  const { data, error } = await supabase.from('alumnos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAlumno(id) {
  // Bloquear si tiene inscripciones o cuotas asociadas
  const [{ count: inscCount }, { count: cuotaCount }] = await Promise.all([
    supabase.from('inscripciones').select('*', { count: 'exact', head: true }).eq('alumno_id', id),
    supabase.from('cuotas').select('*', { count: 'exact', head: true }).eq('alumno_id', id),
  ])
  if ((inscCount ?? 0) > 0) throw new Error('No se puede eliminar: el alumno tiene inscripciones registradas.')
  if ((cuotaCount ?? 0) > 0) throw new Error('No se puede eliminar: el alumno tiene cuotas registradas.')

  const { error } = await supabase.from('alumnos').delete().eq('id', id)
  if (error) throw error
}