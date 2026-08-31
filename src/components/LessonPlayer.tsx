import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { getPlaybackToken, type PlaybackToken } from '../services/media'
import { saveWatched } from '../services/progress'
import { Spinner } from './ui'

const SAVE_EVERY_SECONDS = 15

// O Mux Player é pesado. Só entra no bundle quando existe vídeo liberado
// para tocar — aula bloqueada, em processamento ou só-texto não paga isso.
const MuxPlayer = lazy(() => import('@mux/mux-player-react'))

/** Moldura 16:9 do protótipo, usada por todos os estados do player. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 22,
        border: '1px solid var(--line)',
        background: 'linear-gradient(150deg,#1B1226,#0D0814)',
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {children}
    </div>
  )
}

function CenteredMessage({
  icon,
  title,
  message,
}: {
  icon?: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 330, padding: 20 }}>
      {icon && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.18)',
            background: 'rgba(255,255,255,.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 15,
          color: '#fff',
          marginBottom: 7,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)', lineHeight: 1.55 }}>
        {message}
      </div>
    </div>
  )
}

export type LessonPlayerProps = {
  lessonId: string
  lessonTitle: string
  userId: string
  /** o usuário pode assistir? */
  unlocked: boolean
  videoStatus: 'empty' | 'uploading' | 'processing' | 'ready' | 'error'
  /** de onde retomar */
  startAt: number
  onEnded?: () => void
  /** avisa a página do tempo assistido para o "marcar como concluída" */
  onTime?: (seconds: number) => void
}

export default function LessonPlayer({
  lessonId,
  lessonTitle,
  userId,
  unlocked,
  videoStatus,
  startAt,
  onEnded,
  onTime,
}: LessonPlayerProps) {
  const [tokens, setTokens] = useState<PlaybackToken | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const lastSaved = useRef(0)
  const currentTime = useRef(startAt)
  const seeked = useRef(false)

  useEffect(() => {
    if (!unlocked || videoStatus !== 'ready') return
    let active = true
    setLoading(true)
    setError(null)

    getPlaybackToken(lessonId)
      .then((t) => {
        if (active) setTokens(t)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Não foi possível liberar o vídeo agora.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lessonId, unlocked, videoStatus])

  const flush = useCallback(
    (seconds: number) => {
      if (!userId || seconds <= 0) return
      lastSaved.current = seconds
      void saveWatched(userId, lessonId, seconds)
    },
    [userId, lessonId],
  )

  // grava ao sair da página / trocar de aba
  useEffect(() => {
    const onHide = () => {
      if (currentTime.current > lastSaved.current) flush(currentTime.current)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onHide)
      onHide()
    }
  }, [flush])

  // ---------------- estados sem player ----------------

  if (!unlocked) {
    return (
      <Frame>
        <CenteredMessage
          icon={
            <svg
              width={19}
              height={19}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,.6)"
              strokeWidth={1.7}
              strokeLinecap="round"
            >
              <path d="M7 11V8a5 5 0 1110 0v3" />
              <rect x="5" y="11" width="14" height="9" rx="2" />
            </svg>
          }
          title="Esta aula abre com o acesso"
          message="Você continua vendo do que ela trata e qual aplicação vem depois."
        />
      </Frame>
    )
  }

  if (videoStatus === 'uploading' || videoStatus === 'processing') {
    return (
      <Frame>
        <CenteredMessage
          icon={<Spinner size={20} color="rgba(255,255,255,.6)" />}
          title="Vídeo em processamento"
          message="O vídeo desta aula ainda está sendo preparado. Atualize a página em alguns minutos."
        />
      </Frame>
    )
  }

  if (videoStatus === 'error') {
    return (
      <Frame>
        <CenteredMessage
          title="O vídeo desta aula falhou"
          message="Já avisamos o time. O conteúdo em texto e a aplicação abaixo continuam disponíveis."
        />
      </Frame>
    )
  }

  if (error) {
    return (
      <Frame>
        <CenteredMessage title="Não foi possível abrir o vídeo" message={error} />
      </Frame>
    )
  }

  if (loading || !tokens) {
    return (
      <Frame>
        <Spinner size={26} color="rgba(255,255,255,.5)" />
      </Frame>
    )
  }

  // ---------------- player ----------------
  return (
    <div style={{ marginBottom: 30 }}>
      <Suspense
        fallback={
          <Frame>
            <Spinner size={26} color="rgba(255,255,255,.5)" />
          </Frame>
        }
      >
      <MuxPlayer
        playbackId={tokens.playback_id}
        tokens={{
          playback: tokens.token,
          thumbnail: tokens.thumbnail_token,
          storyboard: tokens.storyboard_token,
        }}
        streamType="on-demand"
        accentColor="#7343FB"
        metadata={{ video_title: lessonTitle, viewer_user_id: userId }}
        startTime={startAt > 0 ? startAt : undefined}
        onLoadedMetadata={() => {
          seeked.current = true
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget as HTMLVideoElement
          const t = el.currentTime
          currentTime.current = t
          onTime?.(t)
          if (t - lastSaved.current >= SAVE_EVERY_SECONDS) flush(t)
        }}
        onPause={(e) => {
          const el = e.currentTarget as HTMLVideoElement
          flush(el.currentTime)
        }}
        onEnded={(e) => {
          const el = e.currentTarget as HTMLVideoElement
          flush(el.currentTime)
          onEnded?.()
        }}
      />
      </Suspense>
    </div>
  )
}
