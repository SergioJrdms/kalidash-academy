import { supabase } from '../lib/supabase'

/**
 * Integração com o Google Calendar.
 *
 * Toda chamada ao Google passa pela Edge Function `google-calendar`: é lá
 * que vive o client secret e o refresh token da pessoa. O frontend nunca
 * vê nenhum dos dois — ele só sabe se a conexão existe.
 */

const ESCOPOS = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

/** Marca na URL que estamos voltando do consentimento do Google. */
export const PARAM_RETORNO = 'gcal'

export type GoogleEvent = {
  id: string
  summary: string
  start: string | null
  end: string | null
  all_day: boolean
  html_link: string | null
}

type Resposta = Record<string, unknown>

async function chamar(action: string, payload: Resposta = {}): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke('google-calendar', {
    body: { action, ...payload },
  })

  if (error) {
    // O corpo do erro traz a mensagem em português vinda da função.
    const detalhe = await lerErro(error)
    throw new Error(detalhe ?? 'Não foi possível falar com o Google Calendar.')
  }
  return (data ?? {}) as Resposta
}

async function lerErro(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const corpo = await ctx.json()
      if (corpo?.error) return String(corpo.error)
    } catch {
      /* corpo não era JSON */
    }
  }
  return error instanceof Error ? error.message : null
}

/**
 * Manda a pessoa autorizar o Google. Pedimos `access_type=offline` e
 * `prompt=consent` porque sem os dois o Google não devolve refresh
 * token — e sem refresh token a conexão morre em uma hora.
 */
export async function iniciarConexao(): Promise<void> {
  const volta = new URL(window.location.href)
  volta.searchParams.set(PARAM_RETORNO, '1')

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: ESCOPOS,
      redirectTo: volta.toString(),
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
  if (error) throw new Error(error.message)
}

/**
 * Chamado quando a página volta do Google. Os tokens do provedor só
 * existem nesta primeira leitura da sessão — depois o Supabase os
 * descarta —, então eles vão direto para a função.
 */
export async function concluirConexao(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const sessao = data.session
  if (!sessao?.provider_refresh_token) return false

  await chamar('connect', {
    provider_token: sessao.provider_token ?? null,
    provider_refresh_token: sessao.provider_refresh_token,
  })
  return true
}

export async function statusConexao(): Promise<boolean> {
  const r = await chamar('status')
  return Boolean(r.connected)
}

export async function desconectar(): Promise<void> {
  await chamar('disconnect')
}

/** Os compromissos da agenda da pessoa na janela pedida. */
export async function listarAgenda(de: Date, ate: Date): Promise<GoogleEvent[]> {
  const r = await chamar('list', { from: de.toISOString(), to: ate.toISOString() })
  return (r.events as GoogleEvent[]) ?? []
}

export type ResultadoInscricao = { registered: boolean; calendar: boolean }

/** Inscreve e, se a agenda estiver conectada, cria o evento nela. */
export async function inscrever(eventId: string): Promise<ResultadoInscricao> {
  const r = await chamar('rsvp', { event_id: eventId })
  return { registered: Boolean(r.registered), calendar: Boolean(r.calendar) }
}

/** Cancela a inscrição e remove o evento da agenda. */
export async function cancelarInscricao(eventId: string): Promise<ResultadoInscricao> {
  const r = await chamar('unrsvp', { event_id: eventId })
  return { registered: Boolean(r.registered), calendar: Boolean(r.calendar) }
}
