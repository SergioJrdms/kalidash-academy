// POST { lesson_id }
// -> { upload_id, upload_url }
// Só admin. O browser envia o arquivo DIRETO para o Mux (UpChunk).
import { adminClient, getCaller } from '../_shared/supabase.ts'
import { createDirectUpload, MuxError } from '../_shared/mux.ts'
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
      .select('id, mux_asset_id')
      .eq('id', lesson_id)
      .single()

    if (!lesson) return json({ error: 'aula não encontrada' }, 404, origin)

    const corsOrigin = Deno.env.get('APP_ORIGIN') ?? origin ?? '*'
    const upload = await createDirectUpload({
      corsOrigin,
      passthrough: lesson.id,
    })

    await admin
      .from('lessons')
      .update({ mux_upload_id: upload.id, video_status: 'uploading' })
      .eq('id', lesson.id)

    return json({ upload_id: upload.id, upload_url: upload.url }, 200, origin)
  } catch (err) {
    if (err instanceof MuxError) {
      // Limite do plano Mux, credencial inválida etc. Mensagem clara no Admin.
      const limitHit = /limit|quota|maximum/i.test(err.message)
      return json(
        {
          error: limitHit
            ? `O Mux recusou o upload: ${err.message}. Provavelmente o limite de vídeos do plano foi atingido — remova um vídeo antigo ou faça upgrade do plano.`
            : `Erro do Mux: ${err.message}`,
        },
        502,
        origin,
      )
    }
    console.error('create-mux-upload', err)
    return json({ error: 'erro inesperado ao criar o upload' }, 500, origin)
  }
})
