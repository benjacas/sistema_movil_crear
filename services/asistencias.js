import { supabase } from '../lib/supabase'

export async function getAsistenciasByGrupoFecha(grupo_id, fecha) {
  const { data, error } = await supabase
    .from('asistencias')
    .select(`*, alumnos (id, nombre, apellido)`)
    .eq('grupo_id', grupo_id).eq('fecha', fecha)
  if (error) throw error
  return data
}

export async function registrarAsistencias(registros) {
  const { data, error } = await supabase
    .from('asistencias')
    .upsert(registros, { onConflict: 'alumno_id,grupo_id,fecha' })
    .select()
  if (error) throw error
  return data
}

export async function getAsistenciasByAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('asistencias')
    .select(`*, grupos (id, nombre)`)
    .eq('alumno_id', alumno_id)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}
