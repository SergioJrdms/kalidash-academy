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
import { Banner, Icon, Kicker, PageLoading, inputStyle } from '../components/ui'

const WHATSAPP_URL = import.meta.env.VITE_AI_LEAGUE_URL as string | undefined

/** As três cores de avatar do desenho, em rodízio pela posição na lista. */
const CORES_AVATAR = ['var(--aubergine)', 'var(--bronze)', 'var(--terracotta)']

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

  const relacao = useCallback(
    (outroId: string) =>
      conexoes.find((c) => c.requester_id === outroId || c.addressee_id === outroId) ?? null,
    [conexoes],
  )

  const sugestoes = useMemo(() => pessoas.filter((p) => p.id !== userId), [pessoas, userId])
  const pedidos = useMemo(
    () => conexoes.filter((c) => c.status === 'pending' && c.addressee_id === userId),
    [conexoes, userId],
  )
  const disponiveis = useMemo(
    () => sugestoes.filter((p) => !relacao(p.id)).length,
    [sugestoes, relacao],
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
    <div className="k-page" style={{ padding: '36px 36px 90px', maxWidth: 1280 }}>
      {/* ---------------- cabeçalho ---------------- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 28,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Kicker style={{ fontSize: 11, letterSpacing: '1.1px', marginBottom: 14 }}>
            Kalidash Community
          </Kicker>
          <h1 className="k-display k-page-title" style={{ margin: '0 0 10px' }}>
            Comunidade
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 15, margin: 0, maxWidth: 620 }}>
            Conecte-se com profissionais, compartilhe experiências e encontre novas
            oportunidades.
          </p>
        </div>

        {WHATSAPP_URL && (
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('community_whatsapp_clicked', { origem: 'topo' })}
            style={{
              flex: 'none',
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 10,
              padding: '12px 18px',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 42,
            }}
          >
            <Icon d={NAV_ICON.comunidade} size={16} />
            Ir para o WhatsApp
            <Icon d={NAV_ICON.arrow} size={14} />
          </a>
        )}
      </div>

      {erro && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{erro}</Banner>
        </div>
      )}

      {/* ---------------- números ---------------- */}
      <section
        className="k-card"
        style={{ padding: 0, display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}
      >
        {[
          { icone: NAV_ICON.comunidade, n: stats.members, l: 'membros na comunidade' },
          { icone: NAV_ICON.aplicar, n: disponiveis, l: 'conexões disponíveis' },
          { icone: NAV_ICON.note, n: stats.jobs, l: 'vagas e oportunidades' },
        ].map((x) => (
          <div
            key={x.l}
            style={{
              flex: '1 1 240px',
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              padding: '20px 26px',
            }}
          >
            <Icon d={x.icone} size={18} stroke="var(--bronze)" />
            <div>
              <div className="k-display" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                {x.n}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6 }}>{x.l}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="k-comunidade-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {/* ---------------- networking ---------------- */}
          <section className="k-card" style={{ padding: '22px 24px' }}>
            <CabecaSecao
              kicker="Networking"
              titulo="Pessoas para você conhecer"
              link={noDiretorio && sugestoes.length > 3 ? 'Ver todos' : undefined}
            />

            {/* Pedidos recebidos não existem no desenho, mas sem eles ninguém
                aceita uma conexão. Aparecem só quando há algum. */}
            {pedidos.length > 0 && (
              <div
                style={{
                  background: 'var(--bg)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 18,
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 12 }}>
                  {pedidos.length === 1
                    ? '1 pessoa quer se conectar com você'
                    : `${pedidos.length} pessoas querem se conectar com você`}
                </div>
                {pedidos.map((c) => {
                  const p = pessoas.find((x) => x.id === c.requester_id)
                  return (
                    <div
                      key={c.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}
                    >
                      <AvatarRedondo nome={p?.full_name ?? '?'} indice={0} tamanho={32} />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
                        {p?.full_name ?? 'Alguém da comunidade'}
                      </span>
                      <button
                        onClick={() => void aceitar(c)}
                        disabled={ocupado === c.id}
                        style={{ ...botaoContorno, width: 'auto', padding: '7px 14px' }}
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => void desfazer(c)}
                        disabled={ocupado === c.id}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--tx3)',
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Recusar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {!noDiretorio ? (
              <EntrarNoDiretorio
                userId={userId}
                onEntrou={async () => {
                  await refreshProfile()
                  await load()
                }}
              />
            ) : sugestoes.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
                Você é a primeira pessoa no diretório. Conforme a turma for entrando, os
                perfis aparecem aqui.
              </p>
            ) : (
              <div className="k-pessoas-grid">
                {sugestoes.slice(0, 6).map((p, i) => (
                  <CartaoPessoa
                    key={p.id}
                    pessoa={p}
                    indice={i}
                    relacao={relacao(p.id)}
                    souEu={userId}
                    ocupado={ocupado === p.id || ocupado === relacao(p.id)?.id}
                    onConectar={() => void conectar(p)}
                    onDesfazer={(c) => void desfazer(c)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ---------------- vagas ---------------- */}
          <section className="k-card" style={{ padding: '22px 24px' }}>
            <CabecaSecao
              kicker="Oportunidades"
              titulo="Vagas em destaque"
              link={vagas.length > 0 ? 'Ver todas' : undefined}
            />

            {vagas.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
                Nenhuma vaga publicada agora. Quando a equipe abrir uma oportunidade, ela
                aparece aqui.
              </p>
            ) : (
              <div>
                {vagas.map((v, i) => (
                  <LinhaVaga key={v.id} vaga={v} primeira={i === 0} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---------------- lateral ---------------- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <CartaoWhatsApp />
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

// ---------------------------------------------------------------------

function CabecaSecao({
  kicker,
  titulo,
  link,
}: {
  kicker: string
  titulo: string
  link?: string
}) {
  return (
    <>
      <Kicker style={{ fontSize: 11, letterSpacing: '1px', marginBottom: 10 }}>{kicker}</Kicker>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <h2 className="k-display" style={{ fontSize: 22 }}>
          {titulo}
        </h2>
        {link && (
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--bronze)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            {link}
            <Icon d={NAV_ICON.arrow} size={13} stroke="var(--bronze)" />
          </span>
        )}
      </div>
    </>
  )
}

function AvatarRedondo({
  nome,
  indice,
  tamanho = 42,
}: {
  nome: string
  indice: number
  tamanho?: number
}) {
  return (
    <span
      style={{
        flex: 'none',
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: CORES_AVATAR[indice % CORES_AVATAR.length],
        color: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: tamanho < 36 ? 11 : 12,
        fontWeight: 600,
      }}
    >
      {initials(nome)}
    </span>
  )
}

function CartaoPessoa({
  pessoa,
  indice,
  relacao,
  souEu,
  ocupado,
  onConectar,
  onDesfazer,
}: {
  pessoa: DirectoryPerson
  indice: number
  relacao: Connection | null
  souEu: string | null
  ocupado: boolean
  onConectar: () => void
  onDesfazer: (c: Connection) => void
}) {
  const aceita = relacao?.status === 'accepted'
  const pendente = relacao?.status === 'pending'

  return (
    <div
      style={{
        background: 'var(--surface2)',
        border: '0.8px solid var(--line)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <AvatarRedondo nome={pessoa.full_name ?? '?'} indice={indice} />
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {pessoa.full_name ?? 'Membro da comunidade'}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--tx2)',
          marginBottom: 14,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {[pessoa.headline, pessoa.company].filter(Boolean).join(' · ') || pessoa.area || '—'}
      </div>

      {pessoa.interest && (
        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-block',
              background: 'var(--bg)',
              color: 'var(--tx2)',
              borderRadius: 99,
              padding: '4px 8px',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {pessoa.interest}
          </span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {aceita ? (
        pessoa.linkedin_url ? (
          <a
            href={pessoa.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...botaoContorno, textDecoration: 'none' }}
          >
            Abrir LinkedIn
          </a>
        ) : (
          <button
            onClick={() => relacao && onDesfazer(relacao)}
            disabled={ocupado}
            style={{ ...botaoContorno, color: 'var(--tx2)' }}
          >
            Conectados
          </button>
        )
      ) : pendente ? (
        <span style={{ ...botaoContorno, color: 'var(--tx3)', cursor: 'default' }}>
          {relacao?.requester_id === souEu ? 'Pedido enviado' : 'Quer se conectar'}
        </span>
      ) : (
        <button onClick={onConectar} disabled={ocupado} style={botaoContorno}>
          {ocupado ? 'Enviando...' : 'Conectar'}
        </button>
      )}
    </div>
  )
}

const botaoContorno: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: '0.8px solid var(--line2)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--imperial)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
}

function LinhaVaga({ vaga, primeira }: { vaga: JobOpening; primeira: boolean }) {
  const conteudo = (
    <>
      <span
        style={{
          flex: 'none',
          width: 42,
          height: 42,
          borderRadius: 10,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={NAV_ICON.note} size={18} stroke="var(--bronze)" />
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {vaga.title}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginBottom: 5 }}>
          {vaga.company}
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: 11.5,
            color: 'var(--tx3)',
          }}
        >
          {vaga.location && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon d={NAV_ICON.explorar} size={13} stroke="var(--tx3)" />
              {vaga.location}
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon d={NAV_ICON.clock} size={13} stroke="var(--tx3)" />
            {diasAtras(vaga.posted_at)}
          </span>
        </span>
      </span>

      {vaga.contract_type && (
        <span
          style={{
            flex: 'none',
            background: 'var(--surface2)',
            color: 'var(--tx2)',
            borderRadius: 99,
            padding: '4px 9px',
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {vaga.contract_type}
        </span>
      )}

      <span
        style={{
          flex: 'none',
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '0.8px solid var(--line2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={NAV_ICON.arrow} size={13} stroke="var(--tx2)" />
      </span>
    </>
  )

  const estilo: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '17px 0',
    borderTop: primeira ? 'none' : '0.8px solid var(--line)',
    color: 'var(--tx)',
  }

  if (!vaga.apply_url) return <div style={estilo}>{conteudo}</div>

  return (
    <a
      href={vaga.apply_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('job_clicked', { vaga_id: vaga.id, titulo: vaga.title })}
      style={estilo}
    >
      {conteudo}
    </a>
  )
}

function CartaoWhatsApp() {
  return (
    <section
      style={{
        background: 'var(--imperial)',
        borderRadius: 'var(--r-card)',
        padding: '28px 26px 26px',
      }}
    >
      <span
        style={{
          display: 'flex',
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(241,236,228,.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 22,
        }}
      >
        <Icon d={NAV_ICON.comunidade} size={22} stroke="var(--champagne)" />
      </span>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          color: 'var(--champagne)',
          marginBottom: 14,
        }}
      >
        Conversas que continuam
      </div>

      <h2
        className="k-display"
        style={{ fontSize: 29, lineHeight: 1.15, color: 'var(--bg)', marginBottom: 14 }}
      >
        Entre na comunidade no WhatsApp
      </h2>

      <p
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: 'rgba(241,236,228,.78)',
          margin: '0 0 22px',
        }}
      >
        Troque experiências, compartilhe oportunidades e tire dúvidas com quem também está
        aplicando IA.
      </p>

      <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none' }}>
        {[
          'Networking com profissionais da área',
          'Vagas compartilhadas pela comunidade',
          'Discussões práticas e eventos',
        ].map((t) => (
          <li
            key={t}
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              fontSize: 12,
              color: 'rgba(241,236,228,.84)',
              marginBottom: 10,
            }}
          >
            <Icon
              d={NAV_ICON.check}
              size={13}
              width={2.4}
              stroke="var(--champagne)"
              style={{ flex: 'none' }}
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
            onClick={() => track('community_whatsapp_clicked', { origem: 'cartao' })}
            style={{
              background: 'var(--bg)',
              color: 'var(--imperial)',
              borderRadius: 10,
              padding: '13px 0',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            Acessar comunidade
            <Icon d={NAV_ICON.arrow} size={14} stroke="var(--imperial)" />
          </a>
          <p
            style={{
              fontSize: 10,
              color: 'rgba(241,236,228,.5)',
              margin: '12px 0 0',
              textAlign: 'center',
            }}
          >
            O link será aberto em uma nova aba.
          </p>
        </>
      ) : (
        <p style={{ fontSize: 12, color: 'rgba(241,236,228,.6)', margin: 0 }}>
          O link do grupo ainda não foi configurado.
        </p>
      )}
    </section>
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
    <div
      style={{
        border: '0.8px dashed var(--line2)',
        borderRadius: 12,
        padding: 24,
        maxWidth: 560,
      }}
    >
      <h3 className="k-display" style={{ fontSize: 18, marginBottom: 10 }}>
        Você ainda não está no diretório
      </h3>
      <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.65, margin: '0 0 18px' }}>
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
        style={{
          background: 'var(--imperial)',
          border: 'none',
          color: 'var(--bg)',
          borderRadius: 10,
          padding: '11px 22px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {busy ? 'Entrando...' : 'Entrar no diretório'}
      </button>
    </div>
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
    <section className="k-card" style={{ padding: '20px 20px 22px' }}>
      <Kicker style={{ fontSize: 11, letterSpacing: '1px', marginBottom: 16 }}>
        Como você aparece
      </Kicker>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(
          [
            ['Cargo', headline, setHeadline, 'Head de Operações'],
            ['Empresa', company, setCompany, 'Onde você trabalha'],
            ['Interesse', interest, setInterest, 'Agentes em atendimento'],
            ['LinkedIn', linkedin, setLinkedin, 'https://linkedin.com/in/...'],
          ] as const
        ).map(([rotulo, valor, set, placeholder]) => (
          <label key={rotulo} style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              {rotulo}
            </span>
            <input
              value={valor}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              style={{ ...inputStyle, fontSize: 13, padding: '9px 12px' }}
            />
          </label>
        ))}
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
        style={{
          width: '100%',
          marginTop: 18,
          background: 'var(--imperial)',
          border: 'none',
          color: 'var(--bg)',
          borderRadius: 10,
          padding: '11px 0',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {busy ? 'Salvando...' : 'Salvar'}
      </button>

      {aviso && (
        <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 10, textAlign: 'center' }}>
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
          fontSize: 12,
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

function diasAtras(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Há 1 dia'
  if (dias < 7) return `Há ${dias} dias`
  const semanas = Math.floor(dias / 7)
  return semanas === 1 ? 'Há 1 semana' : `Há ${semanas} semanas`
}
