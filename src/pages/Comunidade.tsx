import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'
import {
  acceptConnection,
  loadCommunityStats,
  loadConnections,
  loadDirectory,
  loadJobs,
  removeConnection,
  requestConnection,
  saveCommunityProfile,
  type Connection,
  type DirectoryPerson,
  type JobOpening,
} from '../services/comunidade'
import {
  Avatar,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  SkillChip,
  inputStyle,
} from '../components/ui'

const WHATSAPP_URL = import.meta.env.VITE_AI_LEAGUE_URL as string | undefined

export default function Comunidade() {
  const { session, profile, refreshProfile } = useAuth()
  const userId = session?.user.id ?? null

  const [pessoas, setPessoas] = useState<DirectoryPerson[]>([])
  const [conexoes, setConexoes] = useState<Connection[]>([])
  const [vagas, setVagas] = useState<JobOpening[]>([])
  const [stats, setStats] = useState({ members: 0, jobs: 0 })
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErro(null)
    try {
      const [p, c, v, s] = await Promise.all([
        loadDirectory(),
        userId ? loadConnections(userId) : Promise.resolve([] as Connection[]),
        loadJobs(),
        loadCommunityStats(),
      ])
      setPessoas(p)
      setConexoes(c)
      setVagas(v)
      setStats(s)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a Comunidade.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const noDiretorio = Boolean(profile?.community_opt_in)

  /** Estado da relação com cada pessoa, visto do meu lado. */
  const relacao = useCallback(
    (outroId: string) => conexoes.find((c) => c.requester_id === outroId || c.addressee_id === outroId) ?? null,
    [conexoes],
  )

  const aceitas = useMemo(() => conexoes.filter((c) => c.status === 'accepted'), [conexoes])
  const pedidosRecebidos = useMemo(
    () => conexoes.filter((c) => c.status === 'pending' && c.addressee_id === userId),
    [conexoes, userId],
  )

  const sugestoes = useMemo(
    () => pessoas.filter((p) => p.id !== userId),
    [pessoas, userId],
  )

  async function conectar(p: DirectoryPerson) {
    if (!userId) return
    setOcupado(p.id)
    try {
      const nova = await requestConnection(userId, p.id)
      setConexoes((prev) => [...prev, nova])
      track('connection_requested', { pessoa_id: p.id })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o pedido.')
    } finally {
      setOcupado(null)
    }
  }

  async function aceitar(c: Connection) {
    setOcupado(c.id)
    try {
      await acceptConnection(c.id)
      setConexoes((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: 'accepted' } : x)))
      // o LinkedIn do outro só é liberado pela view depois do aceite
      setPessoas(await loadDirectory())
      track('connection_accepted', { pessoa_id: c.requester_id })
    } finally {
      setOcupado(null)
    }
  }

  async function desfazer(c: Connection) {
    setOcupado(c.id)
    try {
      await removeConnection(c.id)
      setConexoes((prev) => prev.filter((x) => x.id !== c.id))
      setPessoas(await loadDirectory())
    } finally {
      setOcupado(null)
    }
  }

  if (loading) return <PageLoading />

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1320 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 36,
        }}
      >
        <div>
          <Kicker style={{ marginBottom: 14 }}>Kalidash Community</Kicker>
          <h1 className="k-display k-h1" style={{ marginBottom: 12 }}>
            Comunidade
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 16, margin: 0, maxWidth: 580 }}>
            Conecte-se com profissionais, compartilhe experiências e encontre novas
            oportunidades.
          </p>
        </div>

        {WHATSAPP_URL && (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('community_whatsapp_clicked', {})}
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              flex: 'none',
            }}
          >
            Ir para o WhatsApp
            <Icon d={NAV_ICON.arrow} size={16} />
          </a>
        )}
      </div>

      {erro && (
        <div style={{ marginBottom: 24 }}>
          <ErrorState message={erro} onRetry={() => void load()} />
        </div>
      )}

      {/* ---------- números ---------- */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          flexWrap: 'wrap',
          padding: '0 0 32px',
          marginBottom: 32,
          borderBottom: '1px solid var(--line)',
        }}
      >
        {[
          { n: stats.members, l: 'no diretório da comunidade' },
          { n: aceitas.length, l: aceitas.length === 1 ? 'conexão sua' : 'conexões suas' },
          { n: stats.jobs, l: 'vagas e oportunidades' },
        ].map((x) => (
          <div key={x.l}>
            <div className="k-display" style={{ fontSize: 34, lineHeight: 1 }}>
              {x.n}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 7 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 20 }}>
        {/* ---------- coluna principal ---------- */}
        <div style={{ minWidth: 0 }}>
          {pedidosRecebidos.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <Kicker style={{ marginBottom: 14 }}>Pedidos para você</Kicker>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pedidosRecebidos.map((c) => {
                  const p = pessoas.find((x) => x.id === c.requester_id)
                  return (
                    <div
                      key={c.id}
                      className="k-card"
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}
                    >
                      <Avatar name={initials(p?.full_name ?? '?')} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>
                          {p?.full_name ?? 'Alguém da comunidade'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                          quer se conectar com você
                        </div>
                      </div>
                      <button
                        onClick={() => void aceitar(c)}
                        disabled={ocupado === c.id}
                        style={botaoPrimario}
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => void desfazer(c)}
                        disabled={ocupado === c.id}
                        style={botaoFantasma}
                      >
                        Recusar
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <Kicker style={{ marginBottom: 6 }}>Networking</Kicker>
          <h2 className="k-display" style={{ fontSize: 23, marginBottom: 18 }}>
            Pessoas para você conhecer
          </h2>

          {!noDiretorio ? (
            <EntrarNoDiretorio
              onEntrou={async () => {
                await refreshProfile()
                await load()
              }}
              userId={userId}
            />
          ) : sugestoes.length === 0 ? (
            <p style={{ color: 'var(--tx2)', fontSize: 14.5, lineHeight: 1.6, maxWidth: 520 }}>
              Você é a primeira pessoa no diretório. Conforme a turma for entrando, os perfis
              aparecem aqui.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {sugestoes.map((p) => {
                const rel = relacao(p.id)
                return (
                  <section key={p.id} className="k-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <Avatar name={initials(p.full_name ?? '?')} size={42} />
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.full_name ?? 'Membro da comunidade'}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 2 }}>
                          {[p.headline, p.company].filter(Boolean).join(' · ') || p.area || '—'}
                        </div>
                      </div>
                    </div>

                    {p.interest && (
                      <div style={{ marginBottom: 16 }}>
                        <SkillChip>{p.interest}</SkillChip>
                      </div>
                    )}

                    {rel?.status === 'accepted' ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {p.linkedin_url ? (
                          <a
                            href={p.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...botaoPrimario, textDecoration: 'none' }}
                          >
                            Abrir LinkedIn
                            <Icon d={NAV_ICON.arrow} size={15} />
                          </a>
                        ) : (
                          <span style={{ fontSize: 13, color: 'var(--tx2)' }}>
                            Conectados. Esta pessoa ainda não informou o LinkedIn.
                          </span>
                        )}
                        <button
                          onClick={() => void desfazer(rel)}
                          disabled={ocupado === rel.id}
                          style={botaoFantasma}
                        >
                          Desfazer
                        </button>
                      </div>
                    ) : rel?.status === 'pending' ? (
                      <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                        {rel.requester_id === userId
                          ? 'Pedido enviado. Aguardando o aceite.'
                          : 'Esta pessoa pediu conexão com você.'}
                      </div>
                    ) : (
                      <button
                        onClick={() => void conectar(p)}
                        disabled={ocupado === p.id}
                        style={botaoFantasma}
                      >
                        {ocupado === p.id ? 'Enviando...' : 'Conectar'}
                      </button>
                    )}
                  </section>
                )
              })}
            </div>
          )}

          {/* ---------- vagas ---------- */}
          <div style={{ marginTop: 44 }}>
            <Kicker style={{ marginBottom: 6 }}>Oportunidades</Kicker>
            <h2 className="k-display" style={{ fontSize: 23, marginBottom: 18 }}>
              Vagas em destaque
            </h2>

            {vagas.length === 0 ? (
              <p style={{ color: 'var(--tx2)', fontSize: 14.5, maxWidth: 520, lineHeight: 1.6 }}>
                Nenhuma vaga publicada agora. Quando a equipe abrir uma oportunidade, ela
                aparece aqui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vagas.map((v) => (
                  <section
                    key={v.id}
                    className="k-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 18 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 5 }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--tx2)' }}>
                        {[v.company, v.location].filter(Boolean).join(' · ')}
                      </div>
                      {v.description && (
                        <p
                          style={{
                            fontSize: 13.5,
                            color: 'var(--tx2)',
                            margin: '8px 0 0',
                            lineHeight: 1.55,
                          }}
                        >
                          {v.description}
                        </p>
                      )}
                    </div>
                    <div style={{ flex: 'none', textAlign: 'right' }}>
                      {v.contract_type && (
                        <div style={{ marginBottom: 7 }}>
                          <SkillChip>{v.contract_type}</SkillChip>
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--tx3)', marginBottom: 10 }}>
                        {diasAtras(v.posted_at)}
                      </div>
                      {v.apply_url && (
                        <a
                          href={v.apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => track('job_clicked', { vaga_id: v.id, titulo: v.title })}
                          style={{ fontSize: 13.5, color: 'var(--bronze)' }}
                        >
                          Ver vaga →
                        </a>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ---------- coluna lateral ---------- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
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
              Conversas que continuam
            </div>
            <h3 className="k-display" style={{ fontSize: 20, color: 'var(--bg)', marginBottom: 14 }}>
              O grupo no WhatsApp
            </h3>
            <ul style={{ margin: '0 0 20px', padding: 0, listStyle: 'none' }}>
              {[
                'Dúvidas respondidas pela equipe e pela turma',
                'O que as pessoas estão aplicando na operação',
                'Avisos de clínicas e encontros ao vivo',
              ].map((t) => (
                <li
                  key={t}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    fontSize: 14,
                    color: 'rgba(241,236,228,.82)',
                    lineHeight: 1.55,
                    marginBottom: 10,
                  }}
                >
                  <Icon
                    d={NAV_ICON.check}
                    size={14}
                    width={2.4}
                    stroke="var(--champagne)"
                    style={{ flex: 'none', marginTop: 3 }}
                  />
                  {t}
                </li>
              ))}
            </ul>

            {WHATSAPP_URL ? (
              <>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track('community_whatsapp_clicked', {})}
                  style={{
                    background: 'var(--champagne)',
                    color: 'var(--imperial)',
                    borderRadius: 'var(--r-control)',
                    padding: '11px 0',
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Acessar comunidade
                </a>
                <p
                  style={{
                    fontSize: 11.5,
                    color: 'rgba(241,236,228,.5)',
                    margin: '10px 0 0',
                    textAlign: 'center',
                  }}
                >
                  O link será aberto em uma nova aba.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'rgba(241,236,228,.6)', margin: 0 }}>
                O link do grupo ainda não foi configurado.
              </p>
            )}
          </section>

          {noDiretorio && (
            <PerfilNaComunidade
              userId={userId}
              onSalvo={async () => {
                await refreshProfile()
                await load()
              }}
            />
          )}
        </aside>
      </div>
    </div>
  )
}

/** Convite para entrar no diretório. Nada aparece para os outros antes disso. */
function EntrarNoDiretorio({
  userId,
  onEntrou,
}: {
  userId: string | null
  onEntrou: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  return (
    <section
      className="k-card"
      style={{ padding: 28, maxWidth: 560, borderStyle: 'dashed', borderColor: 'var(--line2)' }}
    >
      <h3 className="k-display" style={{ fontSize: 20, marginBottom: 10 }}>
        Você ainda não está no diretório
      </h3>
      <p style={{ fontSize: 14.5, color: 'var(--tx2)', lineHeight: 1.65, margin: '0 0 20px' }}>
        O networking é opcional. Ao entrar, as outras pessoas da Academy passam a ver seu
        nome, cargo, empresa e um interesse. Seu e-mail nunca aparece, e seu LinkedIn só é
        liberado para quem você aceitar conectar.
      </p>
      <button
        onClick={async () => {
          if (!userId) return
          setBusy(true)
          try {
            await saveCommunityProfile(userId, { community_opt_in: true })
            track('community_opt_in', {})
            await onEntrou()
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
        style={botaoPrimario}
      >
        {busy ? 'Entrando...' : 'Entrar no diretório'}
      </button>
    </section>
  )
}

/** Os campos que o diretório mostra, editáveis pela própria pessoa. */
function PerfilNaComunidade({
  userId,
  onSalvo,
}: {
  userId: string | null
  onSalvo: () => Promise<void>
}) {
  const { profile } = useAuth()
  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [interest, setInterest] = useState(profile?.interest ?? '')
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '')
  const [busy, setBusy] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  return (
    <section className="k-card" style={{ padding: 22 }}>
      <Kicker style={{ marginBottom: 16 }}>Como você aparece</Kicker>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo label="Cargo">
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Head de Operações"
            style={inputStyle}
          />
        </Campo>
        <Campo label="Empresa">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Onde você trabalha"
            style={inputStyle}
          />
        </Campo>
        <Campo label="Interesse">
          <input
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            placeholder="Agentes em atendimento"
            style={inputStyle}
          />
        </Campo>
        <Campo label="LinkedIn">
          <input
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/..."
            style={inputStyle}
          />
        </Campo>
      </div>

      <button
        onClick={async () => {
          if (!userId) return
          setBusy(true)
          setAviso(null)
          try {
            await saveCommunityProfile(userId, {
              headline: headline.trim() || null,
              company: company.trim() || null,
              interest: interest.trim() || null,
              linkedin_url: linkedin.trim() || null,
            })
            await onSalvo()
            setAviso('Salvo.')
          } catch (e) {
            setAviso(e instanceof Error ? e.message : 'Não foi possível salvar.')
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
        style={{ ...botaoPrimario, width: '100%', justifyContent: 'center', marginTop: 20 }}
      >
        {busy ? 'Salvando...' : 'Salvar'}
      </button>

      {aviso && (
        <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 10, textAlign: 'center' }}>
          {aviso}
        </div>
      )}

      <button
        onClick={async () => {
          if (!userId) return
          setBusy(true)
          try {
            await saveCommunityProfile(userId, { community_opt_in: false })
            await onSalvo()
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--tx3)',
          fontSize: 12.5,
          cursor: 'pointer',
          padding: '12px 0 0',
          width: '100%',
        }}
      >
        Sair do diretório
      </button>
    </section>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function diasAtras(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Há 1 dia'
  return `Há ${dias} dias`
}

const botaoPrimario: React.CSSProperties = {
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 'var(--r-control)',
  padding: '10px 20px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flex: 'none',
}

const botaoFantasma: React.CSSProperties = {
  background: 'transparent',
  border: '0.8px solid var(--line2)',
  color: 'var(--tx)',
  borderRadius: 'var(--r-control)',
  padding: '10px 18px',
  fontSize: 13.5,
  cursor: 'pointer',
  flex: 'none',
}
