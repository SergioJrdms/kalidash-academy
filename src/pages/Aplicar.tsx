import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  loadLabs,
  loadSkills,
  saveLabSubmission,
  type LabView,
  type SkillProgress,
} from '../services/jornada'
import { track } from '../lib/analytics'
import { NAV_ICON } from '../lib/icons'
import {
  ErrorState,
  Icon,
  Kicker,
  Modal,
  PageLoading,
  ProgressBar,
  SkillChip,
  Spinner,
} from '../components/ui'

type Aba = 'labs' | 'cases'

const NIVEIS = ['Todos os níveis', 'Iniciante', 'Intermediário', 'Avançado']
const ORDENS = ['Mais recentes', 'Menor duração', 'Maior duração'] as const

export default function Aplicar() {
  const { session } = useAuth()
  const userId = session?.user.id ?? null

  const [labs, setLabs] = useState<LabView[]>([])
  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [aba, setAba] = useState<Aba>('labs')
  const [nivel, setNivel] = useState(NIVEIS[0])
  const [skillId, setSkillId] = useState('')
  const [ordem, setOrdem] = useState<(typeof ORDENS)[number]>('Mais recentes')
  const [aberto, setAberto] = useState<LabView | null>(null)

  async function recarregar() {
    setErro(null)
    try {
      const [l, s] = await Promise.all([loadLabs(userId), loadSkills(userId)])
      setLabs(l)
      setSkills(s)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void recarregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const doAba = useMemo(
    () => labs.filter((l) => (aba === 'cases' ? l.is_case : !l.is_case)),
    [labs, aba],
  )

  const filtrados = useMemo(() => {
    let r = doAba
    if (nivel !== NIVEIS[0]) r = r.filter((l) => l.level === nivel)
    if (skillId) r = r.filter((l) => l.skills.some((s) => s.id === skillId))

    const ord = [...r]
    if (ordem === 'Menor duração') ord.sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
    else if (ordem === 'Maior duração') ord.sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    return ord
  }, [doAba, nivel, skillId, ordem])

  const destaque = useMemo(() => doAba.find((l) => l.featured) ?? doAba[0] ?? null, [doAba])
  const demais = useMemo(
    () => filtrados.filter((l) => l.id !== destaque?.id),
    [filtrados, destaque],
  )

  const ultima = useMemo(() => {
    const feitos = labs.filter((l) => l.submission?.completed_at)
    feitos.sort((a, b) =>
      (b.submission!.completed_at ?? '').localeCompare(a.submission!.completed_at ?? ''),
    )
    return feitos[0] ?? null
  }, [labs])

  const skillsComProgresso = useMemo(() => skills.filter((s) => s.progress > 0), [skills])

  if (loading) return <PageLoading />
  if (erro) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState message={erro} onRetry={() => void recarregar()} />
      </div>
    )
  }

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1320 }}>
      <h1 className="k-display k-h1" style={{ marginBottom: 10 }}>
        Aplicar
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 32px' }}>
        Transforme conhecimento em prática com Labs e Cases.
      </p>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 28 }}>
        {(
          [
            [`Kalidash Labs (${labs.filter((l) => !l.is_case).length})`, 'labs'],
            [`Cases (${labs.filter((l) => l.is_case).length})`, 'cases'],
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

      {doAba.length === 0 ? (
        <ErrorState
          title={aba === 'cases' ? 'Nenhum case publicado' : 'Nenhum Lab publicado'}
          message="Assim que a equipe publicar, aparece aqui."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 20 }}>
          {/* ---------- coluna principal ---------- */}
          <div style={{ minWidth: 0 }}>
            {destaque && (
              <>
                <Kicker style={{ marginBottom: 14 }}>
                  {aba === 'cases' ? 'Case em destaque' : 'Lab em destaque'}
                </Kicker>
                <section className="k-card" style={{ overflow: 'hidden', marginBottom: 36 }}>
                  {destaque.image_url && (
                    <img
                      src={destaque.image_url}
                      alt=""
                      style={{ width: '100%', height: 196, objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div style={{ padding: 26 }}>
                    <EstadoChip lab={destaque} />
                    <h2
                      className="k-display"
                      style={{ fontSize: 27, lineHeight: 1.2, margin: '12px 0 10px' }}
                    >
                      {destaque.title}
                    </h2>
                    <p style={{ fontSize: 15, color: 'var(--tx2)', margin: '0 0 18px', lineHeight: 1.6 }}>
                      {destaque.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 18,
                        fontSize: 13,
                        color: 'var(--tx2)',
                        marginBottom: 18,
                      }}
                    >
                      {destaque.level && <span>{destaque.level}</span>}
                      {destaque.minutes && <span>{destaque.minutes} min</span>}
                    </div>
                    {destaque.skills.length > 0 && (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>
                        {destaque.skills.map((s) => (
                          <SkillChip key={s.id}>{s.name}</SkillChip>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setAberto(destaque)}
                      style={{
                        background: 'var(--imperial)',
                        border: 'none',
                        color: 'var(--bg)',
                        borderRadius: 'var(--r-control)',
                        padding: '12px 24px',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 9,
                      }}
                    >
                      {destaque.submission ? 'Continuar' : 'Aplicar agora'}
                      <Icon d={NAV_ICON.arrow} size={16} />
                    </button>
                  </div>
                </section>
              </>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <Kicker>{aba === 'cases' ? 'Todos os cases' : 'Todos os Labs'}</Kicker>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Select value={nivel} onChange={setNivel} options={NIVEIS} />
                <Select
                  value={skillId}
                  onChange={setSkillId}
                  options={[
                    { value: '', label: 'Todas as skills' },
                    ...skills.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Select
                  value={ordem}
                  onChange={(v) => setOrdem(v as (typeof ORDENS)[number])}
                  options={[...ORDENS]}
                />
              </div>
            </div>

            {demais.length === 0 ? (
              <p style={{ color: 'var(--tx2)', fontSize: 14.5, padding: '20px 0' }}>
                Nada com esses filtros.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {demais.map((lab) => (
                  <button
                    key={lab.id}
                    onClick={() => setAberto(lab)}
                    className="k-card k-hoverable"
                    style={{
                      display: 'flex',
                      gap: 18,
                      padding: 16,
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                      alignItems: 'flex-start',
                    }}
                  >
                    {lab.image_url ? (
                      <img
                        src={lab.image_url}
                        alt=""
                        style={{
                          flex: 'none',
                          width: 128,
                          height: 86,
                          objectFit: 'cover',
                          borderRadius: 10,
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          flex: 'none',
                          width: 128,
                          height: 86,
                          borderRadius: 10,
                          background: 'var(--bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon d={NAV_ICON.spark} size={20} stroke="var(--stone)" />
                      </span>
                    )}

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <EstadoChip lab={lab} />
                      <span
                        style={{
                          display: 'block',
                          fontSize: 16,
                          fontWeight: 600,
                          margin: '9px 0 6px',
                        }}
                      >
                        {lab.title}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13.5,
                          color: 'var(--tx2)',
                          lineHeight: 1.55,
                          marginBottom: 10,
                        }}
                      >
                        {lab.description}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          fontSize: 12.5,
                          color: 'var(--tx2)',
                          flexWrap: 'wrap',
                        }}
                      >
                        {lab.level && <span>{lab.level}</span>}
                        {lab.minutes && <span>{lab.minutes} min</span>}
                        {lab.skills.map((s) => (
                          <SkillChip key={s.id}>{s.name}</SkillChip>
                        ))}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---------- coluna lateral ---------- */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {skillsComProgresso.length > 0 && (
              <section className="k-card" style={{ padding: 22 }}>
                <Kicker style={{ marginBottom: 18 }}>Skills desenvolvidas</Kicker>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {skillsComProgresso.map((s) => (
                    <div key={s.id}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 7 }}>
                        <span style={{ fontSize: 13.5, flex: 1 }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--tx2)' }}>{s.progress}%</span>
                      </div>
                      <ProgressBar percent={s.progress} height={4} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {ultima && (
              <section className="k-card" style={{ padding: 22 }}>
                <Kicker style={{ marginBottom: 16 }}>Última aplicação</Kicker>
                <EstadoChip lab={ultima} />
                <h3
                  className="k-display"
                  style={{ fontSize: 18, lineHeight: 1.3, margin: '12px 0 8px' }}
                >
                  {ultima.title}
                </h3>
                <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginBottom: 14 }}>
                  {ultima.minutes ? `${ultima.minutes} min · ` : ''}
                  {new Date(ultima.submission!.completed_at!).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                {ultima.submission?.content && (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: 'var(--tx2)',
                      lineHeight: 1.6,
                      margin: '0 0 16px',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {ultima.submission.content.length > 200
                      ? `${ultima.submission.content.slice(0, 200)}…`
                      : ultima.submission.content}
                  </p>
                )}
                <button
                  onClick={() => setAberto(ultima)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--bronze)',
                    fontSize: 13.5,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Ver minha aplicação →
                </button>
              </section>
            )}

            <section
              style={{
                background: 'var(--imperial)',
                color: 'var(--bg)',
                borderRadius: 'var(--r-card)',
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--champagne)',
                  marginBottom: 14,
                }}
              >
                Continue sua prática
              </div>
              <p
                style={{
                  fontSize: 14.5,
                  color: 'rgba(241,236,228,.8)',
                  lineHeight: 1.6,
                  margin: '0 0 18px',
                }}
              >
                Cada Lab aplicado move uma competência no seu perfil. É o que diferencia
                assistir de saber fazer.
              </p>
              <button
                onClick={() => {
                  setAba('labs')
                  setNivel(NIVEIS[0])
                  setSkillId('')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                style={{
                  background: 'var(--champagne)',
                  border: 'none',
                  color: 'var(--imperial)',
                  borderRadius: 'var(--r-control)',
                  padding: '11px 20px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Explorar outros Labs
              </button>
            </section>
          </aside>
        </div>
      )}

      {aberto && (
        <LabModal
          lab={aberto}
          userId={userId}
          onClose={() => setAberto(null)}
          onSaved={(sub) => {
            setLabs((prev) =>
              prev.map((l) => (l.id === aberto.id ? { ...l, submission: sub } : l)),
            )
            if (userId) void loadSkills(userId).then(setSkills)
          }}
        />
      )}
    </div>
  )
}

/** Selo de estado: Concluído / Em andamento / Novo. */
function EstadoChip({ lab }: { lab: LabView }) {
  const [bg, fg, label] = lab.submission?.completed_at
    ? ['rgba(40,24,59,.07)', 'var(--imperial)', 'Concluído']
    : lab.submission
      ? ['rgba(168,138,88,.14)', 'var(--bronze)', 'Em andamento']
      : ['rgba(183,101,77,.1)', 'var(--terracotta)', 'Novo']

  return (
    <span
      style={{
        display: 'inline-block',
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: '4px 11px',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: (string | { value: string; label: string })[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        background: 'var(--surface)',
        border: '0.8px solid var(--line2)',
        borderRadius: 'var(--r-control)',
        padding: '8px 30px 8px 12px',
        fontSize: 13,
        color: 'var(--tx)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239b9399' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        return (
          <option key={v} value={v}>
            {l}
          </option>
        )
      })}
    </select>
  )
}

/** O Lab aberto: enunciado e o campo onde a pessoa registra a aplicação. */
function LabModal({
  lab,
  userId,
  onClose,
  onSaved,
}: {
  lab: LabView
  userId: string | null
  onClose: () => void
  onSaved: (sub: LabView['submission']) => void
}) {
  const [texto, setTexto] = useState(lab.submission?.content ?? '')
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const concluido = Boolean(lab.submission?.completed_at)

  async function salvar(concluir: boolean) {
    if (!userId) return
    setSalvando(true)
    setAviso(null)
    try {
      const sub = await saveLabSubmission(userId, lab.id, texto, concluir)
      onSaved(sub)
      track(concluir ? 'lab_completed' : 'lab_saved', { lab_id: lab.id, lab_title: lab.title })
      if (concluir) onClose()
      else setAviso('Rascunho salvo.')
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={700}>
      <EstadoChip lab={lab} />
      <h2 className="k-display" style={{ fontSize: 26, lineHeight: 1.22, margin: '14px 0 10px' }}>
        {lab.title}
      </h2>
      <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 8px' }}>
        {lab.description}
      </p>
      <div style={{ fontSize: 12.5, color: 'var(--tx3)', marginBottom: 24 }}>
        {[lab.level, lab.minutes ? `${lab.minutes} min` : null].filter(Boolean).join(' · ')}
      </div>

      {lab.body_markdown && (
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            margin: '0 0 22px',
            paddingBottom: 22,
            borderBottom: '1px solid var(--line)',
          }}
        >
          {lab.body_markdown}
        </p>
      )}

      <Kicker style={{ marginBottom: 12 }}>Sua aplicação</Kicker>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Descreva o que você fez na sua operação: o contexto, a decisão e o resultado."
        rows={8}
        style={{
          width: '100%',
          background: 'var(--surface2)',
          border: '0.8px solid var(--line2)',
          borderRadius: 'var(--r-control)',
          padding: 14,
          fontSize: 14.5,
          lineHeight: 1.65,
          color: 'var(--tx)',
          fontFamily: 'inherit',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      {aviso && (
        <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 10 }}>{aviso}</div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => void salvar(true)}
          disabled={salvando || texto.trim() === ''}
          style={{
            background: 'var(--imperial)',
            border: 'none',
            color: 'var(--bg)',
            borderRadius: 'var(--r-control)',
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: salvando || texto.trim() === '' ? 'default' : 'pointer',
            opacity: texto.trim() === '' ? 0.45 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          {salvando && <Spinner size={13} color="var(--bg)" />}
          {concluido ? 'Atualizar aplicação' : 'Marcar como concluído'}
        </button>
        <button
          onClick={() => void salvar(false)}
          disabled={salvando}
          style={{
            background: 'transparent',
            border: '0.8px solid var(--line2)',
            color: 'var(--tx)',
            borderRadius: 'var(--r-control)',
            padding: '12px 20px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Salvar rascunho
        </button>
      </div>
    </Modal>
  )
}
