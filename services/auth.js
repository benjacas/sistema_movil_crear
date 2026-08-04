import { supabase } from '../lib/supabase'

// es un login que busca si existe el dni y la fecha de nacimiento coincida.
// es provisional, en teoria esto se puede hacer con supabase auth de forma mas segura
export async function loginByDni(dni, fechaNacimiento) {
  const { data, error } = await supabase
    .from('alumnos')
    .select('id, nombre, apellido, dni, fecha_nacimiento')
    .eq('dni', dni.trim())
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('No encontramos un alumno con ese DNI.')
  if (data.fecha_nacimiento !== fechaNacimiento) {
    throw new Error('La fecha de nacimiento no coincide.')
  }
  return { id: data.id, nombre: data.nombre, apellido: data.apellido, dni: data.dni }
}
