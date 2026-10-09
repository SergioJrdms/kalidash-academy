import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'
import {
  loadCommunityStats,
  loadDirectory,
  saveCommunityProfile,
  type DirectoryPerson,
} from '../services/comunidade'
import { Banner, Icon, Kicker, PageLoading, inputStyle } from '../components/ui'

const WHATSAPP_URL = import.meta.env.VITE_AI_LEAGUE_URL as string | undefined

/** As três cores de avatar do desenho, em rodízio pela posição na lista. */
const CORES_AVATAR = ['var(--aubergine)', 'var(--bronze)', 'var(--terracotta)']

export default function Comunidade() {
  const { session, profile, refreshProfile } = useAuth()
  const userId = session?.user.id ?? null

  const [pessoas, setPessoas] = useState<DirectoryPerson[]>([])
  const [stats, setStats] = useState({ members: 0, jobs: 0 })
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErro(null)
    try {
      const [p, s] = await Promise.all([loadDirectory(), loadCommunityStats()])
      setPessoas(p)
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
  const comLinkedin = useMemo(
    () => pessoas.filter((p) => p.linkedin_url).length,
    [pessoas],
  )







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
          { icone: NAV_ICON.aplicar, n: comLinkedin, l: 'perfis com LinkedIn' },
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
        {/* ---------------- networking ---------------- */}
        <section className="k-card" style={{ padding: '22px 24px', minWidth: 0 }}>
          <CabecaSecao
            kicker="Networking"
            titulo="Pessoas para você conhecer"
            link={noDiretorio && sugestoes.length > 3 ? 'Ver todos' : undefined}
          />

          {sugestoes.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
              {noDiretorio
                ? 'Você é a primeira pessoa no diretório. Conforme a turma for entrando, os perfis aparecem aqui.'
                : 'Ninguém entrou no diretório ainda. Entre ao lado e as próximas pessoas encontram você aqui.'}
            </p>
          ) : (
            <div className="k-pessoas-grid">
              {sugestoes.slice(0, 6).map((p, i) => (
                <CartaoPessoa key={p.id} pessoa={p} indice={i} />
              ))}
            </div>
          )}
        </section>

        {/* ---------------- como você aparece ---------------- */}
        <aside style={{ minWidth: 0 }}>
          <PerfilNaComunidade
            userId={userId}
            noDiretorio={noDiretorio}
            onSalvo={async () => {
              await refreshProfile()
              await load()
            }}
          />
        </aside>
      </div>

      {/* ---------------- faixa do WhatsApp ---------------- */}
      <div style={{ marginTop: 20 }}>
        <CartaoWhatsApp />
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

/**
 * A faixa do WhatsApp, agora ocupando a largura inteira embaixo.
 *
 * Nada do visual mudou — mesmo roxo, mesmo ícone em caixa translúcida,
 * mesmo Playfair 29, mesmos bullets com check e o mesmo botão creme. O
 * que mudou foi o arranjo: em coluna estreita isso virava um bloco
 * altíssimo, então os três grupos ficam lado a lado.
 */
function CartaoWhatsApp() {
  return (
    <section
      style={{
        background: 'var(--imperial)',
        borderRadius: 'var(--r-card)',
        padding: '28px 32px',
      }}
    >
      <div className="k-whats-faixa">
        {/* ---- marca e título ---- */}
        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
          <span
            style={{
              display: 'flex',
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'rgba(241,236,228,.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
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
              marginBottom: 12,
            }}
          >
            Conversas que continuam
          </div>

          <h2
            className="k-display"
            style={{ fontSize: 29, lineHeight: 1.15, color: 'var(--bg)', marginBottom: 12 }}
          >
            Entre na comunidade no WhatsApp
          </h2>

          <p
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              color: 'rgba(241,236,228,.78)',
              margin: 0,
              maxWidth: 420,
            }}
          >
            Troque experiências, compartilhe oportunidades e tire dúvidas com quem também
            está aplicando IA.
          </p>
        </div>

        {/* ---- o que se encontra lá ---- */}
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            flex: '0 1 280px',
            alignSelf: 'center',
          }}
        >
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

        {/* ---- ação ---- */}
        <div style={{ flex: '0 0 288px', alignSelf: 'center' }}>
          {WHATSAPP_URL ? (
            <>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('community_whatsapp_clicked', { origem: 'faixa' })}
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
        </div>
      </div>
    </section>
  )
}

/**
 * "Como você aparece", ao lado do Networking.
 *
 * Dois estados num cartão só: quem ainda não entrou no diretório vê o
 * convite; quem já entrou edita o que os outros veem. Antes o convite
 * era uma faixa dentro do Networking e o editor ficava na lateral — com
 * a reordenação, os dois pertencem ao mesmo lugar.
 */
function PerfilNaComunidade({
  userId,
  noDiretorio,
  onSalvo,
}: {
  userId: string | null
  noDiretorio: boolean
  onSalvo: () => Promise<void>
}) {
  const { profile } = useAuth()
  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [interest, setInterest] = useState(profile?.interest ?? '')
  const [linkedin, setLinkedin] = useState(profile?.linkedin_url ?? '')
  const [busy, setBusy] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  async function entrar() {
    if (!userId) return
    setBusy(true)
    try {
      await saveCommunityProfile(userId, { community_opt_in: true })
      track('community_opt_in', {})
      await onSalvo()
    } finally {
      setBusy(false)
    }
  }

  if (!noDiretorio) {
    return (
      <section className="k-card" style={{ padding: '22px 24px' }}>
        <Kicker style={{ fontSize: 11, letterSpacing: '1px', marginBottom: 10 }}>
          Como você aparece
        </Kicker>
        <h2 className="k-display" style={{ fontSize: 22, marginBottom: 14 }}>
          Você ainda não está aqui
        </h2>
        <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.65, margin: '0 0 20px' }}>
          O networking é opcional. Ao entrar, as outras pessoas da Academy veem seu nome,
          cargo, empresa e um interesse — nunca o seu e-mail. Seu LinkedIn aparece no botão
          do seu cartão.
        </p>
        <button
          onClick={() => void entrar()}
          disabled={busy}
          style={{
            width: '100%',
            background: 'var(--imperial)',
            border: 'none',
            color: 'var(--bg)',
            borderRadius: 10,
            padding: '12px 0',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {busy ? 'Entrando...' : 'Entrar no diretório'}
        </button>
      </section>
    )
  }

  return (
    <section className="k-card" style={{ padding: '22px 24px' }}>
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

