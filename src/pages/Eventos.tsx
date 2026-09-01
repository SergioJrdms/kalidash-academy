import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { eventDay, eventTime, initials } from '../lib/format'
import type { AcademyEvent } from '../types/db'
import {
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  Kicker,
  PageLoading,
  Tag,
} from '../components/ui'
import { NAV_ICON } from '../lib/icons'
import UnlockModal from '../components/UnlockModal'
import { track } from '../lib/analytics'

export default function Eventos() {
  const { isPaid } = useAuth()
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [locked, setLocked] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('starts_at', { ascending: false })

    if (err) setError('Não conseguimos carregar os eventos agora.')
    else setEvents((data ?? []) as AcademyEvent[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const now = Date.now()
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => new Date(e.starts_at).getTime() >= now && !e.recording_url)
        .sort((a, z) => +new Date(a.starts_at) - +new Date(z.starts_at)),
    [events, now],
  )
  const recordings = useMemo(
    () =>
      events
        .filter((e) => e.recording_url || new Date(e.starts_at).getTime() < now)
        .sort((a, z) => +new Date(z.starts_at) - +new Date(a.starts_at)),
    [events, now],
  )

  if (loading) return <PageLoading />

  if (error) {
    return (
      <div className="k-page" style={{ padding: '56px 56px' }}>
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    )
  }

  function open(e: AcademyEvent) {
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
      tem_link: Boolean(url),
    })

    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 1080 }}>
      <h1
        className="k-h1"
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 31,
          lineHeight: 1.16,
          letterSpacing: '-.03em',
          margin: '0 0 10px',
        }}
      >
        Eventos
      </h1>
      <p style={{ color: 'var(--tx2)', margin: '0 0 44px', fontSize: 15 }}>
        Encontros ao vivo com o time da Kalidash e convidados.
      </p>

      <Kicker style={{ marginBottom: 20 }}>Próximos</Kicker>
      {upcoming.length === 0 ? (
        <div style={{ marginBottom: 52 }}>
          <EmptyState
            title="Nenhum encontro marcado agora"
            message="Assim que a próxima data estiver definida, ela aparece aqui."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 52 }}>
          {upcoming.map((e) => {
            const free = e.access_type === 'free'
            const canJoin = free || isPaid
            const d = eventDay(e.starts_at)
            return (
              <div
                key={e.id}
                className="k-stack-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  background: 'var(--sf)',
                  border: '1px solid var(--line)',
                  borderRadius: 20,
                  padding: '22px 24px',
                }}
              >
                <div
                  style={{
                    flex: 'none',
                    width: 66,
                    textAlign: 'center',
                    border: `1px solid ${free ? 'var(--pline)' : 'var(--line)'}`,
                    background: free ? 'var(--psoft)' : 'var(--sf2)',
                    borderRadius: 14,
                    padding: '11px 0',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Raleway,sans-serif',
                      fontWeight: 800,
                      fontSize: 20,
                      lineHeight: 1,
                    }}
                  >
                    {d.dd}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      letterSpacing: '.13em',
                      fontWeight: 700,
                      color: 'var(--tx2)',
                      marginTop: 2,
                    }}
                  >
                    {d.mm}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      marginBottom: 9,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9.5,
                        letterSpacing: '.14em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        color: 'var(--tx3)',
                      }}
                    >
                      {e.format ?? 'Encontro'}
                    </span>
                    <Tag kind={free ? 'free' : isPaid ? 'unlocked' : 'paid'} />
                  </div>
                  <div
                    style={{
                      fontFamily: 'Raleway,sans-serif',
                      fontWeight: 700,
                      fontSize: 17,
                      lineHeight: 1.3,
                      marginBottom: 7,
                    }}
                  >
                    {e.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar name={initials(e.instructor_name)} size={24} fontSize={9} />
                    <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
                      {eventTime(e.starts_at)} · {e.instructor_name ?? 'Time Kalidash'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => open(e)}
                  style={{
                    flex: 'none',
                    background: canJoin
                      ? 'linear-gradient(180deg,#8a5cff,var(--p))'
                      : 'transparent',
                    border: `1px solid ${canJoin ? 'transparent' : 'var(--line2)'}`,
                    color: canJoin ? '#fff' : 'var(--tx2)',
                    borderRadius: 999,
                    padding: '12px 26px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: canJoin ? 'var(--glow)' : undefined,
                  }}
                >
                  {canJoin ? 'Participar' : 'Conhecer'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Kicker style={{ marginBottom: 20 }}>Gravações</Kicker>
      {recordings.length === 0 ? (
        <EmptyState
          title="Ainda não há gravações"
          message="As gravações dos encontros ficam disponíveis aqui depois que acontecem."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {recordings.map((e) => {
            const free = e.access_type === 'free'
            return (
              <button
                key={e.id}
                onClick={() => open(e)}
                className="k-hoverable k-stack-mobile"
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  padding: '17px 20px',
                  cursor: 'pointer',
                  color: 'var(--tx)',
                }}
              >
                <Icon d={NAV_ICON.play} size={14} fill="var(--p2)" />
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'Raleway,sans-serif',
                    fontWeight: 600,
                    fontSize: 14.5,
                    minWidth: 0,
                  }}
                >
                  {e.title}
                </span>
                <span
                  className="k-hide-mobile"
                  style={{ flex: 'none', fontSize: 12, color: 'var(--tx3)' }}
                >
                  {e.instructor_name ?? 'Time Kalidash'}
                </span>
                <span
                  style={{
                    flex: 'none',
                    fontSize: 12,
                    color: 'var(--tx3)',
                    width: 62,
                    textAlign: 'right',
                  }}
                >
                  {eventDay(e.starts_at).dd} {eventDay(e.starts_at).mm}
                </span>
                <Tag kind={free ? 'free' : isPaid ? 'unlocked' : 'paid'} />
              </button>
            )
          })}
        </div>
      )}

      {locked && <UnlockModal courseTitle={locked} onClose={() => setLocked(null)} />}
    </div>
  )
}
