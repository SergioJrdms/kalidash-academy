import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { eventDay, eventFullDate, eventTime, initials } from '../lib/format'
import type { AcademyEvent } from '../types/db'
import { loadRegistrations, toggleRegistration } from '../services/jornada'
import {
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
} from '../components/ui'
import { NAV_ICON } from '../lib/icons'
import UnlockModal from '../components/UnlockModal'
import { track } from '../lib/analytics'

type Aba = 'proximos' | 'inscricoes' | 'gravacoes'

export default function Eventos() {
  const { session, isPaid } = useAuth()
  const userId = session?.user.id ?? null

  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [inscritos, setInscritos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState<string | null>(null)
  const [aba, setAba] = useState<Aba>('proximos')
  const [ocupado, setOcupado] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [evRes, regs] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .order('starts_at', { ascending: false }),
      userId ? loadRegistrations(userId).catch(() => new Set<string>()) : Promise.resolve(new Set<string>()),
    ])

    if (evRes.error) setError('Não conseguimos carregar os eventos agora.')
    else setEvents((evRes.data ?? []) as AcademyEvent[])
    setInscritos(regs)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  const now = Date.now()

  const proximos = useMemo(
    () =>
      events
        .filter((e) => new Date(e.starts_at).getTime() >= now && !e.recording_url)
        .sort((a, z) => +new Date(a.starts_at) - +new Date(z.starts_at)),
    [events, now],
  )
  const gravacoes = useMemo(
    () =>
      events
        .filter((e) => e.recording_url || new Date(e.starts_at).getTime() < now)
        .sort((a, z) => +new Date(z.starts_at) - +new Date(a.starts_at)),
    [events, now],
  )
  const minhas = useMemo(
    () => proximos.filter((e) => inscritos.has(e.id)),
    [proximos, inscritos],
  )

  /** Dias com evento no mês visível, para o painel de calendário. */
  const diasComEvento = useMemo(() => {
    const m = new Map<string, AcademyEvent[]>()
    for (const e of proximos) {
      const d = new Date(e.starts_at)
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [proximos])

  async function inscrever(e: AcademyEvent) {
    if (!userId) return
    if (e.access_type === 'paid' && !isPaid) {
      track('event_clicked', {
        evento_id: e.id,
        titulo: e.title,
        formato: e.format,
        gravacao: false,
        bloqueado: true,
      })
      setLocked(e.title)
      return
    }

    const jaEstava = inscritos.has(e.id)
    setOcupado(e.id)
    // otimista: o selo troca na hora e volta se o banco recusar
    setInscritos((prev) => {
      const n = new Set(prev)
      if (jaEstava) n.delete(e.id)
      else n.add(e.id)
      return n
    })
    try {
      await toggleRegistration(userId, e.id, !jaEstava)
      track(jaEstava ? 'event_unregistered' : 'event_registered', {
        evento_id: e.id,
        titulo: e.title,
        formato: e.format,
      })
    } catch {
      setInscritos((prev) => {
        const n = new Set(prev)
        if (jaEstava) n.add(e.id)
        else n.delete(e.id)
        return n
      })
    } finally {
      setOcupado(null)
    }
  }

  function abrir(e: AcademyEvent) {
    const url = e.recording_url ?? e.external_url
    const gravacao = Boolean(e.recording_url)

    if (e.access_type === 'paid' && !isPaid) {
      track('event_clicked', {
        evento_id: e.id,
        titulo: e.title,
        formato: e.format,
        gravacao,
        bloqueado: true,
      })
      setLocked(e.title)
      return
    }

    track('event_clicked', {
      evento_id: e.id,
      titulo: e.title,
      formato: e.format,
      gravacao,
      bloqueado: false,
    })
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) return <PageLoading />
  if (error) {
    return (
      <div className="k-page" style={{ padding: 48 }}>
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  const lista = aba === 'proximos' ? proximos : aba === 'inscricoes' ? minhas : gravacoes

  return (
    <div className="k-page" style={{ padding: '48px 48px 100px', maxWidth: 1320 }}>
      <h1 className="k-display k-h1" style={{ marginBottom: 10 }}>
        Eventos
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 32px', maxWidth: 620 }}>
        Encontros para aprofundar, aplicar e discutir o que você está desenvolvendo.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.9fr) minmax(0,1fr)', gap: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
            {(
              [
                [`Próximos (${proximos.length})`, 'proximos'],
                [`Minhas inscrições (${minhas.length})`, 'inscricoes'],
                [`Gravações (${gravacoes.length})`, 'gravacoes'],
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

          {lista.length === 0 ? (
            <EmptyState
              title={
                aba === 'inscricoes'
                  ? 'Você ainda não se inscreveu em nada'
                  : aba === 'gravacoes'
                    ? 'Nenhuma gravação publicada'
                    : 'Nenhum evento marcado'
              }
              message={
                aba === 'inscricoes'
                  ? 'Veja a aba Próximos e garanta seu lugar.'
                  : 'Assim que a próxima data for definida, ela aparece aqui.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lista.map((e) => (
                <EventoCard
                  key={e.id}
                  evento={e}
                  inscrito={inscritos.has(e.id)}
                  ocupado={ocupado === e.id}
                  gravacao={aba === 'gravacoes'}
                  bloqueado={e.access_type === 'paid' && !isPaid}
                  onInscrever={() => void inscrever(e)}
                  onAbrir={() => abrir(e)}
                />
              ))}
            </div>
          )}
        </div>

        <aside style={{ minWidth: 0 }}>
          <CalendarioCard dias={diasComEvento} />
        </aside>
      </div>

      {locked && <UnlockModal courseTitle={locked} onClose={() => setLocked(null)} />}
    </div>
  )
}

function EventoCard({
  evento,
  inscrito,
  ocupado,
  gravacao,
  bloqueado,
  onInscrever,
  onAbrir,
}: {
  evento: AcademyEvent
  inscrito: boolean
  ocupado: boolean
  gravacao: boolean
  bloqueado: boolean
  onInscrever: () => void
  onAbrir: () => void
}) {
  const { dd, mm } = eventDay(evento.starts_at)
  const aoVivo = !gravacao

  return (
    <section className="k-card" style={{ display: 'flex', gap: 22, padding: 22 }}>
      {/* data */}
      <div
        style={{
          flex: 'none',
          width: 64,
          textAlign: 'center',
          paddingTop: 2,
          borderRight: '1px solid var(--line)',
          paddingRight: 20,
        }}
      >
        <div className="k-display" style={{ fontSize: 32, lineHeight: 1 }}>
          {dd}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--tx2)',
            marginTop: 5,
          }}
        >
          {mm}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 11 }}>
          {evento.format && <Selo>{evento.format}</Selo>}
          {inscrito && <Selo tom="imperial">Inscrito</Selo>}
          {aoVivo && !inscrito && <Selo tom="terracotta">Ao vivo</Selo>}
          {gravacao && <Selo tom="bronze">Gravação</Selo>}
          <Selo tom={evento.access_type === 'paid' ? 'bronze' : 'neutro'}>
            {evento.access_type === 'paid' ? 'Premium' : 'Gratuito'}
          </Selo>
        </div>

        <h2 className="k-display" style={{ fontSize: 21, lineHeight: 1.25, marginBottom: 8 }}>
          {evento.title}
        </h2>
        {evento.description && (
          <p style={{ fontSize: 14.5, color: 'var(--tx2)', margin: '0 0 14px', lineHeight: 1.6 }}>
            {evento.description}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
            fontSize: 13,
            color: 'var(--tx2)',
            marginBottom: 18,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon d={NAV_ICON.clock} size={14} stroke="var(--tx3)" />
            {gravacao ? eventFullDate(evento.starts_at) : `${eventTime(evento.starts_at)} (BRT)`}
          </span>
          {evento.instructor_name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={initials(evento.instructor_name)} size={24} />
              {evento.instructor_name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {gravacao ? (
            <button onClick={onAbrir} style={botaoPrimario}>
              Assistir gravação
              <Icon d={NAV_ICON.arrow} size={15} />
            </button>
          ) : inscrito ? (
            <>
              <button onClick={onAbrir} style={botaoPrimario}>
                Entrar ao vivo
                <Icon d={NAV_ICON.arrow} size={15} />
              </button>
              <button onClick={onInscrever} disabled={ocupado} style={botaoFantasma}>
                Cancelar inscrição
              </button>
            </>
          ) : (
            <button onClick={onInscrever} disabled={ocupado} style={botaoPrimario}>
              {bloqueado ? 'Ver como liberar' : ocupado ? 'Inscrevendo...' : 'Inscrever-se'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

const botaoPrimario: React.CSSProperties = {
  background: 'var(--imperial)',
  border: 'none',
  color: 'var(--bg)',
  borderRadius: 'var(--r-control)',
  padding: '11px 22px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
}

const botaoFantasma: React.CSSProperties = {
  background: 'transparent',
  border: '0.8px solid var(--line2)',
  color: 'var(--tx2)',
  borderRadius: 'var(--r-control)',
  padding: '11px 18px',
  fontSize: 13.5,
  cursor: 'pointer',
}

function Selo({
  children,
  tom = 'neutro',
}: {
  children: React.ReactNode
  tom?: 'neutro' | 'imperial' | 'terracotta' | 'bronze'
}) {
  const cores = {
    neutro: ['var(--bg)', 'var(--tx2)'],
    imperial: ['rgba(40,24,59,.08)', 'var(--imperial)'],
    terracotta: ['rgba(183,101,77,.1)', 'var(--terracotta)'],
    bronze: ['rgba(168,138,88,.14)', 'var(--bronze)'],
  }[tom]

  return (
    <span
      style={{
        background: cores[0],
        color: cores[1],
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}

/**
 * Painel de calendário. Mostra o mês com os dias de evento marcados.
 *
 * O botão do Google Calendar está inerte de propósito: sincronizar de
 * verdade exige o OAuth do Google, que não faz parte deste escopo. Em
 * vez de fingir que conectou, cada evento oferece um .ics — isso entra
 * em qualquer agenda hoje, sem integração nenhuma.
 */
function CalendarioCard({ dias }: { dias: Map<string, AcademyEvent[]> }) {
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const primeiroDiaSemana = mes.getDay()
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const hoje = new Date()

  const celulas: (number | null)[] = [
    ...Array<null>(primeiroDiaSemana).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]

  const doMes = useMemo(() => {
    const r: AcademyEvent[] = []
    for (const [k, evs] of dias) {
      const [y, m] = k.split('-').map(Number)
      if (y === mes.getFullYear() && m === mes.getMonth()) r.push(...evs)
    }
    return r.sort((a, z) => +new Date(a.starts_at) - +new Date(z.starts_at))
  }, [dias, mes])

  return (
    <section className="k-card" style={{ padding: 22, position: 'sticky', top: 24 }}>
      <Kicker style={{ marginBottom: 18 }}>Sua agenda</Kicker>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
          aria-label="Mês anterior"
          style={setaStyle}
        >
          <Icon d="M15 6l-6 6 6 6" size={15} stroke="var(--tx2)" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
          {mes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
          aria-label="Próximo mês"
          style={setaStyle}
        >
          <Icon d="M9 6l6 6-6 6" size={15} stroke="var(--tx2)" />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
          marginBottom: 6,
        }}
      >
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 10.5,
              fontWeight: 600,
              color: 'var(--tx3)',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={i} />
          const temEvento = dias.has(`${mes.getFullYear()}-${mes.getMonth()}-${dia}`)
          const eHoje =
            dia === hoje.getDate() &&
            mes.getMonth() === hoje.getMonth() &&
            mes.getFullYear() === hoje.getFullYear()

          return (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12.5,
                borderRadius: 8,
                background: temEvento ? 'var(--imperial)' : 'transparent',
                color: temEvento ? 'var(--bg)' : eHoje ? 'var(--terracotta)' : 'var(--tx2)',
                fontWeight: temEvento || eHoje ? 600 : 400,
                border: eHoje && !temEvento ? '1px solid var(--terracotta)' : 'none',
              }}
            >
              {dia}
            </div>
          )
        })}
      </div>

      {doMes.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)' }}>
          {doMes.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: 11, marginBottom: 14 }}>
              <span
                style={{
                  flex: 'none',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--champagne)',
                  marginTop: 6,
                }}
              />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>
                  {e.title}
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--tx2)', marginTop: 3 }}>
                  {eventFullDate(e.starts_at)} · {eventTime(e.starts_at)}
                </span>
                <button onClick={() => baixarIcs(e)} style={linkIcs}>
                  Adicionar à minha agenda
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      <p
        style={{
          fontSize: 12,
          color: 'var(--tx3)',
          lineHeight: 1.55,
          margin: '14px 0 0',
          paddingTop: 14,
          borderTop: '1px solid var(--line)',
        }}
      >
        O arquivo de agenda abre no Google Calendar, Outlook ou Apple Calendar, sem precisar
        conectar sua conta.
      </p>
    </section>
  )
}

const setaStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  borderRadius: 6,
}

const linkIcs: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--bronze)',
  fontSize: 12,
  cursor: 'pointer',
  padding: '5px 0 0',
  display: 'block',
}

/** Gera o .ics do evento no próprio navegador. Uma hora e meia de duração. */
function baixarIcs(e: AcademyEvent) {
  const inicio = new Date(e.starts_at)
  const fim = new Date(inicio.getTime() + 90 * 60 * 1000)
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const escapar = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kalidash Academy//PT-BR',
    'BEGIN:VEVENT',
    `UID:${e.id}@kalidash.academy`,
    `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(inicio)}`,
    `DTEND:${z(fim)}`,
    `SUMMARY:${escapar(e.title)}`,
    e.description ? `DESCRIPTION:${escapar(e.description)}` : null,
    e.external_url ? `URL:${e.external_url}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${e.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}.ics`
  a.click()
  URL.revokeObjectURL(url)
  track('event_calendar_added', { evento_id: e.id, titulo: e.title })
}
