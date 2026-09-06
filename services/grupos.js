import { supabase } from '../lib/supabase'

export async function getGrupos() {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .order('nombre', { ascending: true })
  if (error) throw error

  // Intentar traer el profesor asociado sin romper si no hay FK definida
  const { data: profesores } = await supabase.from('profesores').select('id, nombre, apellido')
  const profById = {}
  ;(profesores ?? []).forEach((p) => { profById[p.id] = p })

  return data.map((g) => ({ ...g, profesores: profById[g.profesor_id] ?? null }))
}

//----------------------------SISTEMA DE AUTOGESTION MOVIL-----------------------------------------

/**
 * Detalle completo de un grupo/disciplina para el portal de alumnos: datos
 * del grupo + profesor a cargo + cupo actual (inscriptos activos vs
 * capacidad máxima). Se resuelve con queries separadas, mismo patrón que
 * el resto del archivo, para no depender de FKs formales en Supabase.
 */
export async function getGrupoById(id) {
  const { data: grupo, error } = await supabase.from('grupos').select('*').eq('id', id).single()
  if (error) throw error

  const [{ data: profesor }, { count: inscriptosActivos }] = await Promise.all([
    grupo.profesor_id
      ? supabase.from('profesores').select('*').eq('id', grupo.profesor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('inscripciones').select('*', { count: 'exact', head: true }).eq('grupo_id', id).eq('estado', 'activa'),
  ])

  return { ...grupo, profesor: profesor ?? null, inscriptos_activos: inscriptosActivos ?? 0 }
}

export async function createGrupo(grupo) {
  const { data, error } = await supabase.from('grupos').insert([grupo]).select().single()
  if (error) throw error
  return data
}

export async function updateGrupo(id, cambios) {
  const { data, error } = await supabase.from('grupos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGrupo(id) {
  const { error } = await supabase.from('grupos').delete().eq('id', id)
  if (error) throw error
}
