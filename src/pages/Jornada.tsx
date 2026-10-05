import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { isLessonUnlocked, type CatalogCourse } from '../services/catalog'
import {
  loadJourney,
  loadLabs,
  loadLessonProgress,
  loadNotes,
  loadSkills,
  loadWeeklyProgress,
  type JourneyView,
  type LabView,
  type LessonProgressRow,
  type NoteView,
  type SkillProgress,
  type WeekBar,
} from '../services/jornada'
import { NAV_ICON } from '../lib/icons'
import { formatTotalDuration } from '../lib/format'
import type { ActivityKind, LessonOutline } from '../types/db'
import { ErrorState, Icon, Kicker, LockIcon, PageLoading } from '../components/ui'

type Aba = 'etapas' | 'competencias' | 'anotacoes'

/** Ícone e rótulo de cada tipo de atividade, como no desenho. */
const TIPO: Record<ActivityKind, { label: string; icon: string }> = {
  video: { label: 'Vídeo', icon: 'M3 7h11v10H3zM16 10l5-3v10l-5-3z' },
  leitura: {
    label: 'Leitura',
    icon: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z',
  },
  aula: { label: 'Aula', icon: NAV_ICON.jornada },
  ferramenta: {
    label: 'Ferramenta',
    icon: 'M14.7 6.3a4 4 0 01-5 5L5 16v3h3l4.7-4.7a4 4 0 015-5l-2.3-2.3 2-2 2.3 2.3z',
  },
}

function tipoDaAula(l: LessonOutline): { label: string; icon: string } {
  return TIPO[l.activity_kind ?? (l.has_video ? 'aula' : 'leitura')]
}

function minutos(seg: number | null | undefined): string {
  return `${Math.max(1, Math.round((seg ?? 0) / 60))} min`
}

