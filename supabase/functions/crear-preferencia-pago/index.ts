// Edge Function: crear-preferencia-pago
//
// La llama el portal cuando el alumno confirma sus asientos reservados y
// quiere pagar. Recibe { entrada_ids: [...] }, busca esas entradas en la
// base con la service role key (nunca confiar en precios ni datos que mande
// el cliente), arma la preferencia de pago en Mercado Pago con el precio
// real de cada entrada, y devuelve { init_point, preference_id } para
// redirigir al alumno al checkout.
//
// Secretos necesarios (supabase secrets set ...):
//   MP_ACCESS_TOKEN   Access Token de la app de Mercado Pago (test o prod).
//   SITE_URL          URL pública del portal, para armar los back_urls de
//                      vuelta del checkout, ej: https://portal-crear.vercel.app
//                      (las páginas de resultado son la Fase 3 de este módulo).
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente
// en el entorno de la función — no hace falta configurarlos a mano.
//
// Deploy: supabase functions deploy crear-preferencia-pago

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { entrada_ids } = await req.json()
    if (!Array.isArray(entrada_ids) || entrada_ids.length === 0) {
      return jsonResponse({ error: 'Falta entrada_ids.' }, 400)
    }

    const { data: entradas, error } = await supabaseAdmin
      .from('entradas')
      .select('id, precio, fila, columna, estado, eventos (nombre)')
      .in('id', entrada_ids)
    if (error) throw error

    // Server-side: solo se puede pagar lo que sigue reservado y pendiente.
    // Si algo ya se pagó, se canceló, expiró o directamente no existe, no
    // seguimos — el front tiene que refrescar el estado de esos asientos.
    const disponibles = new Set(
      (entradas ?? []).filter((e) => e.estado === 'pendiente_pago').map((e) => e.id)
    )
    const invalidas = entrada_ids.filter((id: string) => !disponibles.has(id))
    if (invalidas.length > 0) {
      return jsonResponse({ error: 'Alguna entrada ya no está disponible para pagar.', invalidas }, 409)
    }

    const items = entradas!.map((e: any) => ({
      title: `${e.eventos?.nombre ?? 'Entrada'} — Fila ${e.fila}, Butaca ${e.columna}`,
      quantity: 1,
      unit_price: Number(e.precio),
      currency_id: 'ARS',
    }))

    const external_reference = entrada_ids.join(',')

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items,
        external_reference,
        back_urls: {
          success: `${SITE_URL}/evento-resultado.html?status=success`,
          failure: `${SITE_URL}/evento-resultado.html?status=failure`,
          pending: `${SITE_URL}/evento-resultado.html?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-mercadopago`,
      }),
    })

    const preferencia = await mpResponse.json()
    if (!mpResponse.ok) {
      console.error('Error de Mercado Pago al crear preferencia:', preferencia)
      return jsonResponse({ error: 'No se pudo crear la preferencia de pago.' }, 502)
    }

    const { error: errUpdate } = await supabaseAdmin
      .from('entradas')
      .update({ mp_preference_id: preferencia.id })
      .in('id', entrada_ids)
    if (errUpdate) throw errUpdate

    return jsonResponse({ init_point: preferencia.init_point, preference_id: preferencia.id })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: 'Error interno al crear la preferencia de pago.' }, 500)
  }
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
