import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked } from '../services/catalog'
import { loadBookmarks, toggleBookmark } from '../services/jornada'
import { supabase } from '../lib/supabase'
import { formatDuration, formatTotalDuration, initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import type { LessonProgress, Skill } from '../types/db'
import { track } from '../lib/analytics'
import {
  Avatar,
  ErrorState,
  Icon,
  Kicker,
  LockIcon,
  PageLoading,
  ProgressBar,
  SkillChip,
  Tag,
  type TagKind,
} from '../components/ui'
import UnlockModal from '../components/UnlockModal'

export default function Conteudo() {
  const { slug } = useParams<{ slug: string }>()
  const { isPaid, session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const navigate = useNavigate()
  const userId = session?.user.id ?? null

  const [showUnlock, setShowUnlock] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [skills, setSkills] = useState<Skill[]>([])
  const [salvo, setSalvo] = useState(false)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id, isPaid])

  useEffect(() => {
    if (!userId || !course) return
    let active = true

    void Promise.all([
      supabase
        .from('lesson_progress')
        .select('lesson_id, completed_at')
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
      supabase.from('course_skills').select('skill_id').eq('course_id', course.id),
      supabase.from('skills').select('*'),
      loadBookmarks(userId).catch(() => new Set<string>()),
    ]).then(([progRes, mapRes, skillsRes, bm]) => {
      if (!active) return
      setCompleted(
        new Set(((progRes.data ?? []) as Pick<LessonProgress, 'lesson_id'>[]).map((r) => r.lesson_id)),
      )
      const todas = (skillsRes.data ?? []) as Skill[]
      const ids = new Set(((mapRes.data ?? []) as { skill_id: string }[]).map((r) => r.skill_id))
      setSkills(todas.filter((s) => ids.has(s.id)))
      setSalvo(bm.has(course.id))
    })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, course?.id])

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState
          title="Conteúdo não encontrado"
          message="Esse conteúdo não está publicado ou o endereço mudou."
          onRetry={() => navigate('/explorar')}
        />
      </div>
    )
  }

  const emBreve = course.status === 'coming_soon' || course.lessonCount === 0
  const temAcesso = course.hasFreeLesson || isPaid
  const bloqueado = !emBreve && !temAcesso
  const eTrilha = course.kind === 'trilha'

  const tagKind: TagKind = emBreve
    ? 'soon'
    : course.access_type === 'free'
      ? 'free'
      : isPaid
        ? 'unlocked'
        : 'paid'

  const primeiraAberta = course.lessons.find((l) => isLessonUnlocked(l, isPaid))
  const comecou = course.completedCount > 0

  const nivel =
    course.level && course.level_max && course.level !== course.level_max
      ? `${course.level} a ${course.level_max}`
      : (course.level ?? course.level_max ?? null)

  const outcomes = Array.isArray(course.outcomes) ? (course.outcomes as string[]) : []

  async function onSalvar() {
    if (!userId || !course) return
    const vai = !salvo
    setSalvo(vai)
    await toggleBookmark(userId, course.id, vai).catch(() => setSalvo(!vai))
    track(vai ? 'course_bookmarked' : 'course_unbookmarked', { course_id: course.id })
  }

  return (
    <div className="k-page" style={{ padding: '32px 48px 100px', maxWidth: 1280 }}>
      <Link
        to="/explorar"
        style={{
          color: 'var(--tx3)',
          fontSize: 12.5,
          display: 'inline-block',
          marginBottom: 26,
        }}
      >
        ← Explorar
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.8fr) minmax(0,1fr)', gap: 28 }}>
        {/* ---------- coluna principal ---------- */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            <Chip>{eTrilha ? 'Trilha' : 'Curso'}</Chip>
            <Chip>{course.area}</Chip>
            <Tag kind={tagKind} />
          </div>

          <h1
            className="k-display"
            style={{ fontSize: 44, lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 20px' }}
          >
            {course.title}
          </h1>

          {course.description && (
            <p
              style={{
                fontSize: 17,
                lineHeight: 1.62,
                color: 'var(--tx2)',
                margin: '0 0 28px',
                maxWidth: 680,
                textWrap: 'pretty',
              }}
            >
              {course.description}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              marginBottom: 30,
            }}
          >
            {[
              course.moduleCount > 0
                ? `${course.moduleCount} ${course.moduleCount === 1 ? 'módulo' : 'módulos'}`
                : null,
              course.totalSeconds > 0
                ? formatTotalDuration(course.lessons.map((l) => l.duration_seconds))
                : null,
              nivel,
              course.has_certificate ? 'Certificado de conclusão' : null,
            ]
              .filter(Boolean)
              .map((t) => (
                <Chip key={t as string}>{t as string}</Chip>
              ))}
          </div>

          {course.hero_image_url && (
            <img
              src={course.hero_image_url}
              alt=""
              style={{
                width: '100%',
                maxHeight: 340,
                objectFit: 'cover',
                borderRadius: 'var(--r-card)',
                display: 'block',
                marginBottom: 36,
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              paddingBottom: 30,
              marginBottom: 30,
              borderBottom: '1px solid var(--line)',
            }}
          >
            {course.instructor_avatar_url ? (
              <img
                src={course.instructor_avatar_url}
                alt=""
                width={40}
                height={40}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <Avatar name={initials(course.instructor_name)} size={40} />
            )}
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                {course.instructor_name ?? 'Time Kalidash'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>Kalidash Academy</div>
            </div>
          </div>

          {/* ---------- o que você vai aprender ---------- */}
          {outcomes.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <Kicker style={{ marginBottom: 18 }}>O que você vai aprender</Kicker>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 13,
                }}
              >
                {outcomes.map((o) => (
                  <li key={o} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                    <Icon
                      d={NAV_ICON.check}
                      size={15}
                      width={2.4}
                      stroke="var(--terracotta)"
                      style={{ flex: 'none', marginTop: 4 }}
                    />
                    <span style={{ fontSize: 14.5, lineHeight: 1.55 }}>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {skills.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <Kicker style={{ marginBottom: 14 }}>Competências desenvolvidas</Kicker>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {skills.map((s) => (
                  <SkillChip key={s.id}>{s.name}</SkillChip>
                ))}
              </div>
            </section>
          )}

          {/* ---------- conteúdo ---------- */}
          {emBreve ? (
            <section
              style={{
                border: '1px dashed var(--line2)',
                borderRadius: 'var(--r-card)',
                padding: 32,
              }}
            >
              <h2 className="k-display" style={{ fontSize: 20, marginBottom: 10 }}>
                Ainda não há aulas publicadas aqui.
              </h2>
              <p style={{ color: 'var(--tx2)', fontSize: 14.5, margin: 0, maxWidth: 480, lineHeight: 1.6 }}>
                Estamos montando {eTrilha ? 'esta trilha' : 'este curso'} com o time da Kalidash.
                Enquanto isso, o que já está no ar serve a qualquer área.
              </p>
            </section>
          ) : (
            <section>
              <Kicker style={{ marginBottom: 22 }}>
                {eTrilha ? 'As etapas da trilha' : 'O conteúdo do curso'}
              </Kicker>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {course.modules.map((mod, mi) => {
                  const aulas = course.lessons.filter((l) => l.module_id === mod.id)
                  if (aulas.length === 0) return null
                  const segundos = aulas.reduce((a, l) => a + (l.duration_seconds ?? 0), 0)

                  return (
                    <div key={mod.id}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 14,
                          marginBottom: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          className="k-display"
                          style={{ fontSize: 14, color: 'var(--bronze)', letterSpacing: '0.05em' }}
                        >
                          {String(mi + 1).padStart(2, '0')}
                        </span>
                        <span className="k-display" style={{ fontSize: 19 }}>
                          {mod.title}
                        </span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                          {aulas.length === 1 ? '1 aula' : `${aulas.length} aulas`}
                          {segundos > 0 ? ` · ${formatDuration(segundos)}` : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {aulas.map((l) => {
                          const aberta = isLessonUnlocked(l, isPaid)
                          const feita = completed.has(l.id)
                          return (
                            <Link
                              key={l.id}
                              to={`/aula/${l.id}`}
                              className="k-row"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 13,
                                borderRadius: 10,
                                padding: '12px 11px',
                                color: aberta ? 'var(--tx)' : 'var(--tx2)',
                              }}
                            >
                              <span
                                style={{
                                  flex: 'none',
                                  width: 19,
                                  height: 19,
                                  borderRadius: '50%',
                                  border: feita ? 'none' : `1px solid var(--line2)`,
                                  background: feita ? 'var(--imperial)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {feita && (
                                  <Icon d={NAV_ICON.check} size={11} width={3} stroke="var(--bg)" />
                                )}
                              </span>
                              <Icon
                                d={l.has_video ? NAV_ICON.play : NAV_ICON.book}
                                size={14}
                                stroke="var(--tx3)"
                                style={{ flex: 'none' }}
                              />
                              <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{l.title}</span>
                              {!aberta && <LockIcon />}
                              <span
                                style={{
                                  flex: 'none',
                                  fontSize: 12.5,
                                  color: 'var(--tx3)',
                                  width: 54,
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
            </section>
          )}
        </div>

        {/* ---------- cartão fixo ---------- */}
        <aside style={{ minWidth: 0 }}>
          <section className="k-card" style={{ padding: 24, position: 'sticky', top: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <span className="k-display" style={{ fontSize: 26 }}>
                {course.access_type === 'free' ? 'Gratuito' : isPaid ? 'Liberado' : 'Premium'}
              </span>
              {course.access_type === 'paid' && !isPaid && <Tag kind="paid" />}
            </div>

            {comecou && !emBreve && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                    fontSize: 12.5,
                    color: 'var(--tx2)',
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {course.completedCount} de {course.lessonCount} aulas
                  </span>
                  <span>{course.progress}%</span>
                </div>
                <ProgressBar percent={course.progress} height={5} />
              </div>
            )}

            {emBreve ? (
              <Link to="/explorar" style={botaoPrimario}>
                Ver o que já está no ar
              </Link>
            ) : bloqueado ? (
              <button
                onClick={() => {
                  track('unlock_clicked', {
                    course_id: course.id,
                    slug: course.slug,
                    area: course.area,
                    origem: 'pagina_do_curso',
                  })
                  setShowUnlock(true)
                }}
                style={botaoPrimario}
              >
                Desbloquear acesso
              </button>
            ) : primeiraAberta ? (
              <Link to={`/aula/${primeiraAberta.id}`} style={botaoPrimario}>
                {comecou ? 'Continuar' : eTrilha ? 'Começar trilha' : 'Começar curso'}
                <Icon d={NAV_ICON.arrow} size={16} />
              </Link>
            ) : null}

            <button
              onClick={() => void onSalvar()}
              style={{
                width: '100%',
                marginTop: 10,
                background: 'transparent',
                border: '0.8px solid var(--line2)',
                color: 'var(--tx)',
                borderRadius: 'var(--r-control)',
                padding: '12px 0',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
              }}
            >
              <Icon
                d={NAV_ICON.bookmark}
                size={15}
                stroke={salvo ? 'var(--terracotta)' : 'var(--tx2)'}
              />
              {salvo ? 'Salvo' : 'Salvar para depois'}
            </button>

            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
              }}
            >
              {[
                course.moduleCount > 0
                  ? `${course.moduleCount} ${course.moduleCount === 1 ? 'módulo' : 'módulos'} / ${course.lessonCount} ${course.lessonCount === 1 ? 'aula' : 'aulas'} no total`
                  : null,
                course.totalSeconds > 0
                  ? `${formatTotalDuration(course.lessons.map((l) => l.duration_seconds))} de conteúdo`
                  : null,
                course.has_certificate ? 'Certificado ao concluir' : null,
                'Acesso pelo navegador, no seu ritmo',
              ]
                .filter(Boolean)
                .map((t) => (
                  <div key={t as string} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Icon
                      d={NAV_ICON.check}
                      size={14}
                      width={2.2}
                      stroke="var(--bronze)"
                      style={{ flex: 'none', marginTop: 3 }}
                    />
                    <span style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.5 }}>
                      {t as string}
                    </span>
                  </div>
                ))}
            </div>

            {bloqueado && (
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--tx3)',
                  lineHeight: 1.55,
                  margin: '18px 0 0',
                }}
              >
                A estrutura completa fica visível: módulos, aulas e materiais. Assistir e baixar
                abre com o acesso.
              </p>
            )}
          </section>
        </aside>
      </div>

      {showUnlock && (
        <UnlockModal courseTitle={course.title} onClose={() => setShowUnlock(false)} />
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'var(--surface)',
        border: '0.8px solid var(--line)',
        color: 'var(--tx2)',
        borderRadius: 999,
        padding: '6px 13px',
        fontSize: 12.5,
      }}
    >
      {children}
    </span>
  )
}

const botaoPrimario: React.CSSProperties = {
  width: '100%',
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 'var(--r-control)',
  padding: '13px 0',
  fontSize: 14.5,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  boxSizing: 'border-box',
}
