import { supabase } from '../lib/supabase'

export async function getSueldos() {
  const { data, error } = await supabase
    .from('sueldos')
    .select(`*, profesores (id, nombre, apellido)`)
    .order('periodo', { ascending: false })
  if (error) throw error
  return data
}

export async function createSueldo(sueldo) {
  const { data, error } = await supabase.from('sueldos').insert([sueldo]).select().single()
  if (error) throw error
  return data
}

export async function updateSueldo(id, cambios) {
  const { data, error } = await supabase.from('sueldos').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteSueldo(id) {
  const { error } = await supabase.from('sueldos').delete().eq('id', id)
  if (error) throw error
}
