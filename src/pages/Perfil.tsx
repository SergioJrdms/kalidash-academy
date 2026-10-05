import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'
import {
  issueCertificate,
  loadCertificates,
  loadLabs,
  loadSkills,
  type CertificateView,
  type LabView,
  type SkillProgress,
} from '../services/jornada'
import {
  Avatar,
  Banner,
  Icon,
  Kicker,
  Modal,
  PageLoading,
  ProgressBar,
  Spinner,
  inputStyle,
} from '../components/ui'
import PersonalizationModal from '../components/PersonalizationModal'

const AI_LEAGUE_URL = import.meta.env.VITE_AI_LEAGUE_URL as string | undefined

/** Rótulo de nível a partir do progresso, como no design. */
function nivelDaCompetencia(p: number): string {
  if (p >= 70) return 'Avançado'
  if (p >= 40) return 'Intermediário'
  if (p > 0) return 'Em desenvolvimento'
  return 'Iniciante'
}

export default function Perfil() {
  const { profile, isPaid, session, refreshProfile } = useAuth()
  const { courses, loading } = useCatalog()
  const userId = session?.user.id ?? null

  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [labs, setLabs] = useState<LabView[]>([])
  const [certs, setCerts] = useState<CertificateView[]>([])
  const [extra, setExtra] = useState(true)
  const [showPers, setShowPers] = useState(false)
  const [showConta, setShowConta] = useState(false)
  const [caseAberto, setCaseAberto] = useState<LabView | null>(null)

  const carregar = useCallback(async () => {
    if (!userId) return
    const [s, l, c] = await Promise.all([
      loadSkills(userId).catch(() => [] as SkillProgress[]),
      loadLabs(userId).catch(() => [] as LabView[]),
      loadCertificates(userId).catch(() => [] as CertificateView[]),
    ])
    setSkills(s)
    setLabs(l)
    setCerts(c)
    setExtra(false)
  }, [userId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /**
   * Cursos 100% concluídos que emitem certificado e ainda não têm o seu.
   * A emissão é pedida ao banco, que confere a conclusão do seu lado.
   */
  useEffect(() => {
    if (loading || extra || !userId) return
    const pendentes = courses.filter(
      (c) => c.has_certificate && c.progress === 100 && !certs.some((x) => x.course_id === c.id),
    )
    if (pendentes.length === 0) return

    let ativo = true
    void Promise.all(pendentes.map((c) => issueCertificate(c.id))).then(async (r) => {
      if (!ativo || !r.some(Boolean)) return
      setCerts(await loadCertificates(userId))
    })
    return () => {
      ativo = false
    }
  }, [courses, certs, loading, extra, userId])

  const cases = useMemo(
    () => labs.filter((l) => l.is_case && l.submission?.completed_at),
    [labs],
  )
  const labsFeitos = useMemo(
    () => labs.filter((l) => !l.is_case && l.submission?.completed_at),
    [labs],
  )

  const numeros = useMemo(() => {
    const aulas = courses.reduce((a, c) => a + c.completedCount, 0)
    const cursosFeitos = courses.filter((c) => c.lessonCount > 0 && c.progress === 100).length
    return [
      { n: aulas, l: aulas === 1 ? 'aula concluída' : 'aulas concluídas' },
      { n: cursosFeitos, l: cursosFeitos === 1 ? 'curso concluído' : 'cursos concluídos' },
      { n: labsFeitos.length, l: labsFeitos.length === 1 ? 'Lab concluído' : 'Labs concluídos' },
      { n: cases.length, l: cases.length === 1 ? 'case concluído' : 'cases concluídos' },
    ]
  }, [courses, labsFeitos, cases])

  /** Atividade recente montada a partir do que já existe no banco. */
  const atividade = useMemo(() => {
    const itens: { quando: string; texto: string }[] = []

    for (const c of certs) {
      itens.push({ quando: c.issued_at, texto: `Você concluiu ${c.course_title}` })
    }
    for (const l of [...labsFeitos, ...cases]) {
      itens.push({
        quando: l.submission!.completed_at!,
        texto: `Você aplicou ${l.title}`,
      })
    }
    for (const c of courses) {
      if (c.lastViewedAt) {
        itens.push({ quando: c.lastViewedAt, texto: `Você avançou em ${c.title}` })
      }
    }

    return itens.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 6)
  }, [certs, labsFeitos, cases, courses])

  if (loading || extra) return <PageLoading />

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1280 }}>
      {/* ---------- cabeçalho ---------- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 36,
        }}
      >
        <Avatar name={initials(profile?.full_name ?? 'U')} size={72} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 className="k-display" style={{ fontSize: 34, lineHeight: 1.1, marginBottom: 8 }}>
            {profile?.full_name || 'Seu perfil'}
          </h1>
          <div style={{ fontSize: 14.5, color: 'var(--bronze)', marginBottom: 10 }}>
            {[profile?.headline, profile?.area, profile?.company].filter(Boolean).join(' · ') ||
              'Complete seu perfil'}
          </div>
          <p style={{ fontSize: 15, color: 'var(--tx2)', margin: 0 }}>
            Seu histórico de aprendizagem, aplicação e competências.
          </p>
        </div>
        <button
          onClick={() => setShowConta(true)}
          style={{
            flex: 'none',
            background: 'transparent',
            border: '0.8px solid var(--line2)',
            color: 'var(--tx)',
            borderRadius: 'var(--r-control)',
            padding: '11px 20px',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Editar perfil
        </button>
      </div>

      {/* ---------- números ---------- */}
      <div
        style={{
          display: 'flex',
          gap: 48,
          flexWrap: 'wrap',
          paddingBottom: 32,
          marginBottom: 36,
          borderBottom: '1px solid var(--line)',
        }}
      >
        {numeros.map((x) => (
          <div key={x.l}>
            <div className="k-display" style={{ fontSize: 34, lineHeight: 1 }}>
              {x.n}
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 7 }}>{x.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 20 }}>
        {/* ---------- coluna principal ---------- */}
        <div style={{ minWidth: 0 }}>
          <section style={{ marginBottom: 40 }}>
            <Kicker style={{ marginBottom: 18 }}>Competências</Kicker>
            {skills.length === 0 ? (
              <Vazio>As competências aparecem conforme você avança nas trilhas.</Vazio>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {skills.map((s) => (
                  <div key={s.id}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>{s.name}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--bronze)' }}>
                        {nivelDaCompetencia(s.progress)}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--tx2)', width: 40, textAlign: 'right' }}>
                        {s.progress}%
                      </span>
                    </div>
                    <ProgressBar percent={s.progress} height={5} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ marginBottom: 40 }}>
            <Kicker style={{ marginBottom: 18 }}>Certificados</Kicker>
            {certs.length === 0 ? (
              <Vazio>
                Conclua um curso que emite certificado e ele aparece aqui, com o código de
                verificação.
              </Vazio>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {certs.map((c) => (
                  <div
                    key={c.id}
                    className="k-card"
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18 }}
                  >
                    <span
                      style={{
                        flex: 'none',
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: 'var(--bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon d={NAV_ICON.check} size={16} width={2.4} stroke="var(--imperial)" />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>
                        {c.course_title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                        {c.course_kind === 'trilha' ? 'Trilha' : 'Curso'} · Kalidash Academy ·
                        Concluído em{' '}
                        {new Date(c.issued_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <span
                      style={{
                        flex: 'none',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: 11.5,
                        color: 'var(--tx3)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {c.code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <Kicker style={{ marginBottom: 18 }}>Cases</Kicker>
            {cases.length === 0 ? (
              <Vazio>
                Os cases que você concluir em <Link to="/aplicar" style={{ color: 'var(--bronze)' }}>Aplicar</Link>{' '}
                ficam registrados aqui.
              </Vazio>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cases.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setCaseAberto(l)}
                    className="k-card k-hoverable"
                    style={{
                      padding: 20,
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: 'var(--surface)',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        background: 'rgba(40,24,59,.07)',
                        color: 'var(--imperial)',
                        borderRadius: 999,
                        padding: '4px 11px',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        marginBottom: 11,
                      }}
                    >
                      Case
                    </span>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 7 }}>
                      {l.title}
                    </span>
                    {l.submission?.content && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14,
                          color: 'var(--tx2)',
                          lineHeight: 1.6,
                          marginBottom: 10,
                        }}
                      >
                        {l.submission.content.length > 220
                          ? `${l.submission.content.slice(0, 220)}…`
                          : l.submission.content}
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--bronze)' }}>Ver case →</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ---------- coluna lateral ---------- */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <section className="k-card" style={{ padding: 22 }}>
            <Kicker style={{ marginBottom: 16 }}>Atividade recente</Kicker>
            {atividade.length === 0 ? (
              <p style={{ fontSize: 13.5, color: 'var(--tx2)', margin: 0, lineHeight: 1.6 }}>
                Nada por aqui ainda. Comece por{' '}
                <Link to="/jornada" style={{ color: 'var(--bronze)' }}>
                  Minha Jornada
                </Link>
                .
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {atividade.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 11 }}>
                    <span
                      style={{
                        flex: 'none',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--champagne)',
                        marginTop: 6,
                      }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, lineHeight: 1.45 }}>
                        {a.texto}
                      </span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>
                        {tempoRelativo(a.quando)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="k-card" style={{ padding: 22 }}>
            <Kicker style={{ marginBottom: 16 }}>Configurações da conta</Kicker>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <LinhaConfig label="Dados da conta" onClick={() => setShowConta(true)} />
              <LinhaConfig label="Preferências de conteúdo" onClick={() => setShowPers(true)} />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '13px 0 4px',
                }}
              >
                <span style={{ flex: 1, fontSize: 14 }}>Acesso</span>
                <span style={{ fontSize: 12.5, color: 'var(--tx2)' }}>
                  {isPaid ? 'Premium liberado' : 'Gratuito'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.55 }}>
                {profile?.email}
              </div>
            </div>
          </section>

          <section className="k-card" style={{ padding: 22 }}>
            <Kicker style={{ marginBottom: 12 }}>AI League</Kicker>
            <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Continue a conversa com outros gestores que estão aplicando isso na operação.
            </p>
            {AI_LEAGUE_URL ? (
              <a
                href={AI_LEAGUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('community_whatsapp_clicked', { origem: 'perfil' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  background: 'transparent',
                  border: '0.8px solid var(--line2)',
                  color: 'var(--tx)',
                  borderRadius: 'var(--r-control)',
                  padding: '11px 0',
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                Abrir WhatsApp
                <Icon d={NAV_ICON.arrow} size={15} stroke="var(--tx2)" />
              </a>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>Link em configuração</span>
            )}
          </section>
        </aside>
      </div>

      {showPers && (
        <PersonalizationModal
          onClose={() => setShowPers(false)}
          onSaved={() => void refreshProfile()}
        />
      )}

      {showConta && (
        <ContaModal
          onClose={() => setShowConta(false)}
          onSaved={() => void refreshProfile()}
        />
      )}

      {caseAberto && (
        <Modal onClose={() => setCaseAberto(null)} maxWidth={640}>
          <Kicker style={{ marginBottom: 12 }}>Case</Kicker>
          <h2 className="k-display" style={{ fontSize: 25, lineHeight: 1.22, marginBottom: 10 }}>
            {caseAberto.title}
          </h2>
          <div style={{ fontSize: 12.5, color: 'var(--tx3)', marginBottom: 22 }}>
            Concluído em{' '}
            {new Date(caseAberto.submission!.completed_at!).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
            {caseAberto.submission?.content}
          </p>
        </Modal>
      )}
    </div>
  )
}

function LinhaConfig({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--line)',
        padding: '13px 0',
        fontSize: 14,
        color: 'var(--tx)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <Icon d="M9 6l6 6-6 6" size={15} stroke="var(--tx3)" />
    </button>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 14,
        color: 'var(--tx2)',
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 520,
      }}
    >
      {children}
    </p>
  )
}

/** Nome, empresa e cargo. O e-mail e o acesso não se editam aqui. */
function ContaModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { profile, updateProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setBusy(true)
    setErro(null)
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        company: company.trim() || null,
        headline: headline.trim() || null,
      })
      onSaved()
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não conseguimos salvar agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={460}>
      <h2 className="k-display" style={{ fontSize: 23, marginBottom: 20 }}>
        Dados da conta
      </h2>

      {erro && (
        <div style={{ marginBottom: 16 }}>
          <Banner kind="error">{erro}</Banner>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
        <label>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            Nome
          </span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
        </label>
        <label>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            Cargo
          </span>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Head de Operações"
            style={inputStyle}
          />
        </label>
        <label>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
            Empresa
          </span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} style={inputStyle} />
        </label>
        <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>
          E-mail: {profile?.email}. Para trocar o e-mail ou a senha, use "Esqueci minha senha" na
          tela de login.
        </div>
      </div>

      <button
        onClick={() => void salvar()}
        disabled={busy}
        style={{
          width: '100%',
          background: 'var(--imperial)',
          border: 'none',
          color: 'var(--bg)',
          borderRadius: 'var(--r-control)',
          padding: '12px 0',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 9,
        }}
      >
        {busy && <Spinner size={13} color="var(--bg)" />}
        Salvar
      </button>
    </Modal>
  )
}

function tempoRelativo(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return '1 dia atrás'
  if (dias < 30) return `${dias} dias atrás`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? '1 mês atrás' : `${meses} meses atrás`
}
