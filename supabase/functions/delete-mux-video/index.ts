// POST { lesson_id }
// -> { ok: true }
//
// Remove o vídeo da aula E o asset no Mux. Existe porque o plano Mux Free
// tem limite de vídeos armazenados: deixar asset órfão custa vaga.
import { adminClient, getCaller } from '../_shared/supabase.ts'
import { cancelUpload, deleteAsset, MuxError } from '../_shared/mux.ts'
import { json, preflight } from '../_shared/http.ts'

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const origin = req.headers.get('origin')

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'não autenticado' }, 401, origin)
    if (caller.role !== 'admin') return json({ error: 'acesso negado' }, 403, origin)

    const { lesson_id } = await req.json().catch(() => ({}))
    if (!lesson_id) return json({ error: 'lesson_id obrigatório' }, 400, origin)

    const admin = adminClient()
    const { data: lesson } = await admin
      .from('lessons')
      .select('id, mux_asset_id, mux_upload_id, video_status')
      .eq('id', lesson_id)
      .single()

    if (!lesson) return json({ error: 'aula não encontrada' }, 404, origin)

    if (lesson.mux_asset_id) {
      await deleteAsset(lesson.mux_asset_id)
    } else if (lesson.mux_upload_id && lesson.video_status === 'uploading') {
      await cancelUpload(lesson.mux_upload_id)
    }

    await admin
      .from('lessons')
      .update({
        mux_asset_id: null,
        mux_playback_id: null,
        mux_upload_id: null,
        video_status: 'empty',
        duration_seconds: null,
      })
      .eq('id', lesson.id)

    return json({ ok: true }, 200, origin)
  } catch (err) {
    if (err instanceof MuxError) {
      return json({ error: `Erro do Mux: ${err.message}` }, 502, origin)
    }
    console.error('delete-mux-video', err)
    return json({ error: 'erro ao remover o vídeo' }, 500, origin)
  }
})
