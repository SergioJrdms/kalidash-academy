import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked } from '../services/catalog'
import { supabase } from '../lib/supabase'
import { courseMeta, formatDuration, initials } from '../lib/format'
import {
  Avatar,
  ErrorState,
  GhostButton,
  Kicker,
  LockIcon,
  PageLoading,
  PrimaryButton,
  Tag,
  type TagKind,
} from '../components/ui'
import UnlockModal from '../components/UnlockModal'
import { useEffect } from 'react'
import type { LessonProgress } from '../types/db'
import { track } from '../lib/analytics'

export default function Conteudo() {
  const { slug } = useParams<{ slug: string }>()
  const { profile, isPaid, session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const navigate = useNavigate()
  const [showUnlock, setShowUnlock] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  const course = useMemo(() => courses.find((c) => c.slug === slug), [courses, slug])

  // "Qual conteúdo desperta interesse" — inclusive os que estão em breve
  // e os pagos que a pessoa abre sem ter acesso.
  useEffect(() => {
    if (!course) return
    track('course_viewed', {
      course_id: course.id,
      slug: course.slug,
      area: course.area,
      status: course.status,
      access_type: course.access_type,
      bloqueado: course.status !== 'coming_soon' && !course.hasFreeLesson && !isPaid,
    })
  }, [course?.id, isPaid])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId || !course) return
    let active = true
    supabase
      .from('lesson_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .then(({ data }) => {
        if (!active) return
        setCompleted(
          new Set(((data ?? []) as Pick<LessonProgress, 'lesson_id'>[]).map((r) => r.lesson_id)),
        )
      })
    return () => {
      active = false
    }
  }, [session?.user.id, course?.id])

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: '44px 56px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="k-page" style={{ padding: '44px 56px' }}>
        <ErrorState
          title="Conteúdo não encontrado"
          message="Esse conteúdo não está publicado ou o endereço mudou."
          onRetry={() => navigate('/conteudos')}
        />
      </div>
    )
  }

  const isSoon = course.status === 'coming_soon' || course.lessonCount === 0
  const owned = course.hasFreeLesson || isPaid
  const locked = !isSoon && !owned

  const tagKind: TagKind = isSoon
    ? 'soon'
    : course.access_type === 'free'
      ? 'free'
      : isPaid
        ? 'unlocked'
        : 'paid'

  const firstOpen = course.lessons.find((l) => isLessonUnlocked(l, isPaid))
  const hasStarted = course.completedCount > 0

  return (
    <div className="k-page" style={{ padding: '44px 56px 100px', maxWidth: 1080 }}>
      <Link
        to="/conteudos"
        style={{
          color: 'var(--tx3)',
          fontSize: 12,
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: 26,
        }}
      >
        ← Conteúdos
      </Link>

      <div style={{ display: 'flex', gap: 9, marginBottom: 18, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.1em',
            padding: '4px 11px',
            borderRadius: 999,
            background: 'var(--sf2)',
            border: '1px solid var(--line)',
            color: 'var(--tx2)',
          }}
        >
          {course.area}
        </span>
        <Tag kind={tagKind} style={{ fontSize: 10, padding: '4px 11px' }} />
      </div>

      <h1
        className="k-h1"
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1.12,
          letterSpacing: '-.03em',
          margin: '0 0 18px',
          maxWidth: 720,
        }}
      >
        {course.title}
      </h1>

      {course.description && (
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.62,
            color: 'var(--tx)',
            margin: '0 0 26px',
            maxWidth: 700,
            textWrap: 'pretty',
          }}
        >
          {course.description}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          flexWrap: 'wrap',
          marginBottom: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {course.instructor_avatar_url ? (
            <img
              src={course.instructor_avatar_url}
              alt=""
              width={34}
              height={34}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line2)' }}
            />
          ) : (
            <Avatar name={initials(course.instructor_name)} size={34} fontSize={11} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {course.instructor_name ?? 'Time Kalidash'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>Kalidash</div>
          </div>
        </div>
        <div className="k-hide-mobile" style={{ width: 1, height: 30, background: 'var(--line)' }} />
        <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
          {courseMeta(course.moduleCount, course.lessonCount, course.totalSeconds)}
        </div>
      </div>

      {/* ---------- Paywall ---------- */}
      {locked && (
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
                fontSize: 19,
                lineHeight: 1.3,
                marginBottom: 8,
              }}
            >
              Você está vendo a estrutura completa deste conteúdo.
            </div>
            <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: 0, maxWidth: 520 }}>
              Módulos, aulas, materiais e as aplicações estão todos visíveis. Assistir e baixar
              abre com o acesso.
            </p>
          </div>
          <PrimaryButton
            onClick={() => {
              track('unlock_clicked', {
                course_id: course.id,
                slug: course.slug,
                area: course.area,
                origem: 'pagina_do_curso',
              })
              setShowUnlock(true)
            }}
            style={{ whiteSpace: 'nowrap' }}
          >
            Desbloquear acesso
          </PrimaryButton>
        </div>
      )}

      {/* ---------- CTA de conteúdo aberto ---------- */}
      {!isSoon && owned && firstOpen && (
        <div style={{ marginBottom: 44 }}>
          <PrimaryButton onClick={() => navigate(`/aula/${firstOpen.id}`)} style={{ padding: '14px 32px' }}>
            {hasStarted ? 'Continuar' : 'Começar'}
          </PrimaryButton>
        </div>
      )}

      {/* ---------- Em breve ---------- */}
      {isSoon && (
        <div
          className="k-stack-mobile"
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 34,
            display: 'flex',
            alignItems: 'center',
            gap: 26,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'Raleway,sans-serif',
                fontWeight: 700,
                fontSize: 17,
                lineHeight: 1.3,
                marginBottom: 7,
              }}
            >
              Ainda não há aulas publicadas aqui.
            </div>
            <p style={{ color: 'var(--tx2)', fontSize: 13.5, margin: 0, maxWidth: 460 }}>
              Estamos montando esta trilha com o time da Kalidash. Enquanto isso, os conteúdos de
              Gestão já servem a qualquer área.
            </p>
          </div>
          <GhostButton onClick={() => navigate('/conteudos')} style={{ whiteSpace: 'nowrap' }}>
            Ver o que já está no ar
          </GhostButton>
        </div>
      )}

      {/* ---------- Módulos e aulas ---------- */}
      {!isSoon && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 34 }}>
          <Kicker style={{ marginBottom: 26 }}>O que você vai fazer</Kicker>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
            {course.modules.map((mod, mi) => {
              const lessons = course.lessons.filter((l) => l.module_id === mod.id)
              if (lessons.length === 0) return null

              const modSeconds = lessons.reduce((a, l) => a + (l.duration_seconds ?? 0), 0)

              return (
                <div key={mod.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 14,
                      marginBottom: 14,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Raleway,sans-serif',
                        fontWeight: 800,
                        fontSize: 13,
                        color: 'var(--p2)',
                        letterSpacing: '.06em',
                      }}
                    >
                      {String(mi + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Raleway,sans-serif',
                        fontWeight: 700,
                        fontSize: 18,
                        letterSpacing: '-.01em',
                      }}
                    >
                      {mod.title}
                    </span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                      {lessons.length === 1 ? '1 aula' : `${lessons.length} aulas`}
                      {modSeconds > 0 ? ` · ${formatDuration(modSeconds)}` : ''}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      paddingLeft: 2,
                    }}
                  >
                    {lessons.map((l) => {
                      const unlocked = isLessonUnlocked(l, isPaid)
                      const done = completed.has(l.id)
                      return (
                        <Link
                          key={l.id}
                          to={`/aula/${l.id}`}
                          className="k-row"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            borderRadius: 12,
                            padding: 12,
                            color: unlocked ? 'var(--tx)' : 'var(--tx2)',
                            textAlign: 'left',
                            transition: 'background .18s',
                          }}
                        >
                          <span
                            style={{
                              flex: 'none',
                              width: 17,
                              height: 17,
                              borderRadius: '50%',
                              border: `1px solid ${done ? 'var(--ok)' : unlocked ? 'var(--p2)' : 'var(--line2)'}`,
                              background: done ? 'var(--oksoft)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {done && (
                              <svg
                                width={9}
                                height={9}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--ok)"
                                strokeWidth={3.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 12.5l5 5L20 6.5" />
                              </svg>
                            )}
                          </span>
                          <span style={{ flex: 1, fontSize: 13.5, minWidth: 0 }}>{l.title}</span>
                          {!unlocked && <LockIcon />}
                          <span
                            style={{
                              flex: 'none',
                              fontSize: 11.5,
                              color: 'var(--tx3)',
                              width: 52,
                              textAlign: 'right',
                            }}
                          >
                            {formatDuration(l.duration_seconds)}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showUnlock && (
        <UnlockModal courseTitle={course.title} onClose={() => setShowUnlock(false)} />
      )}
    </div>
  )
}
