import { supabase } from '../lib/supabase'

/**
 * Foto de perfil.
 *
 * O arquivo vai para `academy-public/avatars/<id da pessoa>/`. O caminho
 * carrega a dona, e é nele que a política do storage se apoia: ninguém
 * escreve na pasta de outro. A leitura é aberta, como em qualquer avatar.
 */

const BUCKET = 'academy-public'
const TAMANHO_MAX = 3 * 1024 * 1024 // 3 MB
const LADO_MAX = 512 // px

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Reduz a imagem antes de subir. Uma foto de celular tem 4 MB e 4000px
 * de lado; o avatar aparece com 112. Encolher aqui poupa a banda de
 * quem abre a tela e evita recusa por tamanho.
 */
async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const lado = Math.min(bitmap.width, bitmap.height)
  const escala = Math.min(1, LADO_MAX / lado)
  const w = Math.round(bitmap.width * escala)
  const h = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return arquivo
  ctx.drawImage(bitmap, 0, 0, w, h)

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
  return blob ?? arquivo
}

/** Sobe a foto, grava no perfil e devolve a URL pública. */
export async function enviarAvatar(userId: string, arquivo: File): Promise<string> {
  if (!TIPOS.includes(arquivo.type)) {
    throw new Error('Use uma imagem JPG, PNG ou WebP.')
  }
  if (arquivo.size > TAMANHO_MAX) {
    throw new Error('A imagem passa de 3 MB. Escolha uma menor.')
  }

  const corpo = await reduzir(arquivo)
  // O nome muda a cada envio para a URL antiga não ficar em cache.
  const caminho = `avatars/${userId}/${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, corpo, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho)
  const url = data.publicUrl

  const { error: erroPerfil } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', userId)

  if (erroPerfil) throw new Error(erroPerfil.message)

  void limparAntigas(userId, caminho)
  return url
}

/** Remove as fotos anteriores: só a atual precisa existir. */
async function limparAntigas(userId: string, manter: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list(`avatars/${userId}`)
  const velhas = (data ?? [])
    .map((f) => `avatars/${userId}/${f.name}`)
    .filter((c) => c !== manter)
  if (velhas.length > 0) await supabase.storage.from(BUCKET).remove(velhas)
}

/** Tira a foto do perfil e apaga os arquivos. */
export async function removerAvatar(userId: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list(`avatars/${userId}`)
  const todas = (data ?? []).map((f) => `avatars/${userId}/${f.name}`)
  if (todas.length > 0) await supabase.storage.from(BUCKET).remove(todas)

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw new Error(error.message)
}
