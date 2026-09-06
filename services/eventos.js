import { supabase } from '../lib/supabase'

/**
 * NOTA DE SCHEMA (tablas nuevas, todavía no creadas en Supabase — a validar
 * con el sistema de administración antes de migrar):
 *
 * eventos
 *   id                       uuid/bigint PK
 *   nombre                   text
 *   descripcion              text
 *   fecha                    date
 *   hora                     time
 *   lugar                    text
 *   filas                    int       -- cantidad de filas del auditorio
 *   columnas                 int       -- cantidad de butacas por fila
 *   asientos_deshabilitados  jsonb     -- ["3-7", "3-8", ...] pasillos/huecos, no vendibles
 *   precio_entrada           numeric
 *   estado                   text      ('activo' | 'finalizado' | 'cancelado')
 *
 * entradas
 *   id                  uuid/bigint PK
 *   evento_id           FK -> eventos.id
 *   alumno_id           FK -> alumnos.id
 *   fila                int
 *   columna             int
 *   precio              numeric   -- copiado de eventos.precio_entrada al momento de reservar
 *   estado              text      ('pendiente_pago' | 'pagado' | 'cancelado' | 'expirado')
 *   codigo              text      -- código corto de la entrada digital
 *   fecha_reserva       timestamp default now()
 *   fecha_pago          timestamp NULL
 *   mp_preference_id    text NULL
 *   mp_payment_id       text NULL
 *
 * Restricción anti-sobreventa (va en la migración SQL, no en este archivo):
 *
 *   create unique index entradas_asiento_activo_unico
 *     on entradas (evento_id, fila, columna)
 *     where estado in ('pendiente_pago', 'pagado');
 *
 * Postgres rechaza (error.code === '23505') si dos personas intentan reservar
 * el mismo asiento casi al mismo tiempo. crearReservaTemporal() de abajo
 * captura ese error puntualmente por asiento, no revienta toda la operación.
 *
 * Las reservas en 'pendiente_pago' expiran a los 10 minutos si no se pagan
 * (para no bloquear asientos para siempre). No hace falta un cron: acá
 * simplemente no se cuenta como ocupado un 'pendiente_pago' cuya
 * fecha_reserva tiene más de 10 minutos — ver reservaVigente().
 */

const MINUTOS_EXPIRACION_RESERVA = 10

export async function getEventosDisponibles() {
  const hoyISO = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('estado', 'activo')
    .gte('fecha', hoyISO)
    .order('fecha', { ascending: true })
  if (error) throw error
  return data
}

export async function getEventoById(id) {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

function reservaVigente(entrada) {
  if (entrada.estado === 'pagado') return true
  if (entrada.estado !== 'pendiente_pago') return false
  const limite = new Date(Date.now() - MINUTOS_EXPIRACION_RESERVA * 60 * 1000)
  return new Date(entrada.fecha_reserva) > limite
}

/** Asientos ocupados de un evento: pagados, o reservados hace menos de 10 minutos. */
export async function getAsientosOcupados(evento_id) {
  const { data, error } = await supabase
    .from('entradas')
    .select('fila, columna, estado, fecha_reserva')
    .eq('evento_id', evento_id)
    .in('estado', ['pagado', 'pendiente_pago'])
  if (error) throw error

  return (data ?? [])
    .filter(reservaVigente)
    .map((e) => `${e.fila}-${e.columna}`)
}

function generarCodigoEntrada() {
  return crypto.randomUUID().split('-')[0].toUpperCase()
}

/**
 * Reserva asientos para un alumno (`asientos` = [{fila, columna}, ...]). Inserta
 * una fila por asiento con estado 'pendiente_pago', copiando el precio actual
 * del evento. Inserta de a uno (no en batch) porque si un asiento ya está
 * ocupado (choca con `entradas_asiento_activo_unico`), necesitamos saber CUÁL
 * puntualmente falló para poder avisar "ese asiento ya no está disponible",
 * sin descartar los que sí se pudieron reservar.
 */
export async function crearReservaTemporal(evento_id, alumno_id, asientos) {
  const evento = await getEventoById(evento_id)
  if (!evento) throw new Error('El evento no existe.')

  const reservadas = []
  const noDisponibles = []

  for (const asiento of asientos) {
    const { data, error } = await supabase
      .from('entradas')
      .insert([{
        evento_id,
        alumno_id,
        fila: asiento.fila,
        columna: asiento.columna,
        precio: evento.precio_entrada,
        estado: 'pendiente_pago',
        codigo: generarCodigoEntrada(),
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        noDisponibles.push(asiento)
        continue
      }
      throw error
    }
    reservadas.push(data)
  }

  return { reservadas, noDisponibles }
}

export async function getEntradasByAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('entradas')
    .select('*, eventos (id, nombre, fecha, hora, lugar)')
    .eq('alumno_id', alumno_id)
    .order('fecha_reserva', { ascending: false })
  if (error) throw error
  return data
}

/** Usado si el alumno se arrepiente antes de pagar, o como limpieza manual. */
export async function cancelarReserva(entrada_id) {
  const { data, error } = await supabase
    .from('entradas')
    .update({ estado: 'cancelado' })
    .eq('id', entrada_id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Invoca la Edge Function `crear-preferencia-pago` (supabase/functions/) para
 * las entradas ya reservadas (`entrada_ids`, en 'pendiente_pago'). Devuelve
 * { init_point, preference_id } para redirigir al alumno al checkout de
 * Mercado Pago. El precio real se recalcula server-side en la Edge Function,
 * acá no se manda ningún monto.
 */
export async function crearPreferenciaPago(entrada_ids) {
  const { data, error } = await supabase.functions.invoke('crear-preferencia-pago', {
    body: { entrada_ids },
  })
  if (error) throw new Error(error.message)
  return data
}
