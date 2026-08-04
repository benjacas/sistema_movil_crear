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
