import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { eventDay, eventTime, initials } from '../lib/format'
import type { AcademyEvent } from '../types/db'
import { loadRegistrations } from '../services/jornada'
import {
  PARAM_RETORNO,
  cancelarInscricao,
  concluirConexao,
  desconectar,
  inscrever,
  iniciarConexao,
  listarAgenda,
  type GoogleEvent,
} from '../services/calendar'
import { Avatar, Banner, Icon, Kicker, PageLoading, Spinner } from '../components/ui'
import { Imagem } from '../components/Imagem'
import { NAV_ICON } from '../lib/icons'
import UnlockModal from '../components/UnlockModal'
import { track } from '../lib/analytics'

const VERMELHO = '#dc2626'
const VERDE = '#16a34a'

export default function Eventos() {
  const { session, profile, isPaid, refreshProfile } = useAuth()
  const userId = session?.user.id ?? null
  const [params, setParams] = useSearchParams()

  const [eventos, setEventos] = useState<AcademyEvent[]>([])
  const [inscritos, setInscritos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [locked, setLocked] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  // ---------- agenda ----------
  const [conectado, setConectado] = useState(Boolean(profile?.google_calendar_connected))
  const [agenda, setAgenda] = useState<GoogleEvent[]>([])
  const [conectando, setConectando] = useState(false)
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const carregar = useCallback(async () => {
    const [evRes, regs] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('starts_at', { ascending: true }),
      userId
        ? loadRegistrations(userId).catch(() => new Set<string>())
        : Promise.resolve(new Set<string>()),
    ])

    if (evRes.error) setErro('Não conseguimos carregar os eventos agora.')
    else setEventos((evRes.data ?? []) as AcademyEvent[])
    setInscritos(regs)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Volta do consentimento do Google: guarda os tokens e limpa a URL.
  useEffect(() => {
    if (params.get(PARAM_RETORNO) !== '1') return
    let ativo = true
    setConectando(true)

    void concluirConexao()
      .then(async (ok) => {
        if (!ativo) return
        if (ok) {
          setConectado(true)
          setAviso('Agenda conectada. Agora as inscrições entram no seu Google Calendar.')
          await refreshProfile()
        } else {
          setErro(
            'O Google não devolveu a autorização completa. Tente conectar de novo e aceite o acesso à agenda.',
          )
        }
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Falha ao conectar.'))
      .finally(() => {
        if (!ativo) return
        setConectando(false)
        const p = new URLSearchParams(params)
        p.delete(PARAM_RETORNO)
        setParams(p, { replace: true })
      })

    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get(PARAM_RETORNO)])

  // Com a agenda ligada, busca os compromissos do mês visível.
  useEffect(() => {
    if (!conectado) {
      setAgenda([])
      return
    }
    let ativo = true
    const de = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const ate = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)

    void listarAgenda(de, ate)
      .then((evs) => ativo && setAgenda(evs))
      .catch(() => ativo && setAgenda([]))

    return () => {
      ativo = false
    }
  }, [conectado, mes])

  const agora = Date.now()
  const proximos = useMemo(
    () => eventos.filter((e) => new Date(e.starts_at).getTime() >= agora && !e.recording_url),
    [eventos, agora],
  )
  const minhas = useMemo(() => proximos.filter((e) => inscritos.has(e.id)), [proximos, inscritos])
  const gravacoes = useMemo(
    () =>
      eventos
        .filter((e) => e.recording_url || new Date(e.starts_at).getTime() < agora)
        .sort((a, z) => +new Date(z.starts_at) - +new Date(a.starts_at)),
    [eventos, agora],
  )

  async function alternarInscricao(e: AcademyEvent) {
    if (!userId) return
    if (e.access_type === 'paid' && !isPaid) {
      track('event_clicked', { evento_id: e.id, titulo: e.title, bloqueado: true })
      setLocked(e.title)
      return
    }

    const jaEstava = inscritos.has(e.id)
    setOcupado(e.id)
    setErro(null)
    setAviso(null)

    try {
      const r = jaEstava ? await cancelarInscricao(e.id) : await inscrever(e.id)
      setInscritos((prev) => {
        const n = new Set(prev)
        if (r.registered) n.add(e.id)
        else n.delete(e.id)
        return n
      })
      track(jaEstava ? 'event_unregistered' : 'event_registered', {
        evento_id: e.id,
        titulo: e.title,
        agenda: r.calendar,
      })

      if (!jaEstava) {
        setAviso(
          r.calendar
            ? `Inscrição feita. "${e.title}" entrou no seu Google Calendar.`
            : 'Inscrição feita. Conecte sua agenda ao lado para o evento entrar no Google Calendar.',
        )
      }
      // a agenda muda quando criamos/removemos o evento
      if (conectado) {
        const de = new Date(mes.getFullYear(), mes.getMonth(), 1)
        const ate = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
        void listarAgenda(de, ate)
          .then(setAgenda)
          .catch(() => {})
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir.')
    } finally {
      setOcupado(null)
    }
  }

  function abrir(e: AcademyEvent) {
    const url = e.recording_url ?? e.external_url
    if (e.access_type === 'paid' && !isPaid) {
      setLocked(e.title)
      return
    }
    track('event_clicked', {
      evento_id: e.id,
      titulo: e.title,
      gravacao: Boolean(e.recording_url),
      bloqueado: false,
    })
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <PageLoading titulo="20%" blocos={[560, 180]} />

  return (
    <div className="k-page k-enter" style={{ padding: '36px 36px 90px', maxWidth: 1280 }}>
      <h1 className="k-display k-page-title is-50" style={{ margin: '0 0 10px' }}>
        Eventos
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 15, margin: '0 0 22px' }}>
        Encontros para aprofundar, aplicar e discutir o que você está desenvolvendo.
      </p>

      {(erro || aviso) && (
        <div style={{ marginBottom: 18, maxWidth: 848 }}>
          <Banner kind={erro ? 'error' : 'ok'}>{erro ?? aviso}</Banner>
        </div>
      )}

      <div className="k-eventos-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <CartaoLista
            titulo="Próximos"
            vazio="Nenhum encontro marcado por enquanto. Quando a próxima data sair, ela aparece aqui."
          >
            {proximos.map((e, i) => (
              <LinhaEvento
                key={e.id}
                evento={e}
                indice={i}
                destaque={i === 0}
                inscrito={inscritos.has(e.id)}
                ocupado={ocupado === e.id}
                onInscrever={() => void alternarInscricao(e)}
                onAbrir={() => abrir(e)}
              />
            ))}
          </CartaoLista>

          {minhas.length > 0 && (
            <CartaoLista titulo="Minhas inscrições" vazio="">
              {minhas.map((e, i) => (
                <LinhaEvento
                  key={e.id}
                  evento={e}
                  indice={i}
                  inscrito
                  compacta
                  ocupado={ocupado === e.id}
                  onInscrever={() => void alternarInscricao(e)}
                  onAbrir={() => abrir(e)}
                />
              ))}
            </CartaoLista>
          )}

          {gravacoes.length > 0 && (
            <CartaoLista titulo="Gravações" vazio="">
              {gravacoes.map((e, i) => (
                <LinhaEvento
                  key={e.id}
                  evento={e}
                  indice={i}
                  gravacao
                  ocupado={false}
                  onInscrever={() => {}}
                  onAbrir={() => abrir(e)}
                />
              ))}
            </CartaoLista>
          )}
        </div>

        <aside style={{ minWidth: 0 }}>
          <AgendaCard
            conectado={conectado}
            conectando={conectando}
            mes={mes}
            setMes={setMes}
            agenda={agenda}
            eventosAcademy={proximos}
            inscritos={inscritos}
            onConectar={async () => {
              setConectando(true)
              setErro(null)
              try {
                await iniciarConexao()
              } catch (e) {
                setErro(e instanceof Error ? e.message : 'Não foi possível abrir o Google.')
                setConectando(false)
              }
            }}
            onDesconectar={async () => {
              setConectando(true)
              try {
                await desconectar()
                setConectado(false)
                setAgenda([])
                await refreshProfile()
                setAviso('Agenda desconectada.')
              } catch (e) {
                setErro(e instanceof Error ? e.message : 'Não foi possível desconectar.')
              } finally {
                setConectando(false)
              }
            }}
          />
        </aside>
      </div>

      {locked && <UnlockModal courseTitle={locked} onClose={() => setLocked(null)} />}
    </div>
  )
}

// ---------------------------------------------------------------------

function CartaoLista({
  titulo,
  vazio,
  children,
}: {
  titulo: string
  vazio: string
  children: React.ReactNode
}) {
  const vazia = Array.isArray(children) ? children.length === 0 : !children
  return (
    <section className="k-card" style={{ padding: '22px 24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <Kicker style={{ letterSpacing: '1px' }}>{titulo}</Kicker>
      </div>
      {vazia ? (
        <p style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6, margin: '12px 0 4px' }}>
          {vazio}
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function Selo({
  children,
  tom = 'neutro',
}: {
  children: React.ReactNode
  tom?: 'neutro' | 'apagado' | 'vivo' | 'inscrito'
}) {
  const [bg, cor] = {
    neutro: ['var(--bg)', 'var(--tx)'],
    apagado: ['var(--bg)', 'var(--tx2)'],
    vivo: ['rgba(239,68,68,.08)', VERMELHO],
    inscrito: ['rgba(34,197,94,.08)', VERDE],
  }[tom]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: bg,
        color: cor,
        borderRadius: 99,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {tom === 'vivo' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: VERMELHO }} />
      )}
      {children}
    </span>
  )
}

function LinhaEvento({
  evento,
  destaque,
  inscrito,
  compacta,
  gravacao,
  indice = 0,
  ocupado,
  onInscrever,
  onAbrir,
}: {
  evento: AcademyEvent
  destaque?: boolean
  inscrito?: boolean
  compacta?: boolean
  gravacao?: boolean
  indice?: number
  ocupado: boolean
  onInscrever: () => void
  onAbrir: () => void
}) {
  const { dd, mm } = eventDay(evento.starts_at)

  return (
    <div
      className="k-enter-i"
      style={{
        ['--i' as string]: indice,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 18,
        padding: compacta ? '18px 0' : '22px 0',
        borderTop: '0.8px solid var(--line)',
      }}
    >
      <div style={{ flex: 'none', width: 44, textAlign: 'center', paddingTop: 2 }}>
        <div className="k-display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
          {dd}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.66px',
            color: 'var(--tx3)',
            marginTop: 6,
            textTransform: 'uppercase',
          }}
        >
          {mm}
        </div>
      </div>

      {!compacta && (
        <Imagem
          src={evento.thumbnail_url}
          alt=""
          largura={110}
          altura={72}
          raio={10}
          icone={NAV_ICON.eventos}
          tamanhoIcone={22}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 9 }}>
          {evento.format && <Selo>{evento.format}</Selo>}
          {inscrito ? (
            <Selo tom="inscrito">Inscrito</Selo>
          ) : gravacao ? (
            <Selo tom="apagado">Gravação</Selo>
          ) : (
            <Selo tom="vivo">Ao vivo</Selo>
          )}
          <Selo tom="apagado">{evento.access_type === 'free' ? 'Gratuito' : 'Premium'}</Selo>
        </div>

        <h3 className="k-display" style={{ fontSize: 18, lineHeight: 1.3, marginBottom: 8 }}>
          {evento.title}
        </h3>

        {!compacta && evento.description && (
          <p style={{ fontSize: 13.5, color: 'var(--tx2)', lineHeight: 1.55, margin: '0 0 10px' }}>
            {evento.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
            fontSize: 12.5,
            color: 'var(--tx2)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon d={NAV_ICON.clock} size={14} stroke="var(--tx3)" />
            {eventTime(evento.starts_at)} (BRT)
          </span>
          {evento.instructor_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={initials(evento.instructor_name)} size={22} />
              {evento.instructor_name}
            </span>
          )}
        </div>
      </div>

      <div
        style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}
      >
        {gravacao ? (
          <button onClick={onAbrir} style={botaoFantasma}>
            Assistir
            <Icon d={NAV_ICON.arrow} size={14} stroke="var(--tx)" />
          </button>
        ) : inscrito ? (
          <>
            <button onClick={onAbrir} style={botaoPrimario}>
              Entrar ao vivo
              <Icon d={NAV_ICON.arrow} size={14} />
            </button>
            <button onClick={onInscrever} disabled={ocupado} style={linkCancelar}>
              {ocupado ? 'Cancelando...' : 'Cancelar inscrição'}
            </button>
          </>
        ) : (
          <button
            onClick={onInscrever}
            disabled={ocupado}
            style={destaque ? botaoPrimario : botaoFantasma}
          >
            {ocupado && <Spinner size={12} color={destaque ? 'var(--bg)' : 'var(--tx2)'} />}
            {ocupado ? 'Inscrevendo' : 'Inscrever-se'}
            {!ocupado && (
              <Icon d={NAV_ICON.arrow} size={14} stroke={destaque ? 'var(--bg)' : 'var(--tx)'} />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

const botaoPrimario: React.CSSProperties = {
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 9,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
}

const botaoFantasma: React.CSSProperties = {
  background: 'transparent',
  border: '0.8px solid var(--line2)',
  color: 'var(--tx)',
  borderRadius: 9,
  padding: '10px 20px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  whiteSpace: 'nowrap',
}

const linkCancelar: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--tx3)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  whiteSpace: 'nowrap',
}

/** O "G" do Google, nas cores oficiais. */
function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 002 24c0 3.6.9 6.9 2.3 9.8l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z"
      />
    </svg>
  )
}

function AgendaCard({
  conectado,
  conectando,
  mes,
  setMes,
  agenda,
  eventosAcademy,
  inscritos,
  onConectar,
  onDesconectar,
}: {
  conectado: boolean
  conectando: boolean
  mes: Date
  setMes: (d: Date) => void
  agenda: GoogleEvent[]
  eventosAcademy: AcademyEvent[]
  inscritos: Set<string>
  onConectar: () => void
  onDesconectar: () => void
}) {
  const primeiroDiaSemana = mes.getDay() === 0 ? new Date(mes).getDay() : mes.getDay()
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const hoje = new Date()

  /** Dias com algo: evento da Academy ou compromisso da agenda. */
  const marcados = useMemo(() => {
    const m = new Map<number, { academy: boolean; agenda: boolean }>()
    const marca = (d: Date, chave: 'academy' | 'agenda') => {
      if (d.getFullYear() !== mes.getFullYear() || d.getMonth() !== mes.getMonth()) return
      const atual = m.get(d.getDate()) ?? { academy: false, agenda: false }
      atual[chave] = true
      m.set(d.getDate(), atual)
    }
    for (const e of eventosAcademy) marca(new Date(e.starts_at), 'academy')
    for (const g of agenda) if (g.start) marca(new Date(g.start), 'agenda')
    return m
  }, [eventosAcademy, agenda, mes])

  const doMes = useMemo(
    () =>
      [...agenda]
        .filter((g) => g.start)
        .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))
        .slice(0, 5),
    [agenda],
  )

  const celulas: (number | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  return (
    <section className="k-card" style={{ padding: 22, position: 'sticky', top: 24 }}>
      <Kicker style={{ letterSpacing: '1px', marginBottom: 10 }}>Integração</Kicker>
      <h2 className="k-display" style={{ fontSize: 20, marginBottom: 10 }}>
        Google Calendar
      </h2>
      <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {conectado
          ? 'Sua agenda está conectada. Cada inscrição vira um compromisso com lembrete.'
          : 'Sincronize os eventos da Academy com a sua agenda e receba lembretes antes de cada encontro.'}
      </p>

      {/* ---------- mês ---------- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <button
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          aria-label="Mês anterior"
          style={seta}
        >
          <Icon d="M15 6l-6 6 6 6" size={15} stroke="var(--tx2)" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
          {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          aria-label="Próximo mês"
          style={seta}
        >
          <Icon d="M9 6l6 6-6 6" size={15} stroke="var(--tx2)" />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 2 }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            style={{ textAlign: 'center', fontSize: 9, color: 'var(--tx3)', padding: '4px 0' }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} />
          const marca = marcados.get(dia)
          const eHoje =
            dia === hoje.getDate() &&
            mes.getMonth() === hoje.getMonth() &&
            mes.getFullYear() === hoje.getFullYear()

          return (
            <div
              key={i}
              title={marca?.agenda ? 'Você tem algo na agenda' : undefined}
              style={{
                height: 27,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                fontSize: 11,
                borderRadius: 7,
                background: marca?.academy ? 'var(--bronze)' : 'transparent',
                color: marca?.academy ? 'var(--bg)' : eHoje ? 'var(--terracotta)' : 'var(--tx2)',
                fontWeight: marca?.academy || eHoje ? 600 : 400,
                border: eHoje && !marca?.academy ? '1px solid var(--terracotta)' : 'none',
              }}
            >
              {dia}
              {marca?.agenda && !marca.academy && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--imperial)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ---------- compromissos reais ---------- */}
      {conectado && doMes.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
          <div style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 10 }}>
            Na sua agenda neste mês
          </div>
          {doMes.map((g) => (
            <a
              key={g.id}
              href={g.html_link ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', gap: 10, marginBottom: 10, color: 'var(--tx)' }}
            >
              <span
                style={{
                  flex: 'none',
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--imperial)',
                  marginTop: 6,
                }}
              />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.35 }}>
                  {g.summary}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--tx3)', marginTop: 2 }}>
                  {g.start
                    ? new Date(g.start).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        ...(g.all_day ? {} : { hour: '2-digit', minute: '2-digit' }),
                      })
                    : ''}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}

      {/* ---------- ação ---------- */}
      <div style={{ marginTop: 18 }}>
        {conectado ? (
          <button
            onClick={onDesconectar}
            disabled={conectando}
            style={{ ...botaoFantasma, width: '100%', justifyContent: 'center' }}
          >
            {conectando && <Spinner size={12} color="var(--tx2)" />}
            Desconectar agenda
          </button>
        ) : (
          <button
            onClick={onConectar}
            disabled={conectando}
            style={{
              width: '100%',
              background: 'var(--imperial)',
              border: 'none',
              color: 'var(--bg)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {conectando ? <Spinner size={13} color="var(--bg)" /> : <GoogleMark />}
            {conectando ? 'Conectando...' : 'Conectar Google Calendar'}
          </button>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.55, margin: '12px 0 0' }}>
        {inscritos.size > 0 && conectado
          ? 'Cancelar uma inscrição também remove o compromisso da sua agenda.'
          : 'Você controla quais calendários serão sincronizados e pode desconectar quando quiser.'}
      </p>
    </section>
  )
}

const seta: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  borderRadius: 6,
}
