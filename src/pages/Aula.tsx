import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked, loadLesson, nextLessonOf, type LessonView } from '../services/catalog'
import { markCompleted, toggleApplied, unmarkCompleted } from '../services/progress'
import { loadLabs, loadNote, loadQuiz, saveNote, type LabView } from '../services/jornada'
import { renderMarkdown } from '../lib/markdown'
import { formatDuration, initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import type { LessonProgress, LessonQuiz } from '../types/db'
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
import QuizCard from '../components/QuizCard'
import UnlockModal from '../components/UnlockModal'
import { makeVideoMilestoneTracker, track } from '../lib/analytics'

type Aba = 'visao' | 'transcricao' | 'materiais' | 'anotacoes'

export default function Aula() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const { isPaid, session } = useAuth()
  const { courses, loading: catalogLoading, reload: reloadCatalog } = useCatalog()
  const navigate = useNavigate()
  const userId = session?.user.id ?? null

  const [view, setView] = useState<LessonView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [quizzes, setQuizzes] = useState<LessonQuiz[]>([])
  const [labs, setLabs] = useState<LabView[]>([])
  const [aba, setAba] = useState<Aba>('visao')
  const [nota, setNota] = useState('')
  const [notaSalva, setNotaSalva] = useState(true)
  const [applyBusy, setApplyBusy] = useState(false)
  const [doneBusy, setDoneBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)

  const watched = useRef(0)

  useEffect(() => {
    if (!lessonId || !userId) return
    let active = true
    setLoading(true)
    setError(null)

    Promise.all([
      loadLesson(lessonId, userId),
      loadQuiz(lessonId).catch(() => [] as LessonQuiz[]),
      loadNote(userId, lessonId).catch(() => ''),
      loadLabs(userId).catch(() => [] as LabView[]),
    ])
      .then(([v, q, n, l]) => {
        if (!active) return
        if (!v) {
          setError('Esta aula não está publicada ou o endereço mudou.')
          return
        }
        setView(v)
        setProgress(v.progress)
        setQuizzes(q)
        setNota(n)
        setLabs(l)
        watched.current = v.progress?.watched_seconds ?? 0
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Não conseguimos abrir esta aula.')
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

  /** O lab ligado a esta aula vira a "próxima etapa" prática. */
  const labDaAula = useMemo(
    () => labs.find((l) => l.lesson_id === lessonId && !l.is_case) ?? null,
    [labs, lessonId],
  )

  const milestone = useMemo(
    () => (lessonId ? makeVideoMilestoneTracker(lessonId, course?.id ?? null) : null),
    [lessonId, course?.id],
  )

  useEffect(() => {
    if (!view || !lessonId) return
    track('lesson_started', {
      lesson_id: lessonId,
      course_id: course?.id ?? null,
      titulo: view.outline.title,
      bloqueada: !isLessonUnlocked(view.outline, isPaid),
      tem_video: view.outline.has_video,
    })
  }, [view?.outline.id, isPaid])

  // Anotação salva sozinha, com uma pausa para não escrever a cada tecla.
  const salvarNota = useCallback(
    (texto: string) => {
      if (!userId || !lessonId) return
      void saveNote(userId, lessonId, texto).then(() => setNotaSalva(true))
    },
    [userId, lessonId],
  )

  useEffect(() => {
    if (notaSalva) return
    const t = setTimeout(() => salvarNota(nota), 900)
    return () => clearTimeout(t)
  }, [nota, notaSalva, salvarNota])

  if (loading || catalogLoading) return <PageLoading />

  if (error || !view) {
    return (
      <div className="k-page" style={{ padding: '48px 48px' }}>
        <ErrorState
          title="Aula indisponível"
          message={error ?? 'Não conseguimos abrir esta aula.'}
          onRetry={() => navigate('/explorar')}
        />
      </div>
    )
  }

  const { outline, full, materials } = view
  const unlocked = isLessonUnlocked(outline, isPaid)
  const isDone = Boolean(progress?.completed_at)
  const isApplied = Boolean(progress?.applied_at)

  const moduleTitle = course?.modules.find((m) => m.id === outline.module_id)?.title ?? ''
  const bodyHtml = renderMarkdown(full?.body_markdown)
  const hasApplication = Boolean(full?.application_title)

  async function handleApply() {
    if (!userId || !lessonId) return
    setApplyBusy(true)
    setActionError(null)
    try {
      const updated = await toggleApplied(userId, lessonId, !isApplied)
      setProgress(updated)
      if (!isApplied) {
        track('lesson_applied', { lesson_id: lessonId, course_id: course?.id ?? null })
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não conseguimos salvar sua aplicação.')
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
      if (!isDone) {
        track('lesson_completed', {
          lesson_id: lessonId,
          course_id: course?.id ?? null,
          segundos_assistidos: Math.round(watched.current),
        })
      }
      void reloadCatalog()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não conseguimos salvar.')
    } finally {
      setDoneBusy(false)
    }
  }

  const abas: { id: Aba; label: string }[] = [
    { id: 'visao', label: 'Visão geral' },
    { id: 'transcricao', label: 'Transcrição' },
    { id: 'materiais', label: `Materiais (${materials.length})` },
    { id: 'anotacoes', label: 'Minhas anotações' },
  ]

  return (
    <div className="k-page" style={{ padding: '40px 48px 100px', maxWidth: 1320 }}>
      <Link
        to={course ? `/conteudos/${course.slug}` : '/explorar'}
        style={{ color: 'var(--tx2)', fontSize: 13.5, display: 'inline-block', marginBottom: 20 }}
      >
        ← {course?.title ?? 'Explorar'}
      </Link>

      <div
        className="k-grid-2"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 28 }}
      >
        {/* ================= coluna principal ================= */}
        <div style={{ minWidth: 0 }}>
          <h1 className="k-display k-h2" style={{ marginBottom: 20 }}>
            {outline.title}
          </h1>

          {(outline.has_video || !unlocked) && userId && (
            <LessonPlayer
              lessonId={outline.id}
              lessonTitle={outline.title}
              userId={userId}
              unlocked={unlocked}
              videoStatus={full?.video_status ?? 'empty'}
              startAt={progress?.watched_seconds ?? 0}
              onTime={(t, total) => {
                watched.current = t
                milestone?.(t, total)
              }}
              onEnded={() => {
                if (!isDone) void handleDone()
              }}
            />
          )}

          {/* chip de conclusão, alinhado à direita como no design */}
          {unlocked && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <button
                onClick={() => void handleDone()}
                disabled={doneBusy}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  background: isDone ? 'var(--oksoft)' : 'var(--surface)',
                  border: `1px solid ${isDone ? 'var(--ok)' : 'var(--line2)'}`,
                  color: isDone ? 'var(--ok)' : 'var(--tx2)',
                  borderRadius: 'var(--r-control)',
                  padding: '9px 16px',
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {doneBusy ? <Spinner size={13} /> : <Icon d={NAV_ICON.check} size={14} width={2.2} />}
                {isDone ? 'Marcada como concluída' : 'Marcar como concluída'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
            <Avatar name={initials(course?.instructor_name)} size={30} />
            <span style={{ fontSize: 14 }}>{course?.instructor_name ?? 'Time Kalidash'}</span>
            <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
              {[moduleTitle, formatDuration(outline.duration_seconds)].filter(Boolean).join(' · ')}
            </span>
          </div>

          {actionError && (
            <div style={{ marginBottom: 20 }}>
              <Banner kind="error">{actionError}</Banner>
            </div>
          )}

          {/* ---------------- abas ---------------- */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 26 }}>
            {abas.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${aba === a.id ? 'var(--imperial)' : 'transparent'}`,
                  color: aba === a.id ? 'var(--tx)' : 'var(--tx2)',
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: aba === a.id ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {a.label}
              </button>
            ))}
          </div>

          {!unlocked ? (
            <div
              className="k-card k-stack-mobile"
              style={{ display: 'flex', alignItems: 'center', gap: 26, padding: 26 }}
            >
              <div style={{ flex: 1 }}>
                <h3 className="k-display" style={{ fontSize: 19, marginBottom: 8 }}>
                  Esta aula faz parte do acesso pago
                </h3>
                <p style={{ color: 'var(--tx2)', fontSize: 14, margin: 0 }}>
                  O vídeo, a transcrição, os materiais e a aplicação abrem com o acesso.
                </p>
              </div>
              <GhostButton onClick={() => setShowUnlock(true)}>Desbloquear acesso</GhostButton>
            </div>
          ) : (
            <>
              {aba === 'visao' && (
                <>
                  {outline.summary && (
                    <p
                      style={{
                        fontSize: 16,
                        lineHeight: 1.7,
                        margin: `0 0 ${bodyHtml ? 28 : 36}px`,
                        maxWidth: 720,
                        textWrap: 'pretty',
                      }}
                    >
                      {outline.summary}
                    </p>
                  )}
                  {bodyHtml && (
                    <div
                      className="k-md"
                      style={{ marginBottom: 36 }}
                      dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    />
                  )}
                  {hasApplication && full && (
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
                </>
              )}

              {aba === 'transcricao' && (
                <div className="k-md" style={{ maxWidth: 720 }}>
                  {full?.transcript ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(full.transcript) }} />
                  ) : (
                    <p style={{ color: 'var(--tx2)' }}>
                      A transcrição desta aula ainda não foi publicada.
                    </p>
                  )}
                </div>
              )}

              {aba === 'materiais' && (
                <MaterialList
                  materials={materials}
                  unlocked={unlocked}
                  courseId={course?.id ?? null}
                  onLockedClick={() => setShowUnlock(true)}
                />
              )}

              {aba === 'anotacoes' && (
                <div style={{ maxWidth: 720 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <p style={{ fontSize: 14, color: 'var(--tx2)', margin: 0 }}>
                      Suas anotações ficam salvas e aparecem também em Minha Jornada.
                    </p>
                    <span style={{ fontSize: 12.5, color: notaSalva ? 'var(--ok)' : 'var(--tx3)' }}>
                      {notaSalva ? 'Salvo' : 'Salvando...'}
                    </span>
                  </div>
                  <textarea
                    value={nota}
                    onChange={(e) => {
                      setNota(e.target.value)
                      setNotaSalva(false)
                    }}
                    rows={14}
                    placeholder="O que desta aula você leva para a sua operação?"
                    style={{
                      width: '100%',
                      background: 'var(--surface)',
                      border: '1px solid var(--line2)',
                      borderRadius: 'var(--r-card)',
                      padding: 18,
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: 'var(--tx)',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ================= coluna lateral ================= */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {unlocked && quizzes.length > 0 && (
            <QuizCard quizzes={quizzes} lessonId={outline.id} courseId={course?.id ?? null} />
          )}

          {labDaAula && (
            <section className="k-card" style={{ padding: 22 }}>
              <Kicker style={{ marginBottom: 16 }}>Próxima etapa</Kicker>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div
                  style={{
                    flex: 'none',
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--imperial)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon d={NAV_ICON.spark} size={17} stroke="var(--champagne)" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                    Lab: {labDaAula.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                    Laboratório prático
                    {labDaAula.minutes ? ` · ${labDaAula.minutes} min` : ''}
                  </div>
                </div>
                <Link to="/aplicar" style={{ marginLeft: 'auto', flex: 'none' }} aria-label="Abrir o lab">
                  <Icon d={NAV_ICON.arrowRight} size={18} stroke="var(--tx2)" />
                </Link>
              </div>
            </section>
          )}

          {next && (
            <section className="k-card" style={{ padding: 22 }}>
              <Kicker style={{ marginBottom: 16 }}>Próxima aula</Kicker>
              <Link to={`/aula/${next.id}`}>
                <div className="k-display" style={{ fontSize: 17, lineHeight: 1.3, marginBottom: 8, color: 'var(--tx)' }}>
                  {next.title}
                </div>
              </Link>
              <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>
                {formatDuration(next.duration_seconds)}
              </div>
              <Link
                to={`/aula/${next.id}`}
                style={{
                  background: 'var(--imperial)',
                  color: 'var(--bg)',
                  borderRadius: 'var(--r-control)',
                  padding: '11px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                }}
              >
                Continuar
                <Icon d={NAV_ICON.arrow} size={16} />
              </Link>
            </section>
          )}
        </aside>
      </div>

      {showUnlock && (
        <UnlockModal
          courseTitle={course?.title ?? outline.title}
          onClose={() => setShowUnlock(false)}
        />
      )}
    </div>
  )
}
