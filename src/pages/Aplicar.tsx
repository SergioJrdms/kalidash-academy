import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { ErrorState, Icon, Kicker, Modal, PageLoading, Spinner } from '../components/ui'

type Aba = 'labs' | 'cases'

const NIVEIS = ['Todos os níveis', 'Iniciante', 'Intermediário', 'Avançado']
const ORDENS = ['Mais recentes', 'Menor duração', 'Maior duração'] as const

/** Verde de sucesso, usado só no rótulo de concluído. */
const VERDE = '#16a34a'

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

  const recarregar = useCallback(async () => {
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
  }, [userId])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  /**
   * O destaque é sempre o Lab marcado como `featured`, inclusive na aba de
   * Cases — é assim no desenho: só a lista de baixo troca.
   */
  const destaque = useMemo(() => {
    const apenasLabs = labs.filter((l) => !l.is_case)
    return apenasLabs.find((l) => l.featured) ?? apenasLabs[0] ?? null
  }, [labs])

  const daAba = useMemo(
    () => labs.filter((l) => (aba === 'cases' ? l.is_case : !l.is_case)),
    [labs, aba],
  )

  const lista = useMemo(() => {
    let r = daAba.filter((l) => l.id !== destaque?.id)
    if (nivel !== NIVEIS[0]) r = r.filter((l) => l.level === nivel)
    if (skillId) r = r.filter((l) => l.skills.some((s) => s.id === skillId))

    const ord = [...r]
    if (ordem === 'Menor duração') ord.sort((a, b) => (a.minutes ?? 0) - (b.minutes ?? 0))
    else if (ordem === 'Maior duração') ord.sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0))
    return ord
  }, [daAba, destaque, nivel, skillId, ordem])

  /** A última coisa que a pessoa concluiu, Lab ou Case. */
  const ultima = useMemo(() => {
    const feitos = labs.filter((l) => l.submission?.completed_at)
    feitos.sort((a, b) =>
      (b.submission!.completed_at ?? '').localeCompare(a.submission!.completed_at ?? ''),
    )
    return feitos[0] ?? null
  }, [labs])

  function aoSalvar(lab: LabView, sub: LabView['submission']) {
    setLabs((prev) => prev.map((l) => (l.id === lab.id ? { ...l, submission: sub } : l)))
    if (userId) void loadSkills(userId).then(setSkills)
  }

  if (loading) return <PageLoading />
  if (erro) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState message={erro} onRetry={() => void recarregar()} />
      </div>
    )
  }

  return (
    <div className="k-page" style={{ padding: '36px 36px 90px', maxWidth: 1280 }}>
      <h1 className="k-display k-page-title" style={{ margin: '0 0 10px' }}>
        Aplicar
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 15, margin: '0 0 24px' }}>
        Transforme conhecimento em prática com Labs e Cases.
      </p>

      <div className="k-aplicar-grid">
        {/* ================= coluna principal: um cartao so ================= */}
        <section className="k-card" style={{ padding: 0, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '0.8px solid var(--line)' }}>
            {(
              [
                ['Kalidash Labs', 'labs', NAV_ICON.spark],
                ['Cases', 'cases', NAV_ICON.note],
              ] as const
            ).map(([label, key, icone]) => {
              const on = aba === key
              return (
                <button
                  key={key}
                  onClick={() => setAba(key as Aba)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2.4px solid ${on ? 'var(--bronze)' : 'transparent'}`,
                    color: on ? 'var(--tx)' : 'var(--tx3)',
                    padding: '15px 0',
                    fontSize: 14,
                    lineHeight: '21px',
                    fontWeight: on ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: '-0.8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                  }}
                >
                  <Icon d={icone} size={15} stroke={on ? 'var(--tx)' : 'var(--tx3)'} />
                  {label}
                </button>
              )
            })}
          </div>

          {/* ---------- lab em destaque ---------- */}
          {destaque && (
            <div style={{ padding: '20px 20px 24px' }}>
              <Kicker style={{ letterSpacing: '1px', marginBottom: 14 }}>Lab em destaque</Kicker>
              <div className="k-stack-mobile" style={{ display: 'flex', gap: 20 }}>
                <Arte
                  url={destaque.image_url}
                  largura={300}
                  altura={176}
                  raio={12}
                  icone={32}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2
                    className="k-display"
                    style={{ fontSize: 26, lineHeight: 1.2, marginBottom: 10 }}
                  >
                    {destaque.title}
                  </h2>
                  {destaque.description && (
                    <p
                      style={{
                        fontSize: 14,
                        color: 'var(--tx2)',
                        lineHeight: 1.6,
                        margin: '0 0 16px',
                      }}
                    >
                      {destaque.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                      marginBottom: 18,
                    }}
                  >
                    {destaque.level && <Meta icone={NAV_ICON.level}>{destaque.level}</Meta>}
                    {destaque.minutes && (
                      <Meta icone={NAV_ICON.clock}>{destaque.minutes} min</Meta>
                    )}
                    {destaque.skills.map((s) => (
                      <Pilula key={s.id}>{s.name}</Pilula>
                    ))}
                  </div>

                  <button onClick={() => setAberto(destaque)} style={botaoImperial}>
                    {destaque.submission ? 'Continuar' : 'Aplicar agora'}
                    <Icon d={NAV_ICON.arrow} size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---------- filtros ---------- */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              padding: '0 20px 14px',
            }}
          >
            <Kicker style={{ letterSpacing: '1px' }}>
              {aba === 'cases' ? 'Todos os cases' : 'Todos os labs'}
            </Kicker>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Filtro valor={nivel} aoTrocar={setNivel} opcoes={NIVEIS} />
              <Filtro
                valor={skillId}
                aoTrocar={setSkillId}
                opcoes={[
                  { value: '', label: 'Todas as skills' },
                  ...skills.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <Filtro
                valor={ordem}
                aoTrocar={(v) => setOrdem(v as (typeof ORDENS)[number])}
                opcoes={[...ORDENS]}
              />
            </div>
          </div>

          {/* ---------- lista ---------- */}
          {lista.length === 0 ? (
            <p
              style={{
                fontSize: 14,
                color: 'var(--tx2)',
                lineHeight: 1.6,
                margin: 0,
                padding: '8px 20px 28px',
              }}
            >
              {daAba.length === 0
                ? aba === 'cases'
                  ? 'Nenhum case publicado ainda. Quando a equipe publicar, ele aparece aqui.'
                  : 'Nenhum Lab publicado ainda.'
                : 'Nada com esses filtros. Tente limpar um deles.'}
            </p>
          ) : (
            <div style={{ padding: '0 20px' }}>
              {lista.map((lab, i) => (
                <LinhaLab
                  key={lab.id}
                  lab={lab}
                  primeira={i === 0}
                  onAbrir={() => setAberto(lab)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ================= coluna lateral ================= */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <CartaoLateral>
            <CabecaLateral titulo="Skills desenvolvidas" para="/perfil" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {skills.map((s) => (
                <div key={s.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{s.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>
                      {s.progress}%
                    </span>
                  </div>
                  <Barra percent={s.progress} />
                </div>
              ))}
            </div>
          </CartaoLateral>

          {ultima && (
            <CartaoLateral>
              <CabecaLateral titulo="Última aplicação" para="/perfil" />
              <div style={{ marginBottom: 14 }}>
                <Arte url={ultima.image_url} altura={90} raio={10} icone={24} />
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: VERDE,
                  marginBottom: 8,
                }}
              >
                <Icon d={NAV_ICON.check} size={12} width={2.6} stroke={VERDE} />
                Concluído
              </div>
              <h3 className="k-display" style={{ fontSize: 16, lineHeight: 1.3, marginBottom: 8 }}>
                {ultima.title}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 10 }}>
                {[ultima.minutes ? `${ultima.minutes} min` : null, dataCurta(ultima.submission!.completed_at!)]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
              {ultima.submission?.content && (
                <p style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {ultima.submission.content.length > 150
                    ? `${ultima.submission.content.slice(0, 150)}…`
                    : ultima.submission.content}
                </p>
              )}
              <button onClick={() => setAberto(ultima)} style={botaoClaro}>
                Ver minha aplicação
              </button>
            </CartaoLateral>
          )}

          <CartaoLateral>
            <Icon d={NAV_ICON.spark} size={18} stroke="var(--tx)" style={{ marginBottom: 14 }} />
            <Kicker style={{ letterSpacing: '1px', marginBottom: 12 }}>Continue sua prática</Kicker>
            <h3 className="k-display" style={{ fontSize: 20, lineHeight: 1.25, marginBottom: 10 }}>
              Mantenha o ritmo e evolua com novos Labs.
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 18px' }}>
              Aplique o que aprendeu e desenvolva competências reais para a sua carreira.
            </p>
            <button
              onClick={() => {
                setAba('labs')
                setNivel(NIVEIS[0])
                setSkillId('')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              style={{ ...botaoImperial, width: '100%', justifyContent: 'center', padding: 12 }}
            >
              Explorar outros Labs
              <Icon d={NAV_ICON.arrow} size={14} />
            </button>
          </CartaoLateral>
        </aside>
      </div>

      {aberto && (
        <LabModal
          lab={aberto}
          userId={userId}
          onClose={() => setAberto(null)}
          onSaved={(sub) => aoSalvar(aberto, sub)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// Peças
// ---------------------------------------------------------------------

/**
 * A arte do Lab. Nenhum tem imagem cadastrada ainda, então sem `url` o
 * espaço recebe a marca d'água em champanhe sobre o roxo, em vez de um
 * retângulo cinza.
 */
function Arte({
  url,
  largura,
  altura,
  raio,
  icone,
}: {
  url: string | null
  largura?: number
  altura: number
  raio: number
  icone: number
}) {
  return (
    <div
      style={{
        flex: 'none',
        width: largura ?? '100%',
        height: altura,
        borderRadius: raio,
        overflow: 'hidden',
        background: url
          ? `center/cover no-repeat url(${JSON.stringify(url)})`
          : 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!url && (
        <Icon
          d={NAV_ICON.spark}
          size={icone}
          stroke="var(--champagne)"
          width={1.1}
          style={{ opacity: 0.45 }}
        />
      )}
    </div>
  )
}

function Meta({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--tx2)',
      }}
    >
      <Icon d={icone} size={13} stroke="var(--tx3)" />
      {children}
    </span>
  )
}

function Pilula({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: 'var(--bg)',
        color: 'var(--tx2)',
        borderRadius: 99,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}

function Barra({ percent }: { percent: number }) {
  return (
    <div style={{ height: 5, borderRadius: 999, background: 'var(--line)', overflow: 'hidden' }}>
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

function CartaoLateral({ children }: { children: React.ReactNode }) {
  return (
    <section className="k-card" style={{ padding: '20px 20px 22px' }}>
      {children}
    </section>
  )
}

function CabecaLateral({ titulo, para }: { titulo: string; para: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <Kicker style={{ letterSpacing: '1px' }}>{titulo}</Kicker>
      <Link
        to={para}
        style={{
          fontSize: 12.5,
          color: 'var(--bronze)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          whiteSpace: 'nowrap',
        }}
      >
        Ver todas
        <Icon d={NAV_ICON.arrow} size={13} stroke="var(--bronze)" />
      </Link>
    </div>
  )
}

/** Uma linha da lista. O estado sai como rótulo de texto, não como pílula. */
function LinhaLab({
  lab,
  primeira,
  onAbrir,
}: {
  lab: LabView
  primeira: boolean
  onAbrir: () => void
}) {
  const concluido = Boolean(lab.submission?.completed_at)
  const emAndamento = Boolean(lab.submission) && !concluido

  return (
    <button
      onClick={onAbrir}
      className="k-row"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'transparent',
        border: 'none',
        borderTop: primeira ? 'none' : '0.8px solid var(--line)',
        padding: '21px 0',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Arte url={lab.image_url} largura={80} altura={58} raio={8} icone={18} />

      <span style={{ flex: 1, minWidth: 0 }}>
        {lab.is_case && (
          <span
            style={{
              display: 'inline-block',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--bronze)',
              marginBottom: 5,
            }}
          >
            CASE
          </span>
        )}
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--imperial)',
            marginBottom: 4,
          }}
        >
          {lab.title}
        </span>
        {lab.description && (
          <span
            style={{
              display: 'block',
              fontSize: 12.5,
              color: 'var(--tx2)',
              lineHeight: 1.4,
              marginBottom: 6,
            }}
          >
            {lab.description}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {lab.level && <Meta icone={NAV_ICON.level}>{lab.level}</Meta>}
          {lab.minutes && <Meta icone={NAV_ICON.clock}>{lab.minutes} min</Meta>}
          {lab.skills.map((s) => (
            <Pilula key={s.id}>{s.name}</Pilula>
          ))}
        </span>
      </span>

      <span style={{ flex: 'none', whiteSpace: 'nowrap' }}>
        {concluido ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: VERDE,
            }}
          >
            <Icon d={NAV_ICON.check} size={12} width={2.6} stroke={VERDE} />
            Concluído
          </span>
        ) : emAndamento ? (
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--bronze)' }}>
            Em andamento
          </span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx2)' }}>Novo</span>
        )}
      </span>
    </button>
  )
}

function Filtro({
  valor,
  aoTrocar,
  opcoes,
}: {
  valor: string
  aoTrocar: (v: string) => void
  opcoes: (string | { value: string; label: string })[]
}) {
  return (
    <select
      value={valor}
      onChange={(e) => aoTrocar(e.target.value)}
      style={{
        appearance: 'none',
        background: 'var(--surface)',
        border: '0.8px solid var(--line2)',
        borderRadius: 8,
        padding: '7px 28px 7px 12px',
        fontSize: 13,
        color: 'var(--tx)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239b9399' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 9px center',
      }}
    >
      {opcoes.map((o) => {
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

const botaoImperial: React.CSSProperties = {
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 10,
  padding: '11px 24px',
  fontSize: 14,
  lineHeight: '21px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
}

const botaoClaro: React.CSSProperties = {
  width: '100%',
  background: 'var(--bg)',
  border: '0.8px solid var(--line2)',
  color: 'var(--tx)',
  borderRadius: 9,
  padding: '11px 0',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
}

function dataCurta(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace('.', '')
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
      <Kicker style={{ letterSpacing: '1px', marginBottom: 12 }}>
        {lab.is_case ? 'Case' : 'Kalidash Lab'}
      </Kicker>
      <h2 className="k-display" style={{ fontSize: 26, lineHeight: 1.22, marginBottom: 10 }}>
        {lab.title}
      </h2>
      {lab.description && (
        <p style={{ fontSize: 15, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 10px' }}>
          {lab.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {lab.level && <Meta icone={NAV_ICON.level}>{lab.level}</Meta>}
        {lab.minutes && <Meta icone={NAV_ICON.clock}>{lab.minutes} min</Meta>}
        {lab.skills.map((s) => (
          <Pilula key={s.id}>{s.name}</Pilula>
        ))}
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

      <Kicker style={{ letterSpacing: '1px', marginBottom: 12 }}>Sua aplicação</Kicker>
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

      {aviso && <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 10 }}>{aviso}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => void salvar(true)}
          disabled={salvando || texto.trim() === ''}
          style={{
            ...botaoImperial,
            padding: '12px 24px',
            cursor: salvando || texto.trim() === '' ? 'default' : 'pointer',
            opacity: texto.trim() === '' ? 0.45 : 1,
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
            borderRadius: 10,
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
