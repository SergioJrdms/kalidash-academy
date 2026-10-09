import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked } from '../services/catalog'
import { loadBookmarks, toggleBookmark } from '../services/jornada'
import { supabase } from '../lib/supabase'
import { formatTotalDuration } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import type { CourseModule, LessonOutline, LessonProgress, Skill } from '../types/db'
import { track } from '../lib/analytics'
import { ErrorState, Icon, LockIcon, PageLoading } from '../components/ui'
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
  const [aberto, setAberto] = useState<string | null>(null)

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
    if (!course) return
    // o primeiro módulo com conteúdo nasce aberto, como no desenho
    const primeiro = course.modules.find((m) =>
      course.lessons.some((l) => l.module_id === m.id),
    )
    setAberto(primeiro?.id ?? null)
  }, [course?.id, course])

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
        new Set(
          ((progRes.data ?? []) as Pick<LessonProgress, 'lesson_id'>[]).map((r) => r.lesson_id),
        ),
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
  const palavra = eTrilha ? 'trilha' : 'curso'

  const primeiraAberta = course.lessons.find((l) => isLessonUnlocked(l, isPaid))
  const comecou = course.completedCount > 0

  const nivel =
    course.level && course.level_max && course.level !== course.level_max
      ? `${course.level} a ${course.level_max}`
      : (course.level ?? course.level_max ?? null)

  const outcomes = Array.isArray(course.outcomes) ? (course.outcomes as string[]) : []
  const capa = course.hero_image_url ?? course.thumbnail_url

  const modulosComAula = course.modules.filter((m) =>
    course.lessons.some((l) => l.module_id === m.id),
  )

  async function onSalvar() {
    if (!userId || !course) return
    const vai = !salvo
    setSalvo(vai)
    await toggleBookmark(userId, course.id, vai).catch(() => setSalvo(!vai))
    track(vai ? 'course_bookmarked' : 'course_unbookmarked', { course_id: course.id })
  }

  return (
    <div className="k-page" style={{ padding: '28px 36px 90px', maxWidth: 1280 }}>
      <Link
        to="/explorar"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--tx2)',
          fontSize: 13,
          marginBottom: 22,
        }}
      >
        <Icon d="M15 6l-6 6 6 6" size={15} stroke="var(--tx2)" />
        Voltar para explorar
      </Link>

      <div className="k-trilha-grid">
        {/* ================= coluna principal ================= */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: 'var(--terracotta)',
              marginBottom: 12,
            }}
          >
            {course.area}
          </div>

          <h1 className="k-display" style={{ fontSize: 34, lineHeight: 1.15, margin: '0 0 14px' }}>
            {course.title}
          </h1>

          {course.description && (
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                color: 'var(--tx2)',
                margin: '0 0 24px',
              }}
            >
              {course.description}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
            {course.moduleCount > 0 && (
              <Chip icone={NAV_ICON.book}>
                {course.moduleCount} {course.moduleCount === 1 ? 'módulo' : 'módulos'}
              </Chip>
            )}
            {course.totalSeconds > 0 && (
              <Chip icone={NAV_ICON.clock}>
                {formatTotalDuration(course.lessons.map((l) => l.duration_seconds))}
              </Chip>
            )}
            {nivel && <Chip icone={NAV_ICON.level}>{nivel}</Chip>}
            {course.has_certificate && (
              <Chip icone={NAV_ICON.certificate}>Certificado de conclusão</Chip>
            )}
          </div>

          <div
            style={{
              height: 260,
              borderRadius: 'var(--r-card)',
              marginBottom: 28,
              background: capa
                ? `center/cover no-repeat url(${JSON.stringify(capa)})`
                : 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {!capa && (
              <Icon
                d={NAV_ICON.spark}
                size={54}
                stroke="var(--champagne)"
                width={1.1}
                style={{ opacity: 0.45 }}
              />
            )}
          </div>

          {outcomes.length > 0 && (
            <CartaoSuave titulo="O que você vai aprender">
              <div className="k-aprender-grid">
                {outcomes.map((o) => (
                  <div key={o} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                    <Icon
                      d={NAV_ICON.check}
                      size={16}
                      width={2.4}
                      stroke="var(--terracotta)"
                      style={{ flex: 'none', marginTop: 3 }}
                    />
                    <span style={{ fontSize: 13, lineHeight: 1.5 }}>{o}</span>
                  </div>
                ))}
              </div>
            </CartaoSuave>
          )}

          {course.audience && (
            <CartaoSuave titulo={`Para quem é ${eTrilha ? 'esta trilha' : 'este curso'}`}>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--tx2)', margin: 0 }}>
                {course.audience}
              </p>
            </CartaoSuave>
          )}

          {skills.length > 0 && (
            <CartaoSuave titulo="Skills desenvolvidas">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {skills.map((s) => (
                  <span
                    key={s.id}
                    style={{
                      background: 'rgba(40,24,59,.06)',
                      border: '0.8px solid rgba(40,24,59,.12)',
                      color: 'var(--imperial)',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </CartaoSuave>
          )}

          {/* ---------- conteúdo ---------- */}
          {emBreve ? (
            <CartaoSuave titulo={`Conteúdo ${eTrilha ? 'da trilha' : 'do curso'}`}>
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.65, margin: 0 }}>
                Ainda não há aulas publicadas aqui. Estamos montando {eTrilha ? 'esta' : 'este'}{' '}
                {palavra} com o time da Kalidash.
              </p>
            </CartaoSuave>
          ) : (
            <section
              style={{
                background: 'var(--card-soft)',
                border: '0.8px solid var(--line)',
                borderRadius: 'var(--r-card)',
                overflow: 'hidden',
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: 0,
                  padding: '24px 28px 16px',
                }}
              >
                Conteúdo {eTrilha ? 'da trilha' : 'do curso'}
              </h2>

              {modulosComAula.map((mod, i) => (
                <Modulo
                  key={mod.id}
                  indice={i + 1}
                  modulo={mod}
                  aulas={course.lessons.filter((l) => l.module_id === mod.id)}
                  aberto={aberto === mod.id}
                  onAlternar={() => setAberto(aberto === mod.id ? null : mod.id)}
                  completed={completed}
                  isPaid={isPaid}
                />
              ))}
            </section>
          )}
        </div>

        {/* ================= cartão fixo ================= */}
        <aside style={{ minWidth: 0 }}>
          <section
            style={{
              background: 'var(--card-soft)',
              border: '0.8px solid var(--line)',
              borderRadius: 'var(--r-card)',
              overflow: 'hidden',
              position: 'sticky',
              top: 24,
            }}
          >
            <div
              style={{
                height: 180,
                background: capa
                  ? `center/cover no-repeat url(${JSON.stringify(capa)})`
                  : 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!capa && (
                <Icon
                  d={NAV_ICON.spark}
                  size={36}
                  stroke="var(--champagne)"
                  width={1.1}
                  style={{ opacity: 0.45 }}
                />
              )}
            </div>

            <div style={{ padding: 24 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                    {course.access_type === 'free' ? 'Gratuito' : isPaid ? 'Liberado' : 'Premium'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>
                    {course.access_type === 'free'
                      ? 'Aberto a todos'
                      : isPaid
                        ? 'Incluso no seu acesso'
                        : 'Incluso no plano'}
                  </div>
                </div>
                {course.access_type === 'paid' && (
                  <span
                    style={{
                      flex: 'none',
                      background: 'rgba(168,138,88,.1)',
                      color: 'var(--bronze)',
                      borderRadius: 7,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    PREMIUM
                  </span>
                )}
              </div>

              {comecou && !emBreve && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--tx2)',
                      marginBottom: 7,
                    }}
                  >
                    <span>
                      {course.completedCount} de {course.lessonCount} aulas
                    </span>
                    <span>{course.progress}%</span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      borderRadius: 999,
                      background: 'var(--line)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${course.progress}%`,
                        background: 'var(--bronze)',
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              )}

              {emBreve ? (
                <Link to="/explorar" style={botaoPrincipal}>
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
                  style={botaoPrincipal}
                >
                  Desbloquear acesso
                </button>
              ) : primeiraAberta ? (
                <Link to={`/aula/${primeiraAberta.id}`} style={botaoPrincipal}>
                  {comecou ? 'Continuar' : `Começar ${palavra}`}
                </Link>
              ) : null}

              <button onClick={() => void onSalvar()} style={botaoSecundario}>
                <Icon
                  d={NAV_ICON.bookmark}
                  size={14}
                  stroke={salvo ? 'var(--terracotta)' : 'var(--imperial)'}
                />
                {salvo ? 'Salvo' : 'Salvar para depois'}
              </button>

              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '0.8px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <Ficha
                  rotulo={`${course.moduleCount} ${course.moduleCount === 1 ? 'módulo' : 'módulos'}`}
                  valor={`${course.lessonCount} ${course.lessonCount === 1 ? 'aula' : 'aulas'} no total`}
                />
                {course.totalSeconds > 0 && (
                  <Ficha
                    rotulo={formatTotalDuration(course.lessons.map((l) => l.duration_seconds))}
                    valor="de conteúdo"
                  />
                )}
                {course.has_certificate && <Ficha rotulo="Certificado" valor="ao concluir" />}
              </div>
            </div>
          </section>
        </aside>
      </div>

      {showUnlock && (
        <UnlockModal courseTitle={course.title} onClose={() => setShowUnlock(false)} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------

function Chip({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface)',
        border: '0.8px solid var(--line2)',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 13,
        color: 'var(--tx)',
      }}
    >
      <Icon d={icone} size={14} stroke="var(--tx2)" />
      {children}
    </span>
  )
}

function CartaoSuave({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--card-soft)',
        border: '0.8px solid var(--line)',
        borderRadius: 'var(--r-card)',
        padding: '24px 28px',
        marginBottom: 24,
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>{titulo}</h2>
      {children}
    </section>
  )
}

function Ficha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{rotulo}</span>
      <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{valor}</span>
    </div>
  )
}

/** Um módulo do acordeão: cabeçalho sempre visível, aulas ao abrir. */
function Modulo({
  indice,
  modulo,
  aulas,
  aberto,
  onAlternar,
  completed,
  isPaid,
}: {
  indice: number
  modulo: CourseModule
  aulas: LessonOutline[]
  aberto: boolean
  onAlternar: () => void
  completed: Set<string>
  isPaid: boolean
}) {
  const segundos = aulas.reduce((a, l) => a + (l.duration_seconds ?? 0), 0)
  const minutos = Math.round(segundos / 60)

  return (
    <div style={{ borderTop: '0.8px solid var(--line)' }}>
      <button
        onClick={onAlternar}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'transparent',
          border: 'none',
          padding: '16px 28px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 'none', fontSize: 11, color: 'var(--tx2)', width: 60 }}>
          Módulo {indice}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{modulo.title}</span>
        <span style={{ flex: 'none', fontSize: 12, color: 'var(--tx2)', whiteSpace: 'nowrap' }}>
          {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'}
          {minutos > 0 ? ` · ${minutos} min` : ''}
        </span>
        <Icon
          d={aberto ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
          size={16}
          stroke="var(--tx3)"
          style={{ flex: 'none' }}
        />
      </button>

      {aberto && (
        <div style={{ padding: '8px 28px 16px' }}>
          {aulas.map((l, i) => {
            const liberada = isLessonUnlocked(l, isPaid)
            const feita = completed.has(l.id)
            const min = Math.max(1, Math.round((l.duration_seconds ?? 0) / 60))

            const conteudo = (
              <>
                <span
                  style={{
                    flex: 'none',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: feita ? 'var(--imperial)' : 'var(--bg)',
                    color: feita ? 'var(--bg)' : 'var(--tx2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10.5,
                    fontWeight: 600,
                  }}
                >
                  {feita ? <Icon d={NAV_ICON.check} size={11} width={2.8} /> : i + 1}
                </span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    color: liberada ? 'var(--tx)' : 'var(--tx2)',
                  }}
                >
                  {l.title}
                </span>

                {!liberada && <LockIcon size={13} color="var(--tx3)" />}

                <span
                  style={{
                    flex: 'none',
                    fontSize: 12,
                    color: 'var(--tx2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ~{min} min
                </span>
              </>
            )

            const estilo: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '9px 0',
              color: 'var(--tx)',
            }

            if (!liberada) return <div key={l.id} style={estilo}>{conteudo}</div>

            return (
              <Link key={l.id} to={`/aula/${l.id}`} style={estilo}>
                {conteudo}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

const botaoPrincipal: React.CSSProperties = {
  width: '100%',
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 10,
  padding: '14px 0',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
}

const botaoSecundario: React.CSSProperties = {
  width: '100%',
  marginTop: 10,
  background: 'transparent',
  border: '0.8px solid var(--line2)',
  color: 'var(--imperial)',
  borderRadius: 10,
  padding: '12px 0',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  boxSizing: 'border-box',
}
