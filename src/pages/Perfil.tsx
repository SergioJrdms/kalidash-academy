import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCatalog } from '../hooks/useCatalog'
import { initials } from '../lib/format'
import { NAV_ICON } from '../lib/icons'
import {
  issueCertificate,
  loadCertificates,
  loadJourney,
  loadLabs,
  loadSkills,
  type CertificateView,
  type JourneyView,
  type LabView,
  type SkillProgress,
} from '../services/jornada'
import { Banner, Icon, Kicker, Modal, PageLoading, Spinner, inputStyle } from '../components/ui'
import PersonalizationModal from '../components/PersonalizationModal'

const VERDE = '#16a34a'

/** Rótulo de nível a partir do progresso, como no desenho. */
function nivelDaCompetencia(p: number): string {
  if (p >= 70) return 'Avançado'
  if (p >= 40) return 'Intermediário'
  if (p > 0) return 'Em desenvolvimento'
  return 'Iniciante'
}

export default function Perfil() {
  const { profile, session, refreshProfile, resetPassword } = useAuth()
  const { courses, loading } = useCatalog()
  const userId = session?.user.id ?? null

  const [skills, setSkills] = useState<SkillProgress[]>([])
  const [labs, setLabs] = useState<LabView[]>([])
  const [certs, setCerts] = useState<CertificateView[]>([])
  const [journey, setJourney] = useState<JourneyView | null>(null)
  const [extra, setExtra] = useState(true)

  const [showPers, setShowPers] = useState(false)
  const [showConta, setShowConta] = useState(false)
  const [caseAberto, setCaseAberto] = useState<LabView | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!userId) return
    const [s, l, c, j] = await Promise.all([
      loadSkills(userId).catch(() => [] as SkillProgress[]),
      loadLabs(userId).catch(() => [] as LabView[]),
      loadCertificates(userId).catch(() => [] as CertificateView[]),
      loadJourney(userId).catch(() => null),
    ])
    setSkills(s)
    setLabs(l)
    setCerts(c)
    setJourney(j)
    setExtra(false)
  }, [userId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /** Cursos 100% que emitem certificado e ainda não têm o seu. */
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
      { icone: NAV_ICON.play, n: aulas, l: aulas === 1 ? 'aula concluída' : 'aulas concluídas' },
      {
        icone: NAV_ICON.book,
        n: cursosFeitos,
        l: cursosFeitos === 1 ? 'curso concluído' : 'cursos concluídos',
      },
      {
        icone: NAV_ICON.spark,
        n: labsFeitos.length,
        l: labsFeitos.length === 1 ? 'Lab concluído' : 'Labs concluídos',
      },
      {
        icone: NAV_ICON.note,
        n: cases.length,
        l: cases.length === 1 ? 'Case concluído' : 'Cases concluídos',
      },
    ]
  }, [courses, labsFeitos, cases])

  /** Atividade recente, montada do que já existe no banco. */
  const atividade = useMemo(() => {
    const itens: { quando: string; prefixo: string; destaque: string; icone: string }[] = []

    for (const c of certs) {
      itens.push({
        quando: c.issued_at,
        prefixo: c.course_kind === 'trilha' ? 'Concluiu a trilha ' : 'Concluiu o curso ',
        destaque: c.course_title,
        icone: NAV_ICON.certificate,
      })
    }
    for (const l of labsFeitos) {
      itens.push({
        quando: l.submission!.completed_at!,
        prefixo: 'Finalizou o Lab: ',
        destaque: l.title,
        icone: NAV_ICON.spark,
      })
    }
    for (const l of cases) {
      itens.push({
        quando: l.submission!.completed_at!,
        prefixo: 'Concluiu o case: ',
        destaque: l.title,
        icone: NAV_ICON.note,
      })
    }
    for (const c of courses) {
      if (c.lastViewedAt && c.progress < 100) {
        itens.push({
          quando: c.lastViewedAt,
          prefixo: 'Avançou em ',
          destaque: c.title,
          icone: NAV_ICON.play,
        })
      }
    }

    return itens.sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 5)
  }, [certs, labsFeitos, cases, courses])

  async function compartilhar() {
    const aulas = numeros[0].n
    const texto = `${profile?.full_name ?? 'Eu'} na Kalidash Academy — ${aulas} ${
      aulas === 1 ? 'aula concluída' : 'aulas concluídas'
    }, ${labsFeitos.length} Labs aplicados e ${certs.length} ${
      certs.length === 1 ? 'certificado' : 'certificados'
    }. ${window.location.origin}`

    try {
      if (navigator.share) await navigator.share({ text: texto })
      else {
        await navigator.clipboard.writeText(texto)
        setAviso('Resumo do perfil copiado.')
      }
    } catch {
      /* a pessoa cancelou o compartilhamento */
    }
  }

  if (loading || extra) return <PageLoading />

  const linhaTrilha = [journey?.title, profile?.level].filter(Boolean).join(' · ')

  return (
    <div className="k-page" style={{ padding: '36px 36px 90px', maxWidth: 1280 }}>
      {aviso && (
        <div style={{ marginBottom: 18 }}>
          <Banner kind="ok">{aviso}</Banner>
        </div>
      )}

      {/* ---------------- cabeçalho ---------------- */}
      <section className="k-card" style={{ padding: '28px 32px', marginBottom: 20 }}>
        <div className="k-stack-mobile" style={{ display: 'flex', gap: 28 }}>
          <span
            style={{
              flex: 'none',
              width: 112,
              height: 112,
              borderRadius: '50%',
              border: '2.4px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              color: 'var(--tx)',
            }}
          >
            {initials(profile?.full_name ?? 'U')}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="k-display k-page-title is-52" style={{ margin: '0 0 10px' }}>
              {profile?.full_name || 'Seu perfil'}
            </h1>

            {linhaTrilha && (
              <div style={{ fontSize: 16, color: 'var(--tx)', marginBottom: 8 }}>
                {linhaTrilha}
              </div>
            )}

            <p style={{ fontSize: 14, color: 'var(--tx2)', margin: '0 0 20px' }}>
              Seu histórico de aprendizagem, aplicação e competências.
            </p>

            <button
              onClick={() => void compartilhar()}
              className="k-hoverable"
              style={{
                background: 'transparent',
                border: '0.8px solid var(--line2)',
                borderRadius: 99,
                padding: '9px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--tx)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              <Icon d={NAV_ICON.aplicar} size={14} stroke="var(--tx2)" />
              Compartilhar perfil
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- números ---------------- */}
      <section
        className="k-card"
        style={{ padding: '22px 32px', display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}
      >
        {numeros.map((x) => (
          <div
            key={x.l}
            style={{ flex: '1 1 180px', display: 'flex', alignItems: 'flex-start', gap: 15 }}
          >
            <Icon d={x.icone} size={18} stroke="var(--bronze)" style={{ marginTop: 6 }} />
            <div>
              <div className="k-display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
                {x.n}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 9 }}>{x.l}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ---------------- grade 2x2 ---------------- */}
      <div className="k-perfil-grid">
        {/* competências */}
        <section className="k-card" style={{ padding: '22px 24px' }}>
          <CabecaCartao titulo="Competências" para="/jornada" />
          {skills.length === 0 ? (
            <Vazio>As competências aparecem conforme você avança nas trilhas.</Vazio>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {skills.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                  {s.icon && (
                    <Icon d={s.icon} size={17} stroke="var(--tx2)" style={{ marginTop: 2 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                      <span
                        style={{
                          background: 'rgba(168,138,88,.06)',
                          color: 'var(--bronze)',
                          borderRadius: 6,
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {nivelDaCompetencia(s.progress)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Barra percent={s.progress} />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--tx2)',
                          width: 32,
                          textAlign: 'right',
                        }}
                      >
                        {s.progress}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* certificados */}
        <section className="k-card" style={{ padding: '22px 24px' }}>
          <CabecaCartao titulo="Certificados" para="/explorar" />
          {certs.length === 0 ? (
            <Vazio>
              Conclua um curso que emite certificado e ele aparece aqui, com o código de
              verificação.
            </Vazio>
          ) : (
            <div>
              {certs.map((c, i) => (
                <LinhaCertificado key={c.id} cert={c} primeira={i === 0} />
              ))}
            </div>
          )}
        </section>

        {/* cases */}
        <section className="k-card" style={{ padding: '22px 24px' }}>
          <CabecaCartao titulo="Cases" para="/aplicar" />
          {cases.length === 0 ? (
            <Vazio>
              Os cases que você concluir em{' '}
              <Link to="/aplicar" style={{ color: 'var(--bronze)' }}>
                Aplicar
              </Link>{' '}
              ficam registrados aqui.
            </Vazio>
          ) : (
            <div className="k-cases-grid">
              {cases.map((l) => (
                <CelulaCase key={l.id} lab={l} onAbrir={() => setCaseAberto(l)} />
              ))}
            </div>
          )}
        </section>

        {/* atividade recente */}
        <section className="k-card" style={{ padding: '22px 24px' }}>
          <CabecaCartao titulo="Atividade recente" para="/jornada" />
          {atividade.length === 0 ? (
            <Vazio>
              Nada por aqui ainda. Comece por{' '}
              <Link to="/jornada" style={{ color: 'var(--bronze)' }}>
                Minha Jornada
              </Link>
              .
            </Vazio>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* o fio da linha do tempo, atrás dos ícones */}
              <span
                style={{
                  position: 'absolute',
                  left: 15.5,
                  top: 18,
                  bottom: 18,
                  width: 1,
                  background: 'var(--line)',
                }}
              />
              {atividade.map((a, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '10px 0',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon d={a.icone} size={15} stroke="var(--bronze)" />
                  </span>
                  <span style={{ minWidth: 0, paddingTop: 2 }}>
                    <span style={{ display: 'block', fontSize: 13, lineHeight: 1.45 }}>
                      {a.prefixo}
                      <strong style={{ fontWeight: 600 }}>{a.destaque}</strong>
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: 'var(--tx3)',
                        marginTop: 4,
                      }}
                    >
                      {tempoRelativo(a.quando)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------------- configurações ---------------- */}
      <section className="k-card" style={{ padding: '22px 24px', marginTop: 20 }}>
        <Kicker style={{ fontSize: 11, letterSpacing: '1px', marginBottom: 18 }}>
          Configurações da conta
        </Kicker>
        <div className="k-config-grid">
          <ItemConfig
            icone={NAV_ICON.perfil}
            titulo="Dados da conta"
            texto="Gerencie suas informações pessoais e profissionais."
            onClick={() => setShowConta(true)}
          />
          <ItemConfig
            icone={NAV_ICON.explorar}
            titulo="Preferências"
            texto="Personalize sua experiência na plataforma."
            onClick={() => setShowPers(true)}
          />
          <ItemConfig
            icone={NAV_ICON.admin}
            titulo="Segurança"
            texto="Gerencie sua senha e as configurações de acesso."
            onClick={async () => {
              if (!profile?.email) return
              try {
                await resetPassword(profile.email)
                setAviso('Enviamos um link para você criar uma nova senha.')
              } catch {
                setAviso('Não foi possível enviar o link agora.')
              }
            }}
          />
        </div>
      </section>

      {showPers && (
        <PersonalizationModal
          onClose={() => setShowPers(false)}
          onSaved={() => void refreshProfile()}
        />
      )}

      {showConta && (
        <ContaModal onClose={() => setShowConta(false)} onSaved={() => void refreshProfile()} />
      )}

      {caseAberto && (
        <Modal onClose={() => setCaseAberto(null)} maxWidth={640}>
          <Kicker style={{ letterSpacing: '1px', marginBottom: 12 }}>Case</Kicker>
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

// ---------------------------------------------------------------------

function CabecaCartao({ titulo, para }: { titulo: string; para: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 18,
      }}
    >
      <Kicker style={{ fontSize: 11, letterSpacing: '1px' }}>{titulo}</Kicker>
      <Link
        to={para}
        style={{
          fontSize: 12.5,
          color: 'var(--bronze)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        Ver todas
        <Icon d={NAV_ICON.arrow} size={13} stroke="var(--bronze)" />
      </Link>
    </div>
  )
}

function Barra({ percent }: { percent: number }) {
  return (
    <div
      style={{
        flex: 1,
        height: 5,
        borderRadius: 999,
        background: 'var(--line)',
        overflow: 'hidden',
      }}
    >
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

function LinhaCertificado({ cert, primeira }: { cert: CertificateView; primeira: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 0',
        borderTop: primeira ? 'none' : '0.8px solid var(--line)',
      }}
    >
      <span
        style={{
          flex: 'none',
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={NAV_ICON.certificate} size={20} stroke="var(--bronze)" />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="k-display" style={{ fontSize: 15, marginBottom: 4 }}>
          {cert.course_title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
          {cert.course_kind === 'trilha' ? 'Trilha' : 'Curso'} · Kalidash Academy
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>
          Concluído em{' '}
          {new Date(cert.issued_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>

      <div style={{ flex: 'none', position: 'relative', width: 72 }}>
        <span
          style={{
            display: 'flex',
            width: 72,
            height: 52,
            borderRadius: 8,
            background: 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 9.5,
              color: 'var(--champagne)',
              letterSpacing: '0.06em',
            }}
          >
            {cert.code}
          </span>
        </span>
        <span
          style={{
            position: 'absolute',
            left: -6,
            bottom: -11,
            background: 'rgba(34,197,94,.1)',
            color: VERDE,
            borderRadius: 99,
            padding: '3px 8px',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          Concluído
        </span>
      </div>
    </div>
  )
}

function CelulaCase({ lab, onAbrir }: { lab: LabView; onAbrir: () => void }) {
  return (
    <button
      onClick={onAbrir}
      style={{
        background: 'var(--surface2)',
        border: '0.8px solid var(--line)',
        borderRadius: 12,
        padding: 0,
        overflow: 'hidden',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span
        style={{
          display: 'flex',
          height: 110,
          background: lab.image_url
            ? `center/cover no-repeat url(${JSON.stringify(lab.image_url)})`
            : 'linear-gradient(142deg,#2f1f44 0%,#28183b 45%,#1a1026 100%)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!lab.image_url && (
          <Icon
            d={NAV_ICON.note}
            size={26}
            stroke="var(--champagne)"
            width={1.1}
            style={{ opacity: 0.45 }}
          />
        )}
      </span>

      <span style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--tx3)',
            marginBottom: 7,
          }}
        >
          CASE
        </span>
        <span
          className="k-display"
          style={{ display: 'block', fontSize: 15, lineHeight: 1.3, marginBottom: 8 }}
        >
          {lab.title}
        </span>
        {lab.submission?.content && (
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--tx2)',
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            {lab.submission.content.length > 90
              ? `${lab.submission.content.slice(0, 90)}…`
              : lab.submission.content}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--imperial)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          Ver case
          <Icon d={NAV_ICON.arrow} size={13} stroke="var(--imperial)" />
        </span>
      </span>
    </button>
  )
}

function ItemConfig({
  icone,
  titulo,
  texto,
  onClick,
}: {
  icone: string
  titulo: string
  texto: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="k-row"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        background: 'transparent',
        border: 'none',
        borderRadius: 10,
        padding: '16px 12px',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--tx)',
      }}
    >
      <span
        style={{
          flex: 'none',
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon d={icone} size={18} stroke="var(--bronze)" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
          {titulo}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', lineHeight: 1.5 }}>
          {texto}
        </span>
      </span>
    </button>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.65, margin: 0 }}>{children}</p>
  )
}

/** Nome, cargo e empresa. O e-mail e o acesso não se editam aqui. */
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
        {(
          [
            ['Nome', fullName, setFullName, ''],
            ['Cargo', headline, setHeadline, 'Head de Operações'],
            ['Empresa', company, setCompany, ''],
          ] as const
        ).map(([rotulo, valor, set, ph]) => (
          <label key={rotulo}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, marginBottom: 6 }}>
              {rotulo}
            </span>
            <input
              value={valor}
              onChange={(e) => set(e.target.value)}
              placeholder={ph}
              style={inputStyle}
            />
          </label>
        ))}
        <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.5 }}>
          E-mail: {profile?.email}. Para trocar a senha, use "Segurança".
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
  if (dias < 7) return `${dias} dias atrás`
  if (dias < 30) {
    const s = Math.floor(dias / 7)
    return s === 1 ? '1 semana atrás' : `${s} semanas atrás`
  }
  const m = Math.floor(dias / 30)
  return m === 1 ? '1 mês atrás' : `${m} meses atrás`
}
