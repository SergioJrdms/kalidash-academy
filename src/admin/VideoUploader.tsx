import { useEffect, useRef, useState } from 'react'
import * as UpChunk from '@mux/upchunk'
import { createMuxUpload, deleteMuxVideo } from '../services/media'
import { adminGetLesson } from '../services/admin'
import { formatDuration, formatFileSize } from '../lib/format'
import type { Lesson, VideoStatus } from '../types/db'
import { Banner, GhostButton, Spinner } from '../components/ui'

const STATUS_LABEL: Record<VideoStatus, string> = {
  empty: 'Nenhum vídeo',
  uploading: 'Enviando...',
  processing: 'Processando...',
  ready: 'Pronto',
  error: 'Falhou',
}

const STATUS_COLOR: Record<VideoStatus, string> = {
  empty: 'var(--tx3)',
  uploading: 'var(--p2)',
  processing: 'var(--p2)',
  ready: 'var(--ok)',
  error: 'var(--danger)',
}

/**
 * O arquivo vai do browser DIRETO para o Mux (Direct Upload + UpChunk).
 * Nada de vídeo passa pelo Supabase.
 */
export default function VideoUploader({
  lesson,
  onChange,
}: {
  lesson: Lesson
  onChange: (lesson: Lesson) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const uploadRef = useRef<UpChunk.UpChunk | null>(null)
  const pollRef = useRef<number | null>(null)

  const status = lesson.video_status

  // Enquanto o Mux processa, o webhook atualiza a linha. Consultamos
  // periodicamente para o Admin ver o status virar "Pronto" sozinho.
  useEffect(() => {
    if (status !== 'processing' && status !== 'uploading') return
    let stopped = false

    async function tick() {
      try {
        const fresh = await adminGetLesson(lesson.id)
        if (stopped) return
        if (fresh.video_status !== status) onChange(fresh)
      } catch {
        /* ignora falha de polling */
      }
    }

    pollRef.current = window.setInterval(tick, 6000)
    return () => {
      stopped = true
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [status, lesson.id, onChange])

  useEffect(() => () => uploadRef.current?.abort(), [])

  async function start(selected: File) {
    setFile(selected)
    setError(null)
    setProgress(0)
    setUploading(true)

    try {
      const ticket = await createMuxUpload(lesson.id)

      const upload = UpChunk.createUpload({
        endpoint: ticket.upload_url,
        file: selected,
        chunkSize: 5120, // 5 MB — resiliente em conexões instáveis
      })
      uploadRef.current = upload

      upload.on('progress', (e) => setProgress(Math.round(e.detail)))

      upload.on('error', (e) => {
        setUploading(false)
        setError(
          `Falha no envio: ${e.detail?.message ?? 'conexão interrompida'}. Tente de novo.`,
        )
      })

      upload.on('success', () => {
        setUploading(false)
        setProgress(100)
        // O Mux ainda precisa processar; o webhook fecha o ciclo.
        onChange({ ...lesson, video_status: 'processing' })
      })

      onChange({ ...lesson, video_status: 'uploading', mux_upload_id: ticket.upload_id })
    } catch (err) {
      setUploading(false)
      setError(err instanceof Error ? err.message : 'Não foi possível iniciar o upload.')
    }
  }

  async function remove() {
    if (
      !window.confirm(
        'Remover o vídeo desta aula?\n\nO arquivo também será apagado do Mux, liberando espaço no plano. A ação não pode ser desfeita.',
      )
    )
      return

    setRemoving(true)
    setError(null)
    try {
      uploadRef.current?.abort()
      await deleteMuxVideo(lesson.id)
      setFile(null)
      setProgress(0)
      onChange({
        ...lesson,
        mux_asset_id: null,
        mux_playback_id: null,
        mux_upload_id: null,
        video_status: 'empty',
        duration_seconds: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover o vídeo.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div
      style={{
        background: 'var(--sf)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--tx3)',
          }}
        >
          Vídeo
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: STATUS_COLOR[status],
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          {(status === 'processing' || status === 'uploading') && <Spinner size={11} />}
          {STATUS_LABEL[status]}
        </span>
        {lesson.duration_seconds ? (
          <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
            {formatDuration(lesson.duration_seconds)}
          </span>
        ) : null}
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {status === 'processing' && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="info">
            O Mux está processando o vídeo. Isso leva alguns minutos e o status atualiza
            sozinho — você pode continuar editando a aula.
          </Banner>
        </div>
      )}

      {uploading && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--tx2)',
              marginBottom: 8,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 600 }}>{file?.name}</span>
            <span style={{ color: 'var(--tx3)' }}>{formatFileSize(file?.size)}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--p2)', fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 9,
              background: 'var(--line)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg,var(--p),var(--p2))',
                transition: 'width .2s',
              }}
            />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label
          style={{
            border: '1px solid var(--line2)',
            borderRadius: 999,
            padding: '11px 22px',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.55 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          {status === 'ready' || status === 'error' ? 'Substituir vídeo' : 'Selecionar vídeo'}
          <input
            type="file"
            accept="video/*"
            hidden
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void start(f)
              e.target.value = ''
            }}
          />
        </label>

        {(status === 'ready' ||
          status === 'error' ||
          status === 'processing' ||
          status === 'uploading') && (
          <GhostButton onClick={() => void remove()} disabled={removing} style={{ padding: '11px 20px' }}>
            {removing ? 'Removendo...' : 'Remover vídeo'}
          </GhostButton>
        )}

        {uploading && (
          <button
            onClick={() => {
              uploadRef.current?.abort()
              setUploading(false)
              setError('Envio cancelado.')
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--tx3)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 14, lineHeight: 1.55 }}>
        O arquivo vai do seu navegador direto para o Mux — não passa pelo nosso servidor.
        Envios grandes retomam sozinhos se a conexão oscilar.
      </div>
    </div>
  )
}
