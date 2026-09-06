// Headers CORS compartidos por las Edge Functions que llama el front
// directamente desde el navegador (crear-preferencia-pago). El webhook de
// Mercado Pago no los necesita porque no es una llamada de browser.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
