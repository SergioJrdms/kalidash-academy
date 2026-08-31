import { useEffect, useState } from 'react'
import {
  adminCreateEvent,
  adminDeleteEvent,
  adminListEvents,
  adminUpdateEvent,
} from '../services/admin'
import { eventFullDate } from '../lib/format'
import type { AcademyEvent } from '../types/db'
import {
  Banner,
  Field,
  GhostButton,
  inputStyle,
  PrimaryButton,
  Skeleton,
  Spinner,
} from '../components/ui'

const selectStyle = { ...inputStyle, cursor: 'pointer' }

/** ISO -> valor de <input type="datetime-local"> no fuso local */
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminEvents() {
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setEvents(await adminListEvents())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function create() {
    setError(null)
    try {
      const created = await adminCreateEvent({
        title: 'Novo evento',
        starts_at: new Date(Date.now() + 7 * 864e5).toISOString(),
        format: 'Live',
        instructor_name: 'Time Kalidash',
        access_type: 'free',
        status: 'draft',
      })
      setEvents((e) => [created, ...e])
      setEditing(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar evento.')
    }
  }

  function patch(id: string, p: Partial<AcademyEvent>) {
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, ...p } : e)))
  }

  async function save(e: AcademyEvent) {
    setBusyId(e.id)
    setError(null)
    try {
      const updated = await adminUpdateEvent(e.id, {
        title: e.title,
        description: e.description,
        starts_at: e.starts_at,
        format: e.format,
        instructor_name: e.instructor_name,
        access_type: e.access_type,
        external_url: e.external_url,
        recording_url: e.recording_url,
        status: e.status,
      })
      setEvents((list) => list.map((x) => (x.id === e.id ? updated : x)))
      setEditing(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(e: AcademyEvent) {
    if (!window.confirm(`Excluir "${e.title}"?\n\nA ação não pode ser desfeita.`)) return
    setBusyId(e.id)
    try {
      await adminDeleteEvent(e.id)
      setEvents((list) => list.filter((x) => x.id !== e.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}
      >
        <h1
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-.02em',
            margin: 0,
          }}
        >
          Eventos
        </h1>
        <div style={{ flex: 1 }} />
        <PrimaryButton onClick={() => void create()}>Novo evento</PrimaryButton>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton height={80} radius={18} />
          <Skeleton height={80} radius={18} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map((e) => {
            const open = editing === e.id
            return (
              <div
                key={e.id}
                style={{
                  background: 'var(--sf)',
                  border: '1px solid var(--line)',
                  borderRadius: 18,
                  padding: 18,
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>
                      {e.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                      {eventFullDate(e.starts_at)} · {e.format ?? '—'} ·{' '}
                      {e.access_type === 'free' ? 'Gratuito' : 'Pago'} ·{' '}
                      <span
                        style={{
                          color: e.status === 'published' ? 'var(--ok)' : 'var(--tx3)',
                          fontWeight: 600,
                        }}
                      >
                        {e.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                  {busyId === e.id && <Spinner size={14} />}
                  <GhostButton
                    onClick={() => setEditing(open ? null : e.id)}
                    style={{ padding: '9px 18px' }}
                  >
                    {open ? 'Fechar' : 'Editar'}
                  </GhostButton>
                  <button
                    onClick={() => void remove(e)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--line)',
                      color: 'var(--danger)',
                      borderRadius: 999,
                      padding: '9px 16px',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Excluir
                  </button>
                </div>

                {open && (
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 18,
                      borderTop: '1px solid var(--line)',
                      display: 'grid',
                      gap: 16,
                      gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                    }}
                  >
                    <Field label="Título" style={{ gridColumn: '1 / -1' }}>
                      <input
                        value={e.title}
                        onChange={(ev) => patch(e.id, { title: ev.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Descrição" style={{ gridColumn: '1 / -1' }}>
                      <textarea
                        value={e.description ?? ''}
                        onChange={(ev) => patch(e.id, { description: ev.target.value })}
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </Field>
                    <Field label="Data e hora">
                      <input
                        type="datetime-local"
                        value={toLocalInput(e.starts_at)}
                        onChange={(ev) =>
                          patch(e.id, {
                            starts_at: new Date(ev.target.value).toISOString(),
                          })
                        }
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Formato" hint="Webinar, Live, Gravação...">
                      <input
                        value={e.format ?? ''}
                        onChange={(ev) => patch(e.id, { format: ev.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Professor / convidado">
                      <input
                        value={e.instructor_name ?? ''}
                        onChange={(ev) => patch(e.id, { instructor_name: ev.target.value })}
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="Acesso">
                      <select
                        value={e.access_type}
                        onChange={(ev) =>
                          patch(e.id, {
                            access_type: ev.target.value as AcademyEvent['access_type'],
                          })
                        }
                        style={selectStyle}
                      >
                        <option value="free">Gratuito</option>
                        <option value="paid">Pago</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          patch(e.id, { status: ev.target.value as AcademyEvent['status'] })
                        }
                        style={selectStyle}
                      >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                      </select>
                    </Field>
                    <Field label="URL de inscrição/entrada">
                      <input
                        value={e.external_url ?? ''}
                        onChange={(ev) => patch(e.id, { external_url: ev.target.value })}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                    </Field>
                    <Field label="URL da gravação" hint="Preenchida move o evento para Gravações.">
                      <input
                        value={e.recording_url ?? ''}
                        onChange={(ev) => patch(e.id, { recording_url: ev.target.value })}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                    </Field>
                    <div
                      style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, flexWrap: 'wrap' }}
                    >
                      <PrimaryButton
                        onClick={() => void save(e)}
                        disabled={busyId === e.id}
                        style={{ padding: '12px 26px' }}
                      >
                        Salvar evento
                      </PrimaryButton>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
