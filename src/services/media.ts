import { callFunction, supabase } from '../lib/supabase'

// ---------------------------------------------------------------------
// Vídeo (Mux signed playback)
// ---------------------------------------------------------------------

export type PlaybackToken = {
  playback_id: string
  token: string
  thumbnail_token: string
  storyboard_token: string
  expires_in: number
}

export function getPlaybackToken(lessonId: string): Promise<PlaybackToken> {
  return callFunction<PlaybackToken>('get-video-playback-token', {
    lesson_id: lessonId,
  })
}

// ---------------------------------------------------------------------
// Materiais (Supabase Storage privado)
// ---------------------------------------------------------------------

export type MaterialDownload = { url: string; file_name: string; expires_in: number }

export async function downloadMaterial(materialId: string): Promise<void> {
  const res = await callFunction<MaterialDownload>('get-material-download', {
    material_id: materialId,
  })
  // signed URL com ?download=… — o browser baixa em vez de abrir.
  window.location.href = res.url
}

// ---------------------------------------------------------------------
// Upload de vídeo (Admin) — Direct Upload do Mux via UpChunk
// ---------------------------------------------------------------------

export type MuxUploadTicket = { upload_id: string; upload_url: string }

export function createMuxUpload(lessonId: string): Promise<MuxUploadTicket> {
  return callFunction<MuxUploadTicket>('create-mux-upload', { lesson_id: lessonId })
}

export function deleteMuxVideo(lessonId: string): Promise<{ ok: boolean }> {
  return callFunction<{ ok: boolean }>('delete-mux-video', { lesson_id: lessonId })
}

// ---------------------------------------------------------------------
// Storage público (thumbnails, avatares)
// ---------------------------------------------------------------------

export async function uploadPublicImage(file: File, prefix: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('academy-public')
    .upload(path, file, { cacheControl: '31536000', upsert: false })

  if (error) throw new Error(`Falha ao enviar a imagem: ${error.message}`)

  const { data } = supabase.storage.from('academy-public').getPublicUrl(path)
  return data.publicUrl
}

export async function removePublicImage(publicUrl: string): Promise<void> {
  const marker = '/academy-public/'
  const i = publicUrl.indexOf(marker)
  if (i < 0) return
  const path = publicUrl.slice(i + marker.length)
  await supabase.storage.from('academy-public').remove([path])
}

// ---------------------------------------------------------------------
// Storage privado (materiais de aula) — só admin escreve
// ---------------------------------------------------------------------

export async function uploadMaterialFile(
  file: File,
  lessonId: string,
): Promise<{ storagePath: string }> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${lessonId}/${crypto.randomUUID()}-${safeName}`

  const { error } = await supabase.storage
    .from('academy-materials')
    .upload(path, file, { upsert: false })

  if (error) throw new Error(`Falha ao enviar o material: ${error.message}`)
  return { storagePath: path }
}

export async function removeMaterialFile(storagePath: string): Promise<void> {
  await supabase.storage.from('academy-materials').remove([storagePath])
}
