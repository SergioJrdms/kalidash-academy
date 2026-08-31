import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked, loadLesson, nextLessonOf, type LessonView } from '../services/catalog'
import { markCompleted, toggleApplied, unmarkCompleted } from '../services/progress'
import { renderMarkdown } from '../lib/markdown'
import { formatDuration, initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import type { LessonProgress } from '../types/db'
import {
  Avatar,
  Banner,
  ErrorState,
  GhostButton,
  Icon,
  Kicker,
  PageLoading,
  Spinner,
} from '../components/ui'
import LessonPlayer from '../components/LessonPlayer'
import ApplicationBlock from '../components/ApplicationBlock'
import MaterialList from '../components/MaterialList'
import PersonalizationModal from '../components/PersonalizationModal'
import UnlockModal from '../components/UnlockModal'

export default function Aula() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const { profile, isPaid, session, refreshProfile } = useAuth()
  const { courses, loading: catalogLoading, reload: reloadCatalog } = useCatalog()
  const navigate = useNavigate()

  const [view, setView] = useState<LessonView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [applyBusy, setApplyBusy] = useState(false)
  const [doneBusy, setDoneBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPers, setShowPers] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)

  const userId = session?.user.id ?? null
  const watched = useRef(0)

  useEffect(() => {
    if (!lessonId || !userId) return
    let active = true
    setLoading(true)
    setError(null)

    loadLesson(lessonId, userId)
      .then((v) => {
        if (!active) return
        if (!v) {
          setError('Esta aula não está publicada ou o endereço mudou.')
          return
        }
        setView(v)
        setProgress(v.progress)
        watched.current = v.progress?.watched_seconds ?? 0
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Não conseguimos abrir esta aula.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [lessonId, userId])

  const course = useMemo(
    () => courses.find((c) => c.lessons.some((l) => l.id === lessonId)) ?? null,
    [courses, lessonId],
  )

  const next = useMemo(
    () => (course && lessonId ? nextLessonOf(course, lessonId) : null),
    [course, lessonId],
  )

  if (loading || catalogLoading) return <PageLoading />

  if (error || !view) {
    return (
      <div className="k-page" style={{ padding: '40px 56px' }}>
        <ErrorState
          title="Aula indisponível"
          message={error ?? 'Não conseguimos abrir esta aula.'}
          onRetry={() => navigate('/conteudos')}
        />
      </div>
    )
  }

  const { outline, full, materials } = view
  const unlocked = isLessonUnlocked(outline, isPaid)
  const isDone = Boolean(progress?.completed_at)
  const isApplied = Boolean(progress?.applied_at)

  const moduleTitle = course?.modules.find((m) => m.id === outline.module_id)?.title ?? ''
  const isSingleLesson = (course?.lessonCount ?? 0) <= 1
  const crumb = course ? (isSingleLesson ? 'Conteúdos' : course.title) : 'Conteúdos'
  const crumbTo = course && !isSingleLesson ? `/conteudos/${course.slug}` : '/conteudos'

  const bodyHtml = renderMarkdown(full?.body_markdown)
  const hasApplication = Boolean(full?.application_title)

  const metaParts = [
    !isSingleLesson && course ? course.title : null,
    moduleTitle || null,
    formatDuration(outline.duration_seconds) || null,
  ].filter(Boolean)

  async function handleApply() {
    if (!userId || !lessonId) return
    setApplyBusy(true)
    setActionError(null)
    try {
      const updated = await toggleApplied(userId, lessonId, !isApplied)
      setProgress(updated)
      // Primeira aplicação e ainda sem personalização: é o momento do protótipo.
      if (!isApplied && !profile?.area) setShowPers(true)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Não conseguimos salvar sua aplicação.',
      )
    } finally {
      setApplyBusy(false)
    }
  }

  async function handleDone() {
    if (!userId || !lessonId) return
    setDoneBusy(true)
    setActionError(null)
    try {
      const updated = isDone
        ? await unmarkCompleted(userId, lessonId)
        : await markCompleted(userId, lessonId, watched.current)
      setProgress(updated)
      void reloadCatalog()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não conseguimos salvar.')
    } finally {
      setDoneBusy(false)
    }
  }

  return (
    <div className="k-page" style={{ padding: '40px 56px 100px', maxWidth: 840 }}>
      <Link
        to={crumbTo}
        style={{
          color: 'var(--tx3)',
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: 22,
        }}
      >
        ← {crumb}
      </Link>

      {/* ---------- VÍDEO ---------- */}
      {(outline.has_video || !unlocked) && userId && (
        <LessonPlayer
          lessonId={outline.id}
          lessonTitle={outline.title}
          userId={userId}
          unlocked={unlocked}
          videoStatus={full?.video_status ?? 'empty'}
          startAt={progress?.watched_seconds ?? 0}
          onTime={(t) => {
            watched.current = t
          }}
          onEnded={() => {
            if (!isDone) void handleDone()
          }}
        />
      )}

      {/* ---------- TÍTULO ---------- */}
      <h1
        className="k-h1"
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 28,
          lineHeight: 1.2,
          letterSpacing: '-.025em',
          margin: '0 0 16px',
          maxWidth: 640,
        }}
      >
        {outline.title}
      </h1>

      {/* ---------- PROFESSOR · DURAÇÃO ---------- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={initials(course?.instructor_name)} size={30} fontSize={10} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {course?.instructor_name ?? 'Time Kalidash'}
          </span>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{metaParts.join(' · ')}</span>

        {unlocked && (
          <button
            onClick={() => void handleDone()}
            disabled={doneBusy}
            style={{
              marginLeft: 'auto',
              background: isDone ? 'var(--oksoft)' : 'transparent',
              border: `1px solid ${isDone ? 'var(--ok)' : 'var(--line2)'}`,
              color: isDone ? 'var(--ok)' : 'var(--tx2)',
              borderRadius: 999,
              padding: '8px 16px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {doneBusy ? <Spinner size={12} /> : <Icon d={NAV_ICON.check} size={12} width={2.6} />}
            {isDone ? 'Aula concluída' : 'Marcar como concluída'}
          </button>
        )}
      </div>

      {actionError && (
        <div style={{ marginBottom: 24 }}>
          <Banner kind="error">{actionError}</Banner>
        </div>
      )}

      {/* ---------- RESUMO ---------- */}
      {outline.summary && (
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: 'var(--tx)',
            margin: `0 0 ${bodyHtml ? 34 : 44}px`,
            maxWidth: 640,
            textWrap: 'pretty',
          }}
        >
          {outline.summary}
        </p>
      )}

      {/* ---------- CONTEÚDO TEXTUAL ---------- */}
      {bodyHtml && (
        <div
          className="k-md"
          style={{ marginBottom: 44 }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}

      {/* ---------- Bloqueado: nem texto nem aplicação vieram do servidor ---------- */}
      {!unlocked && (
        <div
          className="k-stack-mobile"
          style={{
            border: '1px solid var(--pline)',
            background: 'linear-gradient(125deg,var(--psoft),transparent 72%)',
            borderRadius: 22,
            padding: 28,
            marginBottom: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'Raleway,sans-serif',
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              Esta aula faz parte do acesso pago do Academy.
            </div>
            <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: 0, maxWidth: 500 }}>
              O vídeo, o conteúdo em texto, os materiais e a aplicação abrem com o acesso.
            </p>
          </div>
          <GhostButton onClick={() => setShowUnlock(true)} style={{ whiteSpace: 'nowrap' }}>
            Desbloquear acesso
          </GhostButton>
        </div>
      )}

      {/* ---------- APLIQUE NO SEU TRABALHO ---------- */}
      {unlocked && hasApplication && full && (
        <ApplicationBlock
          title={full.application_title!}
          minutes={full.application_minutes}
          steps={Array.isArray(full.application_steps) ? full.application_steps : []}
          note={full.application_note}
          applied={isApplied}
          busy={applyBusy}
          onToggle={() => void handleApply()}
        />
      )}

      {/* ---------- LEVE COM VOCÊ ---------- */}
      <MaterialList
        materials={materials}
        unlocked={unlocked}
        onLockedClick={() => setShowUnlock(true)}
      />

      {/* ---------- SEU PRÓXIMO PASSO ---------- */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 34 }}>
        <Kicker style={{ marginBottom: 18 }}>Seu próximo passo</Kicker>
        {next ? (
          <NextCard
            kicker={`Próxima aula · ${course?.modules.find((m) => m.id === next.module_id)?.title ?? ''}`}
            title={next.title}
            meta={formatDuration(next.duration_seconds) || 'Aula'}
            cta="Continuar"
            to={`/aula/${next.id}`}
          />
        ) : !profile?.area ? (
          <NextCard
            kicker="Antes de continuar"
            title="Deixe o Academy mais relevante para você"
            meta="Duas perguntas · 15 segundos"
            cta="Personalizar"
            onClick={() => setShowPers(true)}
          />
        ) : (
          <NextCard
            kicker="Continue"
            title="Veja o que mais está no ar para a sua área"
            meta="Conteúdos publicados"
            cta="Abrir"
            to="/conteudos"
          />
        )}
      </div>

      {showPers && (
        <PersonalizationModal
          onClose={() => setShowPers(false)}
          onSaved={() => {
            void refreshProfile()
            void reloadCatalog()
          }}
        />
      )}
      {showUnlock && (
        <UnlockModal
          courseTitle={course?.title ?? outline.title}
          onClose={() => setShowUnlock(false)}
        />
      )}
    </div>
  )
}

function NextCard({
  kicker,
  title,
  meta,
  cta,
  to,
  onClick,
}: {
  kicker: string
  title: string
  meta: string
  cta: string
  to?: string
  onClick?: () => void
}) {
  const inner = (
    <>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: 'var(--tx3)',
            marginBottom: 8,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.3,
            marginBottom: 5,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{meta}</div>
      </div>
      <div
        style={{
          flex: 'none',
          background: 'linear-gradient(180deg,#8a5cff,var(--p))',
          color: '#fff',
          borderRadius: 999,
          padding: '13px 28px',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: 'var(--glow)',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {cta}
      </div>
    </>
  )

  const style: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    background: 'var(--sf)',
    border: '1px solid var(--pline)',
    borderRadius: 20,
    padding: '24px 26px',
    cursor: 'pointer',
    color: 'var(--tx)',
    transition: 'all .2s',
  }

  if (to) {
    return (
      <Link to={to} className="k-lift k-stack-mobile" style={style}>
        {inner}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className="k-lift k-stack-mobile" style={style}>
      {inner}
    </button>
  )
}
