import { supabase } from '../lib/supabase'

export async function getPadres() {
  const { data, error } = await supabase
    .from('padres')
    .select('*')
    .order('apellido', { ascending: true })
  if (error) throw error
  return data
}

export async function createPadre(padre) {
  const { data, error } = await supabase.from('padres').insert([padre]).select().single()
  if (error) throw error
  return data
}

export async function updatePadre(id, cambios) {
  const { data, error } = await supabase.from('padres').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deletePadre(id) {
  const { error } = await supabase.from('padres').delete().eq('id', id)
  if (error) throw error
}

export async function vincularPadreAlumno(padre_id, alumno_id) {
  const { data, error } = await supabase
    .from('alumnos_padres')
    .insert([{ padre_id, alumno_id }])
    .select().single()
  if (error) throw error
  return data
}

export async function desvincularPadreAlumno(padre_id, alumno_id) {
  const { error } = await supabase
    .from('alumnos_padres')
    .delete()
    .eq('padre_id', padre_id)
    .eq('alumno_id', alumno_id)
  if (error) throw error
}

export async function getPadresByAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('alumnos_padres')
    .select('padres (id, nombre, apellido, telefono, email)')
    .eq('alumno_id', alumno_id)
  if (error) throw error
  return data.map((d) => d.padres)
}
