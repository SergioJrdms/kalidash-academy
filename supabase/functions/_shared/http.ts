// Helpers de HTTP/CORS compartilhados pelas Edge Functions.

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? '*'

export function corsHeaders(origin: string | null): Record<string, string> {
  // Em produção APP_ORIGIN deve ser a origem real do app.
  // Em dev aceitamos localhost para o Vite funcionar.
  const allowed =
    APP_ORIGIN === '*'
      ? origin ?? '*'
      : origin && (origin === APP_ORIGIN || origin.startsWith('http://localhost'))
        ? origin
        : APP_ORIGIN

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) })
  }
  return null
}
