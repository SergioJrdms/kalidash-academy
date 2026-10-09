import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'
import {
  loadCommunityStats,
  loadDirectory,
  loadJobs,
  saveCommunityProfile,
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
  const [vagas, setVagas] = useState<JobOpening[]>([])
  const [stats, setStats] = useState({ members: 0, jobs: 0 })
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErro(null)
    try {
      const [p, v, s] = await Promise.all([loadDirectory(), loadJobs(), loadCommunityStats()])
      setPessoas(p)
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

  const sugestoes = useMemo(() => pessoas.filter((p) => p.id !== userId), [pessoas, userId])

  /** Quem dá para alcançar: todo mundo do diretório que não é você. */
  const disponiveis = sugestoes.length







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

            {/* O convite vira uma faixa, nao substitui a grade: antes, quem
                ainda nao tinha entrado no diretorio nao via ninguem. */}
            {!noDiretorio && (
              <ConviteDiretorio
                userId={userId}
                onEntrou={async () => {
                  await refreshProfile()
                  await load()
                }}
              />
            )}

            {sugestoes.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
                {noDiretorio
                  ? 'Você é a primeira pessoa no diretório. Conforme a turma for entrando, os perfis aparecem aqui.'
                  : 'Ninguém entrou no diretório ainda. Seja o primeiro e as próximas pessoas encontram você aqui.'}
              </p>
            ) : (
              <div className="k-pessoas-grid">
                {sugestoes.slice(0, 6).map((p, i) => (
                  <CartaoPessoa key={p.id} pessoa={p} indice={i} />
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
  url,
}: {
  nome: string
  indice: number
  tamanho?: number
  url?: string | null
}) {
  return (
    <span
      style={{
        flex: 'none',
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: url
          ? `center/cover no-repeat url(${JSON.stringify(url)})`
          : CORES_AVATAR[indice % CORES_AVATAR.length],
        color: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: tamanho < 36 ? 11 : 12,
        fontWeight: 600,
      }}
    >
      {url ? '' : initials(nome)}
    </span>
  )
}

function CartaoPessoa({ pessoa, indice }: { pessoa: DirectoryPerson; indice: number }) {
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
        <AvatarRedondo
          nome={pessoa.full_name ?? '?'}
          indice={indice}
          url={pessoa.avatar_url}
        />
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

      {pessoa.linkedin_url ? (
        <a
          href={pessoa.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('linkedin_clicked', { pessoa_id: pessoa.id })}
          style={{ ...botaoContorno, textDecoration: 'none' }}
        >
          <LinkedInMark />
          Ver LinkedIn
        </a>
      ) : (
        <span style={{ ...botaoContorno, color: 'var(--tx3)', cursor: 'default' }}>
          Sem LinkedIn
        </span>
      )}
    </div>
  )
}

/** O "in" do LinkedIn, na cor da marca. */
function LinkedInMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 013.37-1.85c3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0"
      />
    </svg>
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
  gap: 8,
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

/**
 * Faixa de convite. Fica acima da grade, sem escondê-la: quem ainda não
 * entrou no diretório continua vendo quem já entrou.
 */
function ConviteDiretorio({
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
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        background: 'var(--bg)',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 18,
      }}
    >
      <Icon d={NAV_ICON.perfil} size={18} stroke="var(--bronze)" style={{ flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 220, fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>
        Você ainda não aparece aqui. Ao entrar, as outras pessoas veem seu nome, cargo,
        empresa e um interesse — nunca o seu e-mail.
      </span>
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
          flex: 'none',
          background: 'var(--imperial)',
          border: 'none',
          color: 'var(--bg)',
          borderRadius: 8,
          padding: '9px 16px',
          fontSize: 12,
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
