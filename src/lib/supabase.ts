import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Copie .env.example para .env e preencha.',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

type FunctionFailure = { message: string; status: number | null }

async function invokeOnce<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; failure: FunctionFailure | null }> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (!error) return { data: data as T, failure: null }

  // O corpo do erro traz a mensagem em português que a função devolveu.
  let message = error.message
  let status: number | null = null
  // deno-lint-ignore no-explicit-any
  const ctx = (error as any).context
  if (ctx) {
    if (typeof ctx.status === 'number') status = ctx.status
    if (typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json()
        if (parsed?.error) message = parsed.error
      } catch {
        /* mantém a mensagem padrão */
      }
    }
  }
  return { data: null, failure: { message, status } }
}

/**
 * Chama uma Edge Function com o JWT da sessão atual.
 *
 * Trata um caso chato: o PostgREST valida só a assinatura do JWT, mas as
 * Edge Functions validam a sessão no servidor. Se a sessão foi revogada
 * (logout em outro dispositivo, troca de senha, expiração de sessão), o
 * catálogo continua carregando enquanto vídeo e materiais quebram — a
 * pessoa vê uma página meio funcionando, sem entender por quê.
 *
 * Num 401 tentamos renovar a sessão e repetir uma vez. Se não der, a
 * mensagem manda a pessoa entrar de novo, em vez de um erro genérico.
 */
export async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const first = await invokeOnce<T>(name, body)
  if (!first.failure) return first.data as T

  if (first.failure.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession()

    if (refreshed?.session) {
      const second = await invokeOnce<T>(name, body)
      if (!second.failure) return second.data as T
      if (second.failure.status !== 401) throw new Error(second.failure.message)
    }

    throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  }

  throw new Error(first.failure.message)
}
