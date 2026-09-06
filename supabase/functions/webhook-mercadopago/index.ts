// Edge Function: webhook-mercadopago
//
// Recibe la notificación que manda Mercado Pago cuando cambia el estado de
// un pago. Nunca confiamos en el payload crudo de la notificación (puede
// venir con datos viejos, o alguien podría intentar pegarle a esta URL a
// mano): con el payment_id que informa la notificación, volvemos a
// consultar GET /v1/payments/{id} a la API de Mercado Pago con nuestro
// Access Token para confirmar el estado real antes de tocar la base.
//
// Si status === 'approved', actualiza (por external_reference, que es la
// lista de entrada_ids separada por coma que armamos en
// crear-preferencia-pago) las entradas correspondientes a
// estado: 'pagado', fecha_pago: now(), mp_payment_id.
//
// Configurar esta URL como "URL de notificaciones" en el panel de Mercado
// Pago (Developers > la app > Webhooks) — o se manda sola porque ya viaja
// como `notification_url` al crear cada preferencia.
//
// Mercado Pago NO manda un JWT de Supabase, así que esta función necesita
// verify_jwt = false (ver supabase/config.toml).
//
// Deploy: supabase functions deploy webhook-mercadopago --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  try {
    const paymentId = await extraerPaymentId(req)
    if (!paymentId) {
      // No es una notificación de pago (ej: "merchant_order") — la reconocemos
      // igual con 200 para que Mercado Pago no la siga reintentando.
      return new Response('ok', { status: 200 })
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    if (!mpResponse.ok) {
      console.error('No se pudo confirmar el pago en Mercado Pago:', paymentId, mpResponse.status)
      return new Response('ok', { status: 200 })
    }

    const pago = await mpResponse.json()

    if (pago.status === 'approved') {
      const entrada_ids = String(pago.external_reference ?? '').split(',').filter(Boolean)
      if (entrada_ids.length > 0) {
        const { error } = await supabaseAdmin
          .from('entradas')
          .update({
            estado: 'pagado',
            fecha_pago: new Date().toISOString(),
            mp_payment_id: String(pago.id),
          })
          .in('id', entrada_ids)
          .eq('estado', 'pendiente_pago')
        if (error) console.error('Error actualizando entradas pagadas:', error)
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(err)
    // Respondemos 200 igual: si devolvemos error acá, Mercado Pago reintenta
    // la misma notificación indefinidamente y no arreglamos nada reventando.
    return new Response('ok', { status: 200 })
  }
})

/**
 * Mercado Pago manda el aviso de más de una forma según la integración:
 * por querystring (?type=payment&data.id=123, formato "Webhooks" nuevo),
 * por body JSON ({ type: 'payment', data: { id: '123' } }), o el formato
 * IPN viejo (?topic=payment&id=123). Soportamos las tres.
 */
async function extraerPaymentId(req: Request): Promise<string | null> {
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? url.searchParams.get('topic')
  const idPorQuery = url.searchParams.get('data.id') ?? url.searchParams.get('id')
  if (type === 'payment' && idPorQuery) return idPorQuery

  try {
    const body = await req.json()
    if (body?.type === 'payment' && body?.data?.id) return String(body.data.id)
    if (body?.topic === 'payment' && body?.resource) return String(body.resource).split('/').pop() ?? null
  } catch {
    // Sin body JSON válido (ej: vino todo por querystring) — nada más que leer.
  }
  return null
}