export default function Jornada() {
  const { session, isPaid } = useAuth()
  const { courses, loading, error, reload } = useCatalog()
  const userId = session?.user.id ?? null

  const [journey, setJourney] = useState<JourneyView | null>(null)
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [labs, setLabs] = useState<LabView[]>([])
  const [notas, setNotas] = useState<NoteView[]>([])
  const [progresso, setProgresso] = useState<Map<string, LessonProgressRow>>(new Map())
  const [semanas, setSemanas] = useState<WeekBar[]>([])
  const [aba, setAba] = useState<Aba>('etapas')
  const [aberta, setAberta] = useState<string | null>(null)
  const [extra, setExtra] = useState(true)

  const carregar = useCallback(async () => {
    if (!userId) return
    const [j, s, l, n, p, w] = await Promise.all([
      loadJourney(userId).catch(() => null),
      loadSkills(userId).catch(() => [] as SkillProgress[]),
      loadLabs(userId).catch(() => [] as LabView[]),
      loadNotes(userId).catch(() => [] as NoteView[]),
      loadLessonProgress(userId).catch(() => new Map<string, LessonProgressRow>()),
      loadWeeklyProgress(userId).catch(() => [] as WeekBar[]),
    ])
    setJourney(j)
    setSkills(s)
    setLabs(l)
    setNotas(n)
    setProgresso(p)
    setSemanas(w)
    setAberta(j?.steps.find((x) => x.current)?.id ?? null)
    setExtra(false)
  }, [userId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const porCurso = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])

  /** Cada etapa com o curso, as atividades e o seu próprio percentual. */
  const etapas = useMemo<EtapaView[]>(() => {
    if (!journey) return []
    return journey.steps.map((s) => {
      const curso = s.course_id ? (porCurso.get(s.course_id) ?? null) : null
      const atividades = curso?.lessons ?? []
      const feitas = atividades.filter((a) => progresso.get(a.id)?.completed_at).length
      return {
        ...s,
        curso,
        atividades,
        feitas,
        total: atividades.length,
        percent: atividades.length === 0 ? 0 : Math.round((feitas / atividades.length) * 100),
      }
    })
  }, [journey, porCurso, progresso])

  const resumo = useMemo(() => {
    const total = etapas.reduce((a, e) => a + e.total, 0)
    const feitas = etapas.reduce((a, e) => a + e.feitas, 0)

    const restanteSeg = etapas
      .flatMap((e) => e.atividades)
      .filter((a) => !progresso.get(a.id)?.completed_at)
      .reduce((a, l) => a + (l.duration_seconds ?? 0), 0)

    // Sem número editorial, o ritmo sai do que falta, a duas horas por
    // semana — e não de um palpite fixo.
    const semanasSugeridas =
      journey?.suggested_weeks ?? Math.max(1, Math.ceil(restanteSeg / (2 * 3600)))

    return {
      total,
      feitas,
      percent: total === 0 ? 0 : Math.round((feitas / total) * 100),
      restante: formatTotalDuration([restanteSeg]),
      semanasSugeridas,
    }
  }, [etapas, progresso, journey])

  /** A próxima atividade: o Lab da etapa atual, ou a próxima aula aberta. */
  const proxima = useMemo(() => {
    const atual = etapas.find((e) => e.current)
    if (!atual) return null

    const idsDaEtapa = new Set(atual.atividades.map((a) => a.id))
    const lab = labs.find(
      (l) => !l.submission?.completed_at && l.lesson_id && idsDaEtapa.has(l.lesson_id),
    )
    const aula = atual.atividades.find(
      (a) => !progresso.get(a.id)?.completed_at && isLessonUnlocked(a, isPaid),
    )
    if (!lab && !aula) return null
    return { etapa: atual, lab: lab ?? null, aula: aula ?? null }
  }, [etapas, labs, progresso, isPaid])

  const visaoGeral = useMemo(
    () => etapas.find((e) => e.current)?.curso ?? etapas.find((e) => e.curso)?.curso ?? null,
    [etapas],
  )

  if (loading || extra) return <PageLoading />
  if (error) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState message={error} onRetry={() => void reload()} />
      </div>
    )
  }

  return (
    <div className="k-page" style={{ padding: '40px 48px 90px', maxWidth: 1400 }}>
      <h1 className="k-display k-home-title" style={{ margin: '0 0 12px' }}>
        Minha Jornada
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16.5, margin: '0 0 30px' }}>
        Veja o que você já desenvolveu e qual é o seu próximo passo.
      </p>

      {!journey ? (
        <ErrorState
          title="Nenhuma jornada configurada"
          message="Assim que uma trilha for publicada, ela aparece aqui."
        />
      ) : (
        <div className="k-jornada-grid">
          {/* ================= coluna principal ================= */}
          <section className="k-card" style={{ padding: '28px 32px 8px', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <Kicker style={{ marginBottom: 12 }}>Sua trilha</Kicker>
                <h2 className="k-display" style={{ fontSize: 40, marginBottom: 14 }}>
                  {journey.title}
                </h2>
                {journey.subtitle && (
                  <p
                    style={{
                      fontSize: 15.5,
                      color: 'var(--tx2)',
                      lineHeight: 1.6,
                      margin: 0,
                      maxWidth: 520,
                    }}
                  >
                    {journey.subtitle}
                  </p>
                )}
              </div>

              {visaoGeral && (
                <Link
                  to={`/conteudos/${visaoGeral.slug}`}
                  className="k-hoverable"
                  style={{
                    flex: 'none',
                    border: '0.8px solid var(--line2)',
                    borderRadius: 'var(--r-control)',
                    padding: '13px 22px',
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: 'var(--tx)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  Ver visão geral da trilha
                  <Icon d={NAV_ICON.arrow} size={16} />
                </Link>
              )}
            </div>

            <div
              style={{ textAlign: 'right', fontSize: 14.5, fontWeight: 600, margin: '30px 0 9px' }}
            >
              {resumo.percent}% concluído
            </div>
            <Barra percent={resumo.percent} />

            <div style={{ display: 'flex', gap: 54, flexWrap: 'wrap', padding: '26px 0' }}>
              <Numero
                icone={NAV_ICON.note}
                valor={`${resumo.feitas} de ${resumo.total}`}
                rotulo="atividades concluídas"
              />
              <Numero
                icone={NAV_ICON.clock}
                valor={`${resumo.restante} restantes`}
                rotulo="de conteúdo"
              />
              <Numero
                icone={NAV_ICON.eventos}
                valor={`${resumo.semanasSugeridas} ${resumo.semanasSugeridas === 1 ? 'semana' : 'semanas'}`}
                rotulo="ritmo sugerido"
              />
            </div>

            {/* ---------- abas ---------- */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                borderTop: '1px solid var(--line)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              {(
                [
                  ['Etapas', 'etapas', NAV_ICON.menu],
                  [
                    'Competências',
                    'competencias',
                    'M12 3l8 3v6c0 4.6-3.3 7.9-8 9-4.7-1.1-8-4.4-8-9V6z',
                  ],
                  [
                    `Minhas anotações${notas.length ? ` (${notas.length})` : ''}`,
                    'anotacoes',
                    NAV_ICON.note,
                  ],
                ] as const
              ).map(([label, key, icone]) => {
                const on = aba === key
                return (
                  <button
                    key={key}
                    onClick={() => setAba(key as Aba)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${on ? 'var(--tx)' : 'transparent'}`,
                      color: on ? 'var(--tx)' : 'var(--tx2)',
                      padding: '14px 16px',
                      fontSize: 15,
                      fontWeight: on ? 600 : 400,
                      cursor: 'pointer',
                      marginBottom: -1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Icon d={icone} size={16} stroke={on ? 'var(--tx)' : 'var(--tx3)'} />
                    {label}
                  </button>
                )
              })}
            </div>

            {aba === 'etapas' && (
              <div>
                {etapas.map((e, i) => (
                  <EtapaLinha
                    key={e.id}
                    indice={i + 1}
                    ultima={i === etapas.length - 1}
                    etapa={e}
                    aberta={aberta === e.id}
                    onToggle={() => setAberta(aberta === e.id ? null : e.id)}
                    progresso={progresso}
                    isPaid={isPaid}
                  />
                ))}
              </div>
            )}

            {aba === 'competencias' && (
              <div style={{ padding: '26px 0 16px' }}>
                {skills.map((s) => (
                  <div key={s.id} style={{ marginBottom: 24 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 9 }}
                    >
                      {s.icon && <Icon d={s.icon} size={17} stroke="var(--tx2)" />}
                      <span style={{ fontSize: 15.5, fontWeight: 600, flex: 1 }}>{s.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.progress}%</span>
                    </div>
                    {s.description && (
                      <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 12px' }}>
                        {s.description}
                      </p>
                    )}
                    <Barra percent={s.progress} height={5} />
                  </div>
                ))}
              </div>
            )}

            {aba === 'anotacoes' && (
              <div style={{ padding: '26px 0 16px' }}>
                {notas.length === 0 ? (
                  <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.6, maxWidth: 520 }}>
                    Dentro de cada aula há uma aba "Minhas anotações". O que você escrever lá
                    aparece aqui.
                  </p>
                ) : (
                  notas.map((n) => (
                    <Link
                      key={n.lesson_id}
                      to={`/aula/${n.lesson_id}`}
                      style={{
                        display: 'block',
                        padding: '18px 0',
                        borderBottom: '1px solid var(--line)',
                        color: 'var(--tx)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--bronze)',
                          marginBottom: 7,
                        }}
                      >
                        {n.course_title}
                      </div>
                      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 7 }}>
                        {n.lesson_title}
                      </div>
                      <p
                        style={{
                          fontSize: 14.5,
                          color: 'var(--tx2)',
                          margin: 0,
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {n.content.length > 240 ? `${n.content.slice(0, 240)}…` : n.content}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </section>

          {/* ================= coluna lateral ================= */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {proxima && <ProximaAtividadeCard proxima={proxima} />}
            <CompetenciasCard skills={skills} />
            <ProgressoNoTempoCard semanas={semanas} total={resumo.total} />
          </aside>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------

type EtapaView = JourneyView['steps'][number] & {
  curso: CatalogCourse | null
  atividades: LessonOutline[]
  feitas: number
  total: number
  percent: number
}

function Numero({ icone, valor, rotulo }: { icone: string; valor: string; rotulo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <Icon d={icone} size={19} stroke="var(--tx3)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{valor}</div>
        <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginTop: 2 }}>{rotulo}</div>
      </div>
    </div>
  )
}

function Barra({ percent, height = 6 }: { percent: number; height?: number }) {
  return (
    <div style={{ height, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${percent}%`,
          background: 'var(--bronze)',
          borderRadius: 999,
          transition: 'width .3s',
        }}
      />
    </div>
  )
}

function EtapaLinha({
  indice,
  etapa,
  aberta,
  ultima,
  onToggle,
  progresso,
  isPaid,
}: {
  indice: number
  etapa: EtapaView
  aberta: boolean
  ultima?: boolean
  onToggle: () => void
  progresso: Map<string, LessonProgressRow>
  isPaid: boolean
}) {
  const concluida = etapa.total > 0 && etapa.feitas === etapa.total
  const naoIniciada = etapa.feitas === 0 && !etapa.current

  const emAndamento = etapa.atividades.find(
    (x) => !progresso.get(x.id)?.completed_at && isLessonUnlocked(x, isPaid),
  )

  return (
    <div style={{ borderBottom: ultima ? 'none' : '1px solid var(--line)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 21,
          background: 'transparent',
          border: 'none',
          padding: '20px 0',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            flex: 'none',
            width: 42,
            height: 42,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 15.5,
            fontWeight: 600,
            background: concluida ? 'var(--imperial)' : 'transparent',
            border: concluida
              ? 'none'
              : `1.5px solid ${etapa.current ? 'var(--bronze)' : 'var(--line2)'}`,
            color: concluida ? 'var(--bg)' : etapa.current ? 'var(--bronze)' : 'var(--tx3)',
          }}
        >
          {concluida ? <Icon d={NAV_ICON.check} size={18} width={2.4} /> : indice}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 17,
              fontWeight: 600,
              marginBottom: 6,
              color: naoIniciada ? 'var(--tx2)' : 'var(--tx)',
            }}
          >
            {indice}. {etapa.title}
          </span>
          {etapa.description && (
            <span style={{ display: 'block', fontSize: 15, color: 'var(--tx2)' }}>
              {etapa.description}
            </span>
          )}
        </span>

        <span
          style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, fontSize: 15 }}
        >
          {etapa.total === 0 || naoIniciada ? (
            <span style={{ color: 'var(--tx2)' }}>Não iniciada</span>
          ) : (
            <>
              {!concluida && (
                <span style={{ color: 'var(--tx2)' }}>
                  {etapa.feitas} de {etapa.total} atividades
                </span>
              )}
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: concluida ? 'var(--tx)' : 'var(--bronze)',
                }}
              >
                {etapa.percent}%
              </span>
            </>
          )}
          <Icon
            d={aberta ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}
            size={18}
            stroke="var(--tx3)"
            style={{ marginLeft: 8 }}
          />
        </span>
      </button>

      {aberta && etapa.atividades.length > 0 && (
        <div style={{ padding: '0 0 20px 63px' }}>
          {etapa.atividades.map((a) => (
            <AtividadeLinha
              key={a.id}
              aula={a}
              estado={
                progresso.get(a.id)?.completed_at
                  ? 'feita'
                  : isLessonUnlocked(a, isPaid)
                    ? 'aberta'
                    : 'bloqueada'
              }
              atual={a.id === emAndamento?.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AtividadeLinha({
  aula,
  estado,
  atual,
}: {
  aula: LessonOutline
  estado: 'feita' | 'aberta' | 'bloqueada'
  atual: boolean
}) {
  const t = tipoDaAula(aula)

  const conteudo = (
    <>
      <span
        style={{
          flex: 'none',
          width: 24,
          height: 24,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: estado === 'feita' ? 'var(--line)' : 'transparent',
          border:
            estado === 'feita' ? 'none' : `2px solid ${atual ? 'var(--bronze)' : 'var(--line2)'}`,
        }}
      >
        {estado === 'feita' && (
          <Icon d={NAV_ICON.check} size={13} width={2.6} stroke="var(--tx)" />
        )}
      </span>

      <Icon
        d={t.icon}
        size={17}
        stroke={estado === 'bloqueada' ? 'var(--tx3)' : 'var(--tx2)'}
        style={{ flex: 'none' }}
      />

      {/* titulo e tipo andam juntos; o vazio que sobra fica depois deles,
          para a acao encostar na direita */}
      <span
        style={{
          fontSize: 16,
          fontWeight: atual ? 600 : 400,
          color: estado === 'bloqueada' ? 'var(--tx2)' : 'var(--tx)',
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {aula.title}
      </span>

      <span
        style={{
          flex: 'none',
          fontSize: 15,
          color: 'var(--tx2)',
          whiteSpace: 'nowrap',
        }}
      >
        {t.label} · {minutos(aula.duration_seconds)}
      </span>

      <span style={{ flex: 1, minWidth: 8 }} />

      {estado === 'feita' && (
        <span
          style={{
            flex: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 15,
            color: 'var(--tx2)',
            whiteSpace: 'nowrap',
          }}
        >
          Ver novamente
          <Icon d={NAV_ICON.check} size={14} width={2.2} stroke="var(--tx3)" />
        </span>
      )}

      {atual && (
        <span
          style={{
            flex: 'none',
            background: 'var(--imperial)',
            color: 'var(--bg)',
            borderRadius: 'var(--r-control)',
            padding: '10px 22px',
            fontSize: 15,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            whiteSpace: 'nowrap',
          }}
        >
          Continuar
          <Icon d={NAV_ICON.arrow} size={15} />
        </span>
      )}

      {estado === 'bloqueada' && (
        <span style={{ flex: 'none', display: 'flex' }}>
          <LockIcon size={15} color="var(--tx3)" />
        </span>
      )}
    </>
  )

  const estilo: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    // 60px de passo entre as linhas: a atual encolhe o proprio padding
    // para o botao, mais alto, nao esticar a faixa.
    padding: atual ? '8px 16px' : '17px 16px',
    marginBottom: 1,
    borderRadius: 'var(--r-control)',
    background: atual ? 'var(--bg)' : 'transparent',
    color: 'var(--tx)',
  }

  if (estado === 'bloqueada') {
    return <div style={{ ...estilo, cursor: 'default' }}>{conteudo}</div>
  }

  return (
    <Link to={`/aula/${aula.id}`} className={atual ? undefined : 'k-row'} style={estilo}>
      {conteudo}
    </Link>
  )
}

// ---------------------------------------------------------------------
// Coluna lateral
// ---------------------------------------------------------------------

function ProximaAtividadeCard({
  proxima,
}: {
  proxima: { etapa: EtapaView; lab: LabView | null; aula: LessonOutline | null }
}) {
  const { etapa, lab, aula } = proxima

  const titulo = lab?.title ?? aula!.title
  const descricao = lab?.description ?? aula!.summary
  const duracao = lab?.minutes ? `${lab.minutes} min` : minutos(aula?.duration_seconds)
  const destino = lab ? '/aplicar' : `/aula/${aula!.id}`
  const imagem = lab?.image_url ?? aula?.thumbnail_url ?? etapa.curso?.thumbnail_url ?? null

  return (
    <section className="k-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          height: 150,
          background: imagem
            ? `center/cover no-repeat url(${JSON.stringify(imagem)})`
            : 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!imagem && (
          <Icon
            d={NAV_ICON.spark}
            size={44}
            stroke="var(--champagne)"
            width={1.1}
            style={{ opacity: 0.45 }}
          />
        )}
      </div>

      <div style={{ padding: 24 }}>
        <Kicker style={{ marginBottom: 16 }}>Próxima atividade</Kicker>

        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <span
            style={{
              flex: 'none',
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--imperial)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--champagne)',
              lineHeight: 1,
            }}
          >
            K
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--tx)',
            }}
          >
            {lab ? 'Kalidash Lab' : 'Próxima aula'}
          </span>
        </div>

        <h3 className="k-display" style={{ fontSize: 24, lineHeight: 1.22, marginBottom: 12 }}>
          {titulo}
        </h3>
        {descricao && (
          <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 18px' }}>
            {descricao}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
            fontSize: 13.5,
            color: 'var(--tx2)',
            marginBottom: 22,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon d={NAV_ICON.explorar} size={15} stroke="var(--tx3)" />
            {duracao}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon d={NAV_ICON.jornada} size={15} stroke="var(--tx3)" />
            Etapa {etapa.sort_order} · {etapa.title}
          </span>
        </div>

        <Link
          to={destino}
          style={{
            background: 'var(--imperial)',
            color: 'var(--bg)',
            borderRadius: 'var(--r-control)',
            padding: '15px 0',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          Continuar atividade
          <Icon d={NAV_ICON.arrow} size={16} />
        </Link>
      </div>
    </section>
  )
}

function CompetenciasCard({ skills }: { skills: SkillProgress[] }) {
  return (
    <section className="k-card" style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <Kicker>Suas competências</Kicker>
        <Link
          to="/perfil"
          style={{
            fontSize: 13,
            color: 'var(--bronze)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Ver todas
          <Icon d={NAV_ICON.arrow} size={14} stroke="var(--bronze)" />
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {skills.map((s) => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span
              style={{
                flex: 'none',
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.icon && <Icon d={s.icon} size={16} stroke="var(--tx2)" />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 7,
                }}
              >
                <span style={{ fontSize: 14.5 }}>{s.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.progress}%</span>
              </span>
              <Barra percent={s.progress} height={5} />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProgressoNoTempoCard({ semanas, total }: { semanas: WeekBar[]; total: number }) {
  if (semanas.length === 0) return null

  const pico = Math.max(1, ...semanas.map((s) => s.count))
  const feitasNoPeriodo = semanas.reduce((a, s) => a + s.count, 0)
  const ganho = total === 0 ? 0 : Math.round((feitasNoPeriodo / total) * 100)

  return (
    <section className="k-card" style={{ padding: 24 }}>
      <Kicker style={{ marginBottom: 22 }}>Seu progresso no tempo</Kicker>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${semanas.length}, 1fr)`,
          gap: 14,
          alignItems: 'end',
          height: 104,
          marginBottom: 10,
        }}
      >
        {semanas.map((s, i) => (
          <div
            key={s.label}
            title={`${s.count} ${s.count === 1 ? 'atividade' : 'atividades'}`}
            style={{
              // a semana mais recente sai cheia; as antigas esmaecem
              height: `${Math.max(14, (s.count / pico) * 100)}%`,
              borderRadius: 8,
              background: 'var(--bronze)',
              opacity: 0.28 + (i / Math.max(1, semanas.length - 1)) * 0.72,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${semanas.length}, 1fr)`,
          gap: 14,
          marginBottom: 20,
        }}
      >
        {semanas.map((s) => (
          <div key={s.label} style={{ fontSize: 12.5, color: 'var(--tx2)', textAlign: 'center' }}>
            {s.label}
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          background: 'var(--bg)',
          borderRadius: 'var(--r-control)',
          padding: '14px 16px',
        }}
      >
        <Icon d={NAV_ICON.jornada} size={17} stroke="var(--terracotta)" style={{ marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.45 }}>
            {feitasNoPeriodo === 0
              ? 'Nenhuma atividade nas últimas 4 semanas.'
              : `Você evoluiu ${ganho}% nas últimas 4 semanas.`}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--bronze)', marginTop: 4 }}>
            {feitasNoPeriodo === 0
              ? 'Retome por onde parou para voltar ao ritmo.'
              : 'Mantenha o ritmo para concluir sua jornada!'}
          </div>
        </div>
      </div>
    </section>
  )
}
