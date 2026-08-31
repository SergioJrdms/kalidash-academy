// Webhook do Mux. Configure em https://dashboard.mux.com > Settings > Webhooks
// URL: https://<project-ref>.supabase.co/functions/v1/mux-webhook
//
// IMPORTANTE: faça deploy com --no-verify-jwt (o Mux não manda JWT do Supabase).
// A autenticidade vem da assinatura HMAC, verificada abaixo.
import { adminClient } from '../_shared/supabase.ts'
import { verifyWebhookSignature } from '../_shared/mux.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const raw = await req.text()

  const valid = await verifyWebhookSignature(raw, req.headers.get('mux-signature'))
  if (!valid) {
    console.warn('mux-webhook: assinatura inválida')
    return new Response('invalid signature', { status: 401 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  const admin = adminClient()
  const data = event.data ?? {}
  const type = event.type ?? ''

  // Localiza a aula: passthrough é a fonte primária, upload_id é o fallback.
  async function findLessonId(): Promise<string | null> {
    const passthrough = data['passthrough'] as string | undefined
    if (passthrough) {
      const { data: byPassthrough } = await admin
        .from('lessons')
        .select('id')
        .eq('id', passthrough)
        .maybeSingle()
      if (byPassthrough) return byPassthrough.id
    }

    const uploadId = (data['upload_id'] ?? data['id']) as string | undefined
    if (uploadId) {
      const { data: byUpload } = await admin
        .from('lessons')
        .select('id')
        .eq('mux_upload_id', uploadId)
        .maybeSingle()
      if (byUpload) return byUpload.id
    }

    const assetId = data['id'] as string | undefined
    if (assetId) {
      const { data: byAsset } = await admin
        .from('lessons')
        .select('id')
        .eq('mux_asset_id', assetId)
        .maybeSingle()
      if (byAsset) return byAsset.id
    }

    return null
  }

  try {
    if (type === 'video.asset.ready') {
      const lessonId = await findLessonId()
      if (!lessonId) {
        console.warn('mux-webhook: asset.ready sem aula correspondente', data['id'])
        return new Response('ok', { status: 200 })
      }

      const playbackIds = (data['playback_ids'] as Array<{ id: string; policy: string }>) ?? []
      const signed = playbackIds.find((p) => p.policy === 'signed') ?? playbackIds[0]
      const duration = data['duration'] as number | undefined

      await admin
        .from('lessons')
        .update({
          mux_asset_id: data['id'] as string,
          mux_playback_id: signed?.id ?? null,
          duration_seconds: duration ? Math.round(duration) : null,
          video_status: 'ready',
        })
        .eq('id', lessonId)

      return new Response('ok', { status: 200 })
    }

    if (type === 'video.asset.errored' || type === 'video.upload.errored') {
      const lessonId = await findLessonId()
      if (lessonId) {
        await admin.from('lessons').update({ video_status: 'error' }).eq('id', lessonId)
      }
      return new Response('ok', { status: 200 })
    }

    if (type === 'video.asset.created') {
      // asset criado, ainda processando
      const lessonId = await findLessonId()
      if (lessonId) {
        await admin
          .from('lessons')
          .update({ mux_asset_id: data['id'] as string, video_status: 'processing' })
          .eq('id', lessonId)
      }
      return new Response('ok', { status: 200 })
    }

    if (type === 'video.asset.deleted') {
      const assetId = data['id'] as string | undefined
      if (assetId) {
        await admin
          .from('lessons')
          .update({
            mux_asset_id: null,
            mux_playback_id: null,
            mux_upload_id: null,
            video_status: 'empty',
          })
          .eq('mux_asset_id', assetId)
      }
      return new Response('ok', { status: 200 })
    }

    // Demais eventos são ignorados de propósito.
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('mux-webhook', err)
    // 500 faz o Mux reenviar — é o comportamento que queremos.
    return new Response('error', { status: 500 })
  }
})
