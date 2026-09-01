import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import {
  isLessonUnlocked,
  loadContinue,
  recommendedFor,
  type CatalogCourse,
  type ContinueCard,
} from '../services/catalog'
import { supabase } from '../lib/supabase'
import { areaIcon, NAV_ICON } from '../lib/icons'
import { courseMeta, eventDay, eventTime, firstName, formatDuration, greeting } from '../lib/format'
import type { AcademyEvent } from '../types/db'
import {
  CourseThumb,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  ProgressBar,
  Tag,
  tagFor,
  type TagKind,
} from '../components/ui'
import PersonalizationModal from '../components/PersonalizationModal'

function courseTagKind(course: CatalogCourse, isPaid: boolean): TagKind {
  if (course.status === 'coming_soon') return 'soon'
  if (course.access_type === 'free') return 'free'
  return isPaid ? 'unlocked' : 'paid'
}

export default function Home() {
  const { profile, isPaid, refreshProfile, session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const navigate = useNavigate()

  const [cont, setCont] = useState<ContinueCard | null>(null)
  const [contLoading, setContLoading] = useState(true)
  const [nextEvent, setNextEvent] = useState<AcademyEvent | null>(null)
  const [showPers, setShowPers] = useState(false)

  const userId = session?.user.id ?? null

  useEffect(() => {
    if (loading || !userId) return
    let active = true
    setContLoading(true)
    loadContinue(userId, courses, isPaid)
      .then((c) => {
        if (active) setCont(c)
      })
      .catch(() => {
        if (active) setCont(null)
      })
      .finally(() => {
        if (active) setContLoading(false)
      })
    return () => {
      active = false
    }
  }, [loading, courses, isPaid, userId])

  useEffect(() => {
    let active = true
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setNextEvent((data as AcademyEvent) ?? null)
      })
    return () => {
      active = false
    }
  }, [])

  /** O conteúdo de entrada: primeira aula gratuita publicada da vitrine. */
  const startHere = useMemo(() => {
    for (const course of courses) {
      if (course.status !== 'published') continue
      const lesson = course.lessons.find((l) => l.effective_access === 'free')
      if (lesson) return { course, lesson }
    }
    return null
  }, [courses])

  const hasProgress = cont !== null
  const recommended = useMemo(
    () =>
      recommendedFor(
        courses,
        profile?.area ?? null,
        [cont?.course.id, startHere && !hasProgress ? startHere.course.id : undefined].filter(
          Boolean,
        ) as string[],
        2,
      ),
    [courses, profile?.area, cont, startHere, hasProgress],
  )

  if (loading || contLoading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: '64px 56px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  const name = firstName(profile?.full_name)
  const isPersonalized = Boolean(profile?.area)

  const hi = hasProgress
    ? `${greeting()}${name ? `, ${name}` : ''}.`
    : 'Bem-vindo ao Kalidash Academy.'

  const sub = hasProgress
    ? isPersonalized
      ? `Sua home está organizada em torno de ${profile?.area}. Retome de onde parou.`
      : 'Retome de onde parou. Em seguida vale deixar o Academy mais relevante para você.'
    : 'Conhecimento para trabalhar de forma mais inteligente. Comece pelo conteúdo abaixo: uma aula curta e uma aplicação na sua operação.'

  const nextStep = isPersonalized
    ? 'leve o processo que você mapeou para a próxima reunião com o time e meça quanto tempo ele consome hoje.'
    : 'termine a aula atual e conte em que área você trabalha — a home passa a mostrar o que serve para você.'

  return (
    <div className="k-page" style={{ padding: '64px 56px 100px', maxWidth: 1080 }}>
      <div style={{ marginBottom: 52 }}>
        <h1
          className="k-h1"
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 34,
            lineHeight: 1.16,
            letterSpacing: '-.03em',
            margin: '0 0 10px',
          }}
        >
          {hi}
        </h1>
        <p
          style={{
            color: 'var(--tx2)',
            margin: 0,
            fontSize: 15.5,
            maxWidth: 520,
            textWrap: 'pretty',
          }}
        >
          {sub}
        </p>
      </div>

      {/* ---------- Continue de onde parou ---------- */}
      {cont && (
        <div style={{ marginBottom: 56 }}>
          <Kicker style={{ marginBottom: 18 }}>Continue de onde parou</Kicker>
          <Link
            to={`/aula/${cont.lesson.id}`}
            className="k-lift k-stack-mobile"
            style={{
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              gap: 26,
              alignItems: 'center',
              background: 'var(--sf)',
              border: '1px solid var(--pline)',
              borderRadius: 22,
              padding: '26px 28px',
              color: 'var(--tx)',
              transition: 'all .2s',
            }}
          >
            <div
              className="k-thumb-mobile"
              style={{
                flex: 'none',
                width: 132,
                height: 88,
                borderRadius: 14,
                background: 'linear-gradient(145deg,var(--psoft),var(--bg2))',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(var(--line2) 1px,transparent 1px)',
                  backgroundSize: '15px 15px',
                  opacity: 0.5,
                }}
              />
              <Icon d={NAV_ICON.play} size={17} fill="var(--p2)" style={{ position: 'relative' }} />
            </div>

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
                {cont.course.title}
              </div>
              <div
                style={{
                  fontFamily: 'Raleway,sans-serif',
                  fontWeight: 700,
                  fontSize: 21,
                  lineHeight: 1.26,
                  marginBottom: 12,
                }}
              >
                {cont.lesson.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, maxWidth: 340 }}>
                <ProgressBar percent={cont.percent} />
                <span style={{ flex: 'none', fontSize: 12, color: 'var(--tx3)' }}>
                  Aula {cont.position.index} de {cont.position.total}
                </span>
              </div>
            </div>

            <div
              style={{
                flex: 'none',
                background: 'linear-gradient(180deg,#8a5cff,var(--p))',
                color: '#fff',
                borderRadius: 999,
                padding: '13px 28px',
                fontSize: 13.5,
                fontWeight: 600,
                boxShadow: 'var(--glow)',
                textAlign: 'center',
              }}
            >
              Continuar
            </div>
          </Link>

          <div
            style={{
              marginTop: 20,
              paddingLeft: 2,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Icon
              d={NAV_ICON.arrow}
              size={15}
              stroke="var(--p2)"
              width={2}
              style={{ marginTop: 3 }}
            />
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--tx2)',
                lineHeight: 1.55,
                maxWidth: 560,
              }}
            >
              <strong style={{ color: 'var(--tx)', fontWeight: 600 }}>Seu próximo passo:</strong>{' '}
              {nextStep}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Comece aqui ---------- */}
      {!hasProgress && startHere && (
        <div style={{ marginBottom: 56 }}>
          <Kicker color="var(--p2)" style={{ marginBottom: 18 }}>
            Comece aqui
          </Kicker>
          <Link
            to={`/aula/${startHere.lesson.id}`}
            className="k-lift k-stack-mobile"
            style={{
              width: '100%',
              textAlign: 'left',
              background: 'linear-gradient(135deg,#1F1330,#150E20 68%)',
              border: '1px solid var(--pline)',
              borderRadius: 24,
              padding: 0,
              overflow: 'hidden',
              color: '#F5F2F9',
              transition: 'all .22s',
              display: 'flex',
            }}
          >
            <div
              className="k-hide-mobile"
              style={{
                flex: '0 0 40%',
                position: 'relative',
                minHeight: 230,
                borderRight: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: 24,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'radial-gradient(rgba(255,255,255,.09) 1px,transparent 1px)',
                  backgroundSize: '20px 20px',
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: -60,
                  top: -60,
                  width: 210,
                  height: 210,
                  border: '1px solid var(--pline)',
                  borderRadius: '50%',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 24,
                  top: 22,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(115,67,251,.4)',
                  border: '1px solid rgba(255,255,255,.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon d={NAV_ICON.play} size={16} fill="#fff" />
              </div>
              <div
                style={{
                  position: 'relative',
                  fontFamily: 'Raleway,sans-serif',
                  fontWeight: 800,
                  fontSize: 13,
                  letterSpacing: '.14em',
                  color: 'rgba(255,255,255,.42)',
                }}
              >
                {`${startHere.course.area} · ${formatDuration(startHere.lesson.duration_seconds)}`.toUpperCase()}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: '30px 32px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.09em',
                    padding: '4px 11px',
                    borderRadius: 999,
                    background: 'rgba(58,211,164,.14)',
                    color: '#3AD3A4',
                    border: '1px solid rgba(255,255,255,.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  GRATUITO
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '.09em',
                    padding: '4px 11px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,.06)',
                    color: 'rgba(255,255,255,.62)',
                    border: '1px solid rgba(255,255,255,.1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  AULA ABERTA
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'Raleway,sans-serif',
                  fontWeight: 700,
                  fontSize: 25,
                  lineHeight: 1.22,
                  letterSpacing: '-.02em',
                  marginBottom: 12,
                  maxWidth: 420,
                  color: '#F5F2F9',
                }}
              >
                {startHere.lesson.title}
              </div>
              <p
                style={{
                  color: 'rgba(255,255,255,.62)',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  margin: '0 0 20px',
                  maxWidth: 430,
                }}
              >
                {startHere.lesson.summary ?? startHere.course.short_description ?? ''}
              </p>
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div
                  style={{
                    background: 'linear-gradient(180deg,#8a5cff,var(--p))',
                    color: '#fff',
                    borderRadius: 999,
                    padding: '13px 30px',
                    fontSize: 13.5,
                    fontWeight: 600,
                    boxShadow: 'var(--glow)',
                  }}
                >
                  Começar
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,.07)',
                      border: '1px solid rgba(255,255,255,.16)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Raleway,sans-serif',
                      fontWeight: 700,
                      fontSize: 9.5,
                      color: '#B061FF',
                    }}
                  >
                    KD
                  </div>
                  <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.5)' }}>
                    {startHere.course.instructor_name ?? 'Time Kalidash'}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {!hasProgress && !startHere && courses.length === 0 && (
        <div style={{ marginBottom: 56 }}>
          <ErrorState
            title="Ainda não há conteúdo publicado"
            message="Assim que o primeiro conteúdo for publicado, ele aparece aqui."
          />
        </div>
      )}

      {/* ---------- Recomendados ---------- */}
      {recommended.length > 0 && (
        <div style={{ marginBottom: 56 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <Kicker>
              {hasProgress && isPersonalized ? 'Recomendados para você' : 'Também no Academy'}
            </Kicker>
            <Link
              to="/conteudos"
              style={{ color: 'var(--p2)', fontSize: 12.5, fontWeight: 600 }}
            >
              Ver conteúdos
            </Link>
          </div>

          {hasProgress ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recommended.map((c) => {
                const kind = courseTagKind(c, isPaid)
                const t = tagFor(kind)
                return (
                  <Link
                    key={c.id}
                    to={`/conteudos/${c.slug}`}
                    className="k-row"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      borderRadius: 14,
                      padding: 14,
                      color: 'var(--tx)',
                      transition: 'background .18s',
                    }}
                  >
                    <Icon
                      d={areaIcon(c.area)}
                      size={16}
                      stroke="var(--p2)"
                      width={1.5}
                      style={{ opacity: 0.75 }}
                    />
                    <span
                      style={{ flex: 1, fontSize: 14, fontWeight: 500, minWidth: 0 }}
                    >
                      {c.title}
                    </span>
                    <span
                      className="k-hide-mobile"
                      style={{ flex: 'none', fontSize: 11.5, color: 'var(--tx3)' }}
                    >
                      {courseMeta(c.moduleCount, c.lessonCount, c.totalSeconds)}
                    </span>
                    <span
                      style={{
                        flex: 'none',
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '.08em',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: t.bg,
                        color: t.fg,
                        border: '1px solid var(--line)',
                      }}
                    >
                      {t.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              className="k-grid-2"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}
            >
              {recommended.map((c) => (
                <Link
                  key={c.id}
                  to={`/conteudos/${c.slug}`}
                  className="k-hoverable k-lift"
                  style={{
                    textAlign: 'left',
                    background: 'var(--sf)',
                    border: '1px solid var(--line)',
                    borderRadius: 20,
                    overflow: 'hidden',
                    color: 'var(--tx)',
                    display: 'block',
                  }}
                >
                  <CourseThumb
                    iconPath={areaIcon(c.area)}
                    imageUrl={c.thumbnail_url}
                    height={104}
                    radius={0}
                    label={c.area}
                    locked={c.status !== 'coming_soon' && !c.hasFreeLesson && !isPaid}
                  />
                  <div style={{ padding: '20px 22px 22px' }}>
                    <div style={{ display: 'flex', gap: 7, marginBottom: 11 }}>
                      <Tag kind={courseTagKind(c, isPaid)} />
                    </div>
                    <div
                      style={{
                        fontFamily: 'Raleway,sans-serif',
                        fontWeight: 700,
                        fontSize: 16,
                        lineHeight: 1.3,
                        marginBottom: 10,
                      }}
                    >
                      {c.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
                      {courseMeta(c.moduleCount, c.lessonCount, c.totalSeconds)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Próximo encontro ao vivo ---------- */}
      {nextEvent && (
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
          <div
            style={{
              flex: 'none',
              width: 62,
              textAlign: 'center',
              border: '1px solid var(--line)',
              background: 'var(--sf)',
              borderRadius: 14,
              padding: '11px 0',
            }}
          >
            <div
              style={{
                fontFamily: 'Raleway,sans-serif',
                fontWeight: 800,
                fontSize: 19,
                lineHeight: 1,
              }}
            >
              {eventDay(nextEvent.starts_at).dd}
            </div>
            <div
              style={{
                fontSize: 9.5,
                letterSpacing: '.13em',
                fontWeight: 700,
                color: 'var(--tx3)',
                marginTop: 2,
              }}
            >
              {eventDay(nextEvent.starts_at).mm}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Kicker style={{ marginBottom: 7, fontSize: 10.5, letterSpacing: '.16em' }}>
              Próximo encontro ao vivo
            </Kicker>
            <div
              style={{
                fontFamily: 'Raleway,sans-serif',
                fontWeight: 700,
                fontSize: 16,
                lineHeight: 1.32,
                marginBottom: 5,
              }}
            >
              {nextEvent.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
              {eventTime(nextEvent.starts_at)} · {nextEvent.instructor_name ?? 'Time Kalidash'} ·{' '}
              {nextEvent.access_type === 'free' ? 'gratuito' : 'pago'}
            </div>
          </div>
          <button
            onClick={() => navigate('/eventos')}
            className="k-hoverable"
            style={{
              flex: 'none',
              background: 'transparent',
              border: '1px solid var(--line2)',
              color: 'var(--tx)',
              borderRadius: 999,
              padding: '11px 24px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ver eventos
          </button>
        </div>
      )}

      {showPers && (
        <PersonalizationModal
          onClose={() => setShowPers(false)}
          onSaved={() => void refreshProfile()}
        />
      )}
    </div>
  )
}
