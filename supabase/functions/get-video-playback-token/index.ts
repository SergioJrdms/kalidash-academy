// POST { lesson_id }
// -> { playback_id, token, thumbnail_token, storyboard_token, expires_in }
//
// Esta é a fronteira de acesso ao vídeo. O playback é SIGNED: saber o
// playback_id não basta para assistir. Quem decide é esta função.
import { adminClient, authorizeLesson, getCaller } from '../_shared/supabase.ts'
import { signPlaybackToken } from '../_shared/mux.ts'
import { json, preflight } from '../_shared/http.ts'

const TTL = 3600 // 1h

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const origin = req.headers.get('origin')

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'não autenticado' }, 401, origin)

    const { lesson_id } = await req.json().catch(() => ({}))
    if (!lesson_id) return json({ error: 'lesson_id obrigatório' }, 400, origin)

    const admin = adminClient()
    const allowed = await authorizeLesson(admin, caller, lesson_id)

    if (!allowed) {
      return json(
        { error: 'Este conteúdo faz parte do acesso pago do Academy.', code: 'locked' },
        403,
        origin,
      )
    }

    const { lesson } = allowed

    if (lesson.video_status !== 'ready' || !lesson.mux_playback_id) {
      return json(
        { error: 'vídeo indisponível', code: lesson.video_status },
        409,
        origin,
      )
    }

    const [token, thumbnailToken, storyboardToken] = await Promise.all([
      signPlaybackToken(lesson.mux_playback_id, 'v', TTL),
      signPlaybackToken(lesson.mux_playback_id, 't', TTL),
      signPlaybackToken(lesson.mux_playback_id, 's', TTL),
    ])

    return json(
      {
        playback_id: lesson.mux_playback_id,
        token,
        thumbnail_token: thumbnailToken,
        storyboard_token: storyboardToken,
        expires_in: TTL,
      },
      200,
      origin,
    )
  } catch (err) {
    console.error('get-video-playback-token', err)
    return json({ error: 'erro ao liberar o vídeo' }, 500, origin)
  }
})
