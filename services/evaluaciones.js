import { supabase } from '../lib/supabase'

export async function getCriterios() {
  const { data, error } = await supabase.from('criterios').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function createCriterio(nombre) {
  const { data, error } = await supabase.from('criterios').insert([{ nombre }]).select().single()
  if (error) throw error
  return data
}

export async function getPlantillas() {
  const { data, error } = await supabase
    .from('plantillas_evaluacion')
    .select(`*, grupos (id, nombre), plantilla_criterios (criterio_id, criterios (id, nombre))`)
  if (error) throw error
  return data
}

export async function createPlantilla(nombre, grupo_id, criterio_ids) {
  const { data: plantilla, error: errPlantilla } = await supabase
    .from('plantillas_evaluacion').insert([{ nombre, grupo_id }]).select().single()
  if (errPlantilla) throw errPlantilla
  const relaciones = criterio_ids.map(criterio_id => ({ plantilla_id: plantilla.id, criterio_id }))
  const { error: errRel } = await supabase.from('plantilla_criterios').insert(relaciones)
  if (errRel) throw errRel
  return plantilla
}

export async function getEvaluaciones() {
  const { data, error } = await supabase
    .from('evaluaciones')
    .select(`*, alumnos (id, nombre, apellido), grupos (id, nombre), plantillas_evaluacion (id, nombre), evaluacion_detalle (criterio_id, nota, observacion, criterios (nombre))`)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

// Evaluaciones de un alumno puntual, con el detalle por criterio (portal de alumnos).
export async function getEvaluacionesByAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('evaluaciones')
    .select(`*, grupos (id, nombre), plantillas_evaluacion (id, nombre), evaluacion_detalle (criterio_id, nota, observacion, criterios (nombre))`)
    .eq('alumno_id', alumno_id)
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}

export async function createEvaluacion(evaluacion, detalles) {
  const { data: eva, error } = await supabase.from('evaluaciones').insert([evaluacion]).select().single()
  if (error) throw error
  const detallesConId = detalles.map(d => ({ evaluacion_id: eva.id, criterio_id: d.criterio_id, nota: d.nota, observacion: d.observacion }))
  const { error: errDet } = await supabase.from('evaluacion_detalle').insert(detallesConId)
  if (errDet) throw errDet
  return eva
}
