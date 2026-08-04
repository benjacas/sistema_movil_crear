import { supabase } from '../lib/supabase'

export async function getCuotasByAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('cuotas')
    .select('*, pagos (id, monto_pagado, fecha_pago, metodo)')
    .eq('alumno_id', alumno_id)
    .order('fecha_vencimiento', { ascending: false })
  if (error) throw error
  return data
}

export async function getCuotasPendientes() {
  const { data, error } = await supabase
    .from('cuotas')
    .select('*, alumnos (id, nombre, apellido), pagos (id, monto_pagado, fecha_pago, metodo)')
    .in('estado', ['pendiente', 'vencida'])
    .order('fecha_vencimiento', { ascending: true })
  if (error) throw error
  return data
}

export async function generarCuotas(alumno_id, mes, monto, fecha_vencimiento) {
  const { data, error } = await supabase
    .from('cuotas')
    .insert([{ alumno_id, mes, monto, estado: 'pendiente', fecha_vencimiento }])
    .select().single()
  if (error) throw error
  return data
}

/**
 * Registra un pago de forma atómica usando la función PostgreSQL `registrar_pago`.
 *
 * Las 3 operaciones (INSERT pagos → UPDATE cuotas → INSERT comprobantes) se ejecutan
 * en una sola transacción de base de datos. Si cualquiera falla, todas se revierten.
 *
 * Requiere que la función `registrar_pago` esté creada en Supabase (ver SQL de migración).
 */
export async function registrarPago(cuota_id, pago) {
  const { data, error } = await supabase.rpc('registrar_pago', {
    p_cuota_id:   cuota_id,
    p_monto:      pago.monto_pagado,
    p_metodo:     pago.metodo,
    p_fecha_pago: pago.fecha_pago,
  })
  if (error) throw new Error(error.message)

  return {
    comprobante: {
      id:     data.comp_id,
      numero: data.numero,
    },
  }
}

/**
 * Devuelve los datos de pago y comprobante asociados a una cuota.
 * Se usa para reimprimir recibos de cuotas ya pagadas.
 */
export async function getReciboByCuota(cuota_id) {
  const { data: pago, error } = await supabase
    .from('pagos')
    .select('id, monto_pagado, fecha_pago, metodo')
    .eq('cuota_id', cuota_id)
    .maybeSingle()
  if (error || !pago) return null

  const { data: comprobante } = await supabase
    .from('comprobantes')
    .select('id, numero')
    .eq('pago_id', pago.id)
    .maybeSingle()

  return { pago, comprobante }
}

export async function getComprobantes() {
  const { data, error } = await supabase
    .from('comprobantes')
    .select('*, pagos (id, monto_pagado, metodo, fecha_pago, cuotas (mes, monto, alumnos (nombre, apellido)))')
    .order('fecha', { ascending: false })
  if (error) throw error
  return data
}
