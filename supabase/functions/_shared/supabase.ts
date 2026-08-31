import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

/** Cliente com service role. Ignora RLS — use só depois de autorizar. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type Caller = {
  id: string
  role: 'student' | 'admin'
  accessLevel: 'free' | 'paid'
}

/**
 * Valida o JWT do Supabase que veio no header Authorization e devolve o
 * perfil do chamador. Retorna null se não houver usuário válido.
 */
export async function getCaller(req: Request): Promise<Caller | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const scoped = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await scoped.auth.getUser()
  if (userErr || !userData.user) return null

  const admin = adminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role, access_level')
    .eq('id', userData.user.id)
    .single()

  return {
    id: userData.user.id,
    role: (profile?.role as 'student' | 'admin') ?? 'student',
    accessLevel: (profile?.access_level as 'free' | 'paid') ?? 'free',
  }
}

/**
 * Regra única de acesso a uma aula, aplicada no servidor.
 * Devolve a aula (com o curso) se o chamador pode consumi-la, senão null.
 */
export async function authorizeLesson(
  admin: SupabaseClient,
  caller: Caller,
  lessonId: string,
) {
  const { data: lesson } = await admin
    .from('lessons')
    .select(
      'id, title, status, access_type, mux_playback_id, video_status, module_id, course_modules!inner(course_id, courses!inner(id, status, access_type))',
    )
    .eq('id', lessonId)
    .single()

  if (!lesson) return null

  // deno-lint-ignore no-explicit-any
  const course = (lesson as any).course_modules.courses

  if (caller.role === 'admin') return { lesson, course }

  if (lesson.status !== 'published') return null
  if (course.status !== 'published') return null

  const effective =
    lesson.access_type === 'free'
      ? 'free'
      : lesson.access_type === 'paid'
        ? 'paid'
        : course.access_type

  if (effective === 'free') return { lesson, course }
  if (caller.accessLevel === 'paid') return { lesson, course }

  return null
}
