// POST { material_id }
// -> { url, file_name, expires_in }
//
// O bucket academy-materials é privado. O aluno nunca lê direto: recebe
// uma signed URL curta, e só se tiver acesso à aula do material.
import { adminClient, authorizeLesson, getCaller } from '../_shared/supabase.ts'
import { json, preflight } from '../_shared/http.ts'

const TTL = 120 // 2 min: tempo de clicar e baixar

Deno.serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const origin = req.headers.get('origin')

  try {
    const caller = await getCaller(req)
    if (!caller) return json({ error: 'não autenticado' }, 401, origin)

    const { material_id } = await req.json().catch(() => ({}))
    if (!material_id) return json({ error: 'material_id obrigatório' }, 400, origin)

    const admin = adminClient()

    const { data: material } = await admin
      .from('lesson_materials')
      .select('id, lesson_id, storage_path, file_name')
      .eq('id', material_id)
      .single()

    if (!material) return json({ error: 'material não encontrado' }, 404, origin)

    const allowed = await authorizeLesson(admin, caller, material.lesson_id)
    if (!allowed) {
      return json(
        { error: 'Este material faz parte do acesso pago do Academy.', code: 'locked' },
        403,
        origin,
      )
    }

    const { data: signed, error } = await admin.storage
      .from('academy-materials')
      .createSignedUrl(material.storage_path, TTL, { download: material.file_name })

    if (error || !signed) {
      console.error('signed url', error)
      return json({ error: 'não foi possível gerar o download' }, 500, origin)
    }

    return json(
      { url: signed.signedUrl, file_name: material.file_name, expires_in: TTL },
      200,
      origin,
    )
  } catch (err) {
    console.error('get-material-download', err)
    return json({ error: 'erro ao preparar o download' }, 500, origin)
  }
})
