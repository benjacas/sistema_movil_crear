import { supabase } from '../lib/supabase'

export async function getProfesores() {
  const { data, error } = await supabase.from('profesores').select('*').order('apellido', { ascending: true })
  if (error) throw error
  return data
}

export async function createProfesor(profesor) {
  const { data, error } = await supabase.from('profesores').insert([profesor]).select().single()
  if (error) throw error
  return data
}

export async function updateProfesor(id, cambios) {
  const { data, error } = await supabase.from('profesores').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProfesor(id) {
  const { error } = await supabase.from('profesores').delete().eq('id', id)
  if (error) throw error
}
