import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import {
  loadJourney,
  loadLabs,
  loadNotes,
  loadSkills,
  type JourneyView,
  type LabView,
  type NoteView,
  type SkillProgress,
} from '../services/jornada'
import { NAV_ICON } from '../lib/icons'
import { formatDuration } from '../lib/format'
import type { CatalogCourse } from '../services/catalog'
import {
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  ProgressBar,
} from '../components/ui'

type Aba = 'etapas' | 'competencias' | 'anotacoes'

export default function Jornada() {
  const { session } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const userId = session?.user.id ?? null

  const [journey, setJourney] = useState<JourneyView | null>(null)
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [labs, setLabs] = useState<LabView[]>([])
  const [notas, setNotas] = useState<NoteView[]>([])
  const [aba, setAba] = useState<Aba>('etapas')
  const [aberta, setAberta] = useState<string | null>(null)
  const [extra, setExtra] = useState(true)

  useEffect(() => {
    if (!userId) return
    let active = true
    setExtra(true)
    Promise.all([
      loadJourney(userId).catch(() => null),
      loadSkills(userId).catch(() => [] as SkillProgress[]),
      loadLabs(userId).catch(() => [] as LabView[]),
      loadNotes(userId).catch(() => [] as NoteView[]),
    ])
      .then(([j, s, l, n]) => {
        if (!active) return
        setJourney(j)
        setSkills(s)
        setLabs(l)
        setNotas(n)
        // abre a etapa em andamento
        const atual = j?.steps.find((x) => x.current)
        if (atual) setAberta(atual.id)
      })
      .finally(() => {
        if (active) setExtra(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  const porCurso = useMemo(() => {
    const m = new Map<string, CatalogCourse>()
    for (const c of courses) m.set(c.id, c)
    return m
  }, [courses])

  /** Números do cabeçalho: atividades = aulas da jornada. */
  const resumo = useMemo(() => {
    if (!journey) return null
    const cursos = journey.steps
      .map((s) => (s.course_id ? porCurso.get(s.course_id) : null))
      .filter(Boolean) as CatalogCourse[]

    const total = cursos.reduce((a, c) => a + c.lessonCount, 0)
    const feitas = cursos.reduce((a, c) => a + c.completedCount, 0)
    const segundosRestantes = cursos.reduce(
      (a, c) => a + Math.max(0, c.totalSeconds * (1 - c.progress / 100)),
      0,
    )
    return {
      total,
      feitas,
      percent: total === 0 ? 0 : Math.round((feitas / total) * 100),
      restante: formatDuration(segundosRestantes),
    }
  }, [journey, porCurso])

  const proximoLab = useMemo(
    () => labs.find((l) => !l.is_case && !l.submission?.completed_at) ?? null,
    [labs],
  )

  if (loading || extra) return <PageLoading />
  if (error) {
    return (
      <div className="k-page" style={{ padding: '48px 48px' }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1320 }}>
      <h1 className="k-display k-h1" style={{ marginBottom: 10 }}>
        Minha Jornada
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 36px' }}>
        Veja o que você já desenvolveu e qual é o seu próximo passo.
      </p>

      {!journey ? (
        <ErrorState
          title="Nenhuma jornada configurada"
          message="Assim que uma trilha for publicada, ela aparece aqui."
        />
      ) : (
        <>
          {/* ---------- hero da trilha ---------- */}
          <section
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-card)',
              padding: '30px 32px',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--champagne)',
                marginBottom: 12,
              }}
            >
              Sua trilha
            </div>
            <h2 className="k-display" style={{ fontSize: 32, color: 'var(--bg)', marginBottom: 10 }}>
              {journey.title}
            </h2>
            {journey.subtitle && (
              <p
                style={{
                  color: 'rgba(241,236,228,.78)',
                  fontSize: 15,
                  margin: '0 0 20px',
                  maxWidth: 620,
                  lineHeight: 1.6,
                }}
              >
                {journey.subtitle}
              </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, maxWidth: 560, marginBottom: 24 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(241,236,228,.18)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${resumo?.percent ?? 0}%`,
                    background: 'var(--champagne)',
                    borderRadius: 999,
                    transition: 'width .3s',
                  }}
                />
              </div>
              <span style={{ fontSize: 13.5, color: 'var(--champagne)', fontWeight: 600 }}>
                {resumo?.percent ?? 0}% concluído
              </span>
            </div>

            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {[
                { n: `${resumo?.feitas ?? 0} de ${resumo?.total ?? 0}`, l: 'atividades concluídas' },
                { n: resumo?.restante || '—', l: 'de conteúdo restante' },
                { n: `${journey.steps.length} etapas`, l: 'na trilha' },
              ].map((x) => (
                <div key={x.l}>
                  <div className="k-display" style={{ fontSize: 22, color: 'var(--bg)' }}>
                    {x.n}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(241,236,228,.6)', marginTop: 3 }}>
                    {x.l}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div
            className="k-grid-2"
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 20 }}
          >
            {/* ---------- coluna principal ---------- */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 22 }}>
                {(
                  [
                    ['Etapas', 'etapas'],
                    ['Competências', 'competencias'],
                    [`Minhas anotações${notas.length ? ` (${notas.length})` : ''}`, 'anotacoes'],
                  ] as const
                ).map(([label, key]) => (
                  <button
                    key={key}
                    onClick={() => setAba(key as Aba)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${aba === key ? 'var(--imperial)' : 'transparent'}`,
                      color: aba === key ? 'var(--tx)' : 'var(--tx2)',
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: aba === key ? 600 : 400,
                      cursor: 'pointer',
                      marginBottom: -1,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {aba === 'etapas' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {journey.steps.map((s, i) => {
                    const curso = s.course_id ? porCurso.get(s.course_id) : null
                    const aberto = aberta === s.id
                    const bloqueada = !s.done && !s.current

                    return (
                      <section key={s.id} className="k-card" style={{ overflow: 'hidden' }}>
                        <button
                          onClick={() => setAberta(aberto ? null : s.id)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            background: 'transparent',
                            border: 'none',
                            padding: '18px 20px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span
                            style={{
                              flex: 'none',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 600,
                              background: s.done ? 'var(--imperial)' : s.current ? 'var(--champagne)' : 'transparent',
                              border: bloqueada ? '1px solid var(--line2)' : 'none',
                              color: s.done ? 'var(--bg)' : s.current ? 'var(--imperial)' : 'var(--tx3)',
                            }}
                          >
                            {s.done ? <Icon d={NAV_ICON.check} size={15} width={2.4} /> : i + 1}
                          </span>

                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', fontSize: 15.5, fontWeight: 600, marginBottom: 3 }}>
                              {i + 1}. {s.title}
                            </span>
                            {curso?.short_description && (
                              <span style={{ display: 'block', fontSize: 13, color: 'var(--tx2)' }}>
                                {curso.short_description}
                              </span>
                            )}
                          </span>

                          <span style={{ flex: 'none', fontSize: 13, color: 'var(--tx2)' }}>
                            {s.done
                              ? '100%'
                              : curso
                                ? `${curso.completedCount} de ${curso.lessonCount} atividades`
                                : 'Não iniciada'}
                          </span>
                          <Icon
                            d={aberto ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
                            size={16}
                            stroke="var(--tx3)"
                          />
                        </button>

                        {aberto && curso && (
                          <div style={{ borderTop: '1px solid var(--line)', padding: '6px 20px 14px' }}>
                            {curso.progress > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0' }}>
                                <ProgressBar percent={curso.progress} height={4} />
                                <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>{curso.progress}%</span>
                              </div>
                            )}
                            {curso.lessons.map((l) => (
                              <Link
                                key={l.id}
                                to={`/aula/${l.id}`}
                                className="k-row"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '11px 10px',
                                  borderRadius: 8,
                                  color: 'var(--tx)',
                                }}
                              >
                                <Icon
                                  d={l.has_video ? NAV_ICON.play : NAV_ICON.book}
                                  size={14}
                                  stroke="var(--tx2)"
                                />
                                <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>{l.title}</span>
                                <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                                  {l.has_video ? 'Vídeo' : 'Leitura'}
                                  {l.duration_seconds ? ` · ${formatDuration(l.duration_seconds)}` : ''}
                                </span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}

              {aba === 'competencias' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {skills.map((s) => (
                    <section key={s.id} className="k-card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        {s.icon && <Icon d={s.icon} size={17} stroke="var(--tx2)" />}
                        <span style={{ fontSize: 15.5, fontWeight: 600, flex: 1 }}>{s.name}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--tx2)' }}>{s.progress}%</span>
                      </div>
                      {s.description && (
                        <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: '0 0 14px' }}>
                          {s.description}
                        </p>
                      )}
                      <ProgressBar percent={s.progress} height={5} />
                    </section>
                  ))}
                </div>
              )}

              {aba === 'anotacoes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notas.length === 0 ? (
                    <div
                      style={{
                        border: '1px dashed var(--line2)',
                        borderRadius: 'var(--r-card)',
                        padding: 40,
                        textAlign: 'center',
                      }}
                    >
                      <div className="k-display k-h3" style={{ marginBottom: 10 }}>
                        Nenhuma anotação ainda
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--tx2)' }}>
                        Dentro de cada aula há uma aba "Minhas anotações". O que você escrever lá
                        aparece aqui.
                      </div>
                    </div>
                  ) : (
                    notas.map((n) => (
                      <Link
                        key={n.lesson_id}
                        to={`/aula/${n.lesson_id}`}
                        className="k-card k-hoverable"
                        style={{ display: 'block', padding: 20, color: 'var(--tx)' }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--bronze)',
                            marginBottom: 8,
                          }}
                        >
                          {n.course_title}
                        </div>
                        <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 8 }}>
                          {n.lesson_title}
                        </div>
                        <p
                          style={{
                            fontSize: 14,
                            color: 'var(--tx2)',
                            margin: '0 0 10px',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {n.content.length > 260 ? `${n.content.slice(0, 260)}…` : n.content}
                        </p>
                        <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>
                          {new Date(n.updated_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ---------- coluna lateral ---------- */}
            <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              {proximoLab && (
                <section className="k-card" style={{ padding: 22 }}>
                  <Kicker style={{ marginBottom: 16 }}>Próxima atividade</Kicker>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--imperial)',
                      color: 'var(--bg)',
                      borderRadius: 999,
                      padding: '5px 12px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      marginBottom: 14,
                    }}
                  >
                    <Icon d={NAV_ICON.spark} size={13} stroke="var(--champagne)" />
                    Kalidash Lab
                  </div>
                  <h3 className="k-display" style={{ fontSize: 19, lineHeight: 1.25, marginBottom: 10 }}>
                    {proximoLab.title}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 16px', lineHeight: 1.55 }}>
                    {proximoLab.description}
                  </p>
                  <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginBottom: 18 }}>
                    {proximoLab.minutes ? `${proximoLab.minutes} min` : 'Laboratório prático'}
                  </div>
                  <Link
                    to="/aplicar"
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
                    Continuar atividade
                    <Icon d={NAV_ICON.arrow} size={16} />
                  </Link>
                </section>
              )}

              <section className="k-card" style={{ padding: 22 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                  }}
                >
                  <Kicker>Suas competências</Kicker>
                  <button
                    onClick={() => setAba('competencias')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--bronze)',
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Ver todas
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {skills.map((s) => (
                    <div key={s.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                        <span style={{ fontSize: 13.5, flex: 1 }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{s.progress}%</span>
                      </div>
                      <ProgressBar percent={s.progress} height={4} />
                    </div>
                  ))}
                </div>
              </section>

              {resumo && resumo.total > 0 && (
                <section className="k-card" style={{ padding: 22 }}>
                  <Kicker style={{ marginBottom: 16 }}>Seu progresso</Kicker>
                  <div className="k-display" style={{ fontSize: 40, marginBottom: 6 }}>
                    {resumo.percent}%
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--tx2)', margin: 0, lineHeight: 1.55 }}>
                    {resumo.feitas === 0
                      ? 'Você ainda não concluiu nenhuma atividade. Comece pela primeira etapa.'
                      : resumo.percent === 100
                        ? 'Trilha concluída. Veja seus certificados no Perfil.'
                        : `Você concluiu ${resumo.feitas} de ${resumo.total} atividades. Mantenha o ritmo.`}
                  </p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
