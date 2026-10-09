// POST { action, ... }
//
// Ponte entre a Academy e o Google Calendar da pessoa.
//
//   connect     { provider_token, provider_refresh_token }  guarda os tokens
//   status      {}                                          { connected }
//   list        { from, to }                                eventos da agenda
//   rsvp        { event_id }                                inscreve + cria na agenda
//   unrsvp      { event_id }                                cancela + remove da agenda
//   disconnect  {}                                          revoga e apaga
//
// O refresh token nunca volta para o browser: ele entra uma vez, no
// `connect`, e daí em diante só esta função o lê, com service role.
import { adminClient, getCaller } from '../_shared/supabase.ts'
import { json, preflight } from '../_shared/http.ts'

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
const CAL_API = 'https://www.googleapis.com/calendar/v3'

/** Duração padrão de um encontro, quando o evento não diz outra coisa. */
const DURACAO_MIN = 90

type Tokens = {
  access_token: string | null
  refresh_token: string
  expires_at: string | null
}

/**
 * Devolve um access token válido, renovando pelo refresh token quando o
 * atual expirou. Google só manda refresh token na primeira autorização,
 * então ele é o que realmente sustenta a conexão.
 */
async function accessTokenValido(
  admin: ReturnType<typeof adminClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('user_google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  const tok = data as Tokens | null
  if (!tok) return null

  const folga = 60_000 // renova um minuto antes de expirar
  if (tok.access_token && tok.expires_at && new Date(tok.expires_at).getTime() - folga > Date.now()) {
    return tok.access_token
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ausentes na função')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tok.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    // Refresh token revogado pela pessoa no painel do Google: a conexão
    // morreu, então limpamos para a tela voltar a oferecer "Conectar".
    await admin.from('user_google_tokens').delete().eq('user_id', userId)
    await admin.from('profiles').update({ google_calendar_connected: false }).eq('id', userId)
    return null
  }

  const novo = await res.json()
  const expira = new Date(Date.now() + (novo.expires_in ?? 3600) * 1000).toISOString()

  await admin
    .from('user_google_tokens')
    .update({ access_token: novo.access_token, expires_at: expira })
    .eq('user_id', userId)

  return novo.access_token as string
}

async function googleFetch(
  token: string,
  caminho: string,
  init: RequestInit = {},
): Promise<Response> {
  return await fetch(`${CAL_API}${caminho}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const origin = req.headers.get('origin')

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'não autenticado' }, 401, origin)

    const body = await req.json().catch(() => ({}))
    const action = body.action as string | undefined
    const admin = adminClient()

    // ---------------------------------------------------------------
    if (action === 'connect') {
      const refresh = body.provider_refresh_token as string | undefined
      const access = (body.provider_token as string | undefined) ?? null

      if (!refresh) {
        return json(
          {
            error:
              'O Google não devolveu refresh token. Refaça a conexão — é preciso autorizar de novo para a Academy poder escrever na agenda.',
            code: 'sem_refresh',
          },
          400,
          origin,
        )
      }

      // Confere que o token realmente dá acesso à agenda antes de gravar.
      if (access) {
        const teste = await googleFetch(access, '/users/me/calendarList?maxResults=1')
        if (teste.status === 403 || teste.status === 401) {
          return json(
            {
              error:
                'A autorização não incluiu o acesso à agenda. Refaça a conexão e aceite a permissão do Google Calendar.',
              code: 'sem_escopo',
            },
            403,
            origin,
          )
        }
      }

      await admin.from('user_google_tokens').upsert({
        user_id: caller.id,
        access_token: access,
        refresh_token: refresh,
        expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
        scope: (body.scope as string | undefined) ?? null,
      })
      await admin.from('profiles').update({ google_calendar_connected: true }).eq('id', caller.id)

      return json({ connected: true }, 200, origin)
    }

    // ---------------------------------------------------------------
    if (action === 'status') {
      const { data } = await admin
        .from('user_google_tokens')
        .select('user_id')
        .eq('user_id', caller.id)
        .maybeSingle()
      return json({ connected: Boolean(data) }, 200, origin)
    }

    // ---------------------------------------------------------------
    if (action === 'disconnect') {
      const token = await accessTokenValido(admin, caller.id).catch(() => null)
      if (token) {
        // Melhor esforço: se a revogação falhar, ainda assim apagamos.
        await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
          method: 'POST',
        }).catch(() => {})
      }
      await admin.from('user_google_tokens').delete().eq('user_id', caller.id)
      await admin.from('profiles').update({ google_calendar_connected: false }).eq('id', caller.id)
      return json({ connected: false }, 200, origin)
    }

    // ---------------------------------------------------------------
    if (action === 'list') {
      const token = await accessTokenValido(admin, caller.id)
      if (!token) return json({ connected: false, events: [] }, 200, origin)

      const from = (body.from as string | undefined) ?? new Date().toISOString()
      const to =
        (body.to as string | undefined) ??
        new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString()

      const q = new URLSearchParams({
        timeMin: from,
        timeMax: to,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      })

      const res = await googleFetch(token, `/calendars/primary/events?${q}`)
      if (!res.ok) {
        return json({ error: 'Google recusou a leitura da agenda.' }, 502, origin)
      }

      const data = await res.json()
      // deno-lint-ignore no-explicit-any
      const events = (data.items ?? []).map((e: any) => ({
        id: e.id,
        summary: e.summary ?? '(sem título)',
        start: e.start?.dateTime ?? e.start?.date ?? null,
        end: e.end?.dateTime ?? e.end?.date ?? null,
        all_day: Boolean(e.start?.date && !e.start?.dateTime),
        html_link: e.htmlLink ?? null,
      }))

      return json({ connected: true, events }, 200, origin)
    }

    // ---------------------------------------------------------------
    if (action === 'rsvp' || action === 'unrsvp') {
      const eventId = body.event_id as string | undefined
      if (!eventId) return json({ error: 'event_id obrigatório' }, 400, origin)

      const { data: evento } = await admin
        .from('events')
        .select('id, title, description, starts_at, external_url, status, access_type')
        .eq('id', eventId)
        .single()

      if (!evento || evento.status !== 'published') {
        return json({ error: 'evento não encontrado' }, 404, origin)
      }

      // Evento pago exige acesso pago. A regra vale aqui também, não só
      // na tela: esta função escreve na agenda da pessoa.
      if (evento.access_type === 'paid' && caller.accessLevel !== 'paid' && caller.role !== 'admin') {
        return json({ error: 'Este encontro faz parte do acesso pago.', code: 'locked' }, 403, origin)
      }

      const { data: inscricao } = await admin
        .from('event_registrations')
        .select('google_event_id')
        .eq('user_id', caller.id)
        .eq('event_id', eventId)
        .maybeSingle()

      const token = await accessTokenValido(admin, caller.id).catch(() => null)

      // ---------- cancelar ----------
      if (action === 'unrsvp') {
        if (token && inscricao?.google_event_id) {
          await googleFetch(token, `/calendars/primary/events/${inscricao.google_event_id}`, {
            method: 'DELETE',
          }).catch(() => {})
        }
        await admin
          .from('event_registrations')
          .delete()
          .eq('user_id', caller.id)
          .eq('event_id', eventId)
        return json({ registered: false, calendar: Boolean(token) }, 200, origin)
      }

      // ---------- inscrever ----------
      let googleEventId = inscricao?.google_event_id ?? null

      if (token && !googleEventId) {
        const inicio = new Date(evento.starts_at)
        const fim = new Date(inicio.getTime() + DURACAO_MIN * 60 * 1000)

        const res = await googleFetch(token, '/calendars/primary/events', {
          method: 'POST',
          body: JSON.stringify({
            summary: evento.title,
            description: [evento.description, evento.external_url].filter(Boolean).join('\n\n'),
            start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
            end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
            source: evento.external_url
              ? { title: 'Kalidash Academy', url: evento.external_url }
              : undefined,
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'popup', minutes: 60 },
                { method: 'popup', minutes: 10 },
              ],
            },
          }),
        })

        if (res.ok) {
          const criado = await res.json()
          googleEventId = criado.id as string
        }
      }

      const { error } = await admin.from('event_registrations').upsert({
        user_id: caller.id,
        event_id: eventId,
        google_event_id: googleEventId,
      })
      if (error) return json({ error: error.message }, 500, origin)

      return json(
        { registered: true, calendar: Boolean(googleEventId) },
        200,
        origin,
      )
    }

    return json({ error: 'ação desconhecida' }, 400, origin)
  } catch (e) {
    console.error('google-calendar', e)
    return json({ error: e instanceof Error ? e.message : 'erro' }, 500, origin)
  }
})
