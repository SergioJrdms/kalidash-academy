import { useEffect, useMemo, useState } from 'react'
import { adminListUsers, adminSetAccessLevel, adminSetRole } from '../services/admin'
import { useAuth } from '../hooks/useAuth'
import type { Profile } from '../types/db'
import { Banner, inputStyle, Skeleton, Spinner, Tag } from '../components/ui'

export default function AdminUsers() {
  const { profile: me } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    try {
      setUsers(await adminListUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.full_name, u.email, u.company, u.area]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [users, query])

  async function setAccess(u: Profile, level: 'free' | 'paid') {
    setBusyId(u.id)
    setError(null)
    try {
      const updated = await adminSetAccessLevel(u.id, level)
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar o acesso.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleRole(u: Profile) {
    const next = u.role === 'admin' ? 'student' : 'admin'
    if (
      !window.confirm(
        next === 'admin'
          ? `Tornar ${u.full_name || u.email} administrador?\n\nEle poderá criar, editar e excluir todo o conteúdo.`
          : `Remover o acesso de administrador de ${u.full_name || u.email}?`,
      )
    )
      return

    setBusyId(u.id)
    setError(null)
    try {
      const updated = await adminSetRole(u.id, next)
      setUsers((list) => list.map((x) => (x.id === u.id ? updated : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar o papel.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}
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
          Usuários
        </h1>
        <div style={{ flex: 1 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, e-mail, empresa..."
          style={{ ...inputStyle, width: 300, padding: '11px 16px' }}
        />
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
          <Skeleton height={64} radius={16} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((u) => {
            const isPaid = u.access_level === 'paid'
            const isMe = u.id === me?.id
            return (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  background: 'var(--sf)',
                  border: '1px solid var(--line)',
                  borderRadius: 16,
                  padding: '14px 18px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      flexWrap: 'wrap',
                    }}
                  >
                    {u.full_name || 'Sem nome'}
                    {u.role === 'admin' && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '.08em',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'var(--psoft)',
                          color: 'var(--p2)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                    {[u.email, u.company, u.area].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>

                <Tag kind={isPaid ? 'paid' : 'free'} />

                {busyId === u.id && <Spinner size={14} />}

                <button
                  onClick={() => void setAccess(u, isPaid ? 'free' : 'paid')}
                  disabled={busyId === u.id}
                  style={{
                    background: isPaid ? 'transparent' : 'var(--psoft)',
                    border: `1px solid ${isPaid ? 'var(--line2)' : 'var(--pline)'}`,
                    color: isPaid ? 'var(--tx2)' : 'var(--p2)',
                    borderRadius: 999,
                    padding: '9px 18px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isPaid ? 'Mudar para Gratuito' : 'Mudar para Pago'}
                </button>

                <button
                  onClick={() => void toggleRole(u)}
                  disabled={busyId === u.id || isMe}
                  title={isMe ? 'Você não pode alterar o próprio papel.' : undefined}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isMe ? 'var(--tx3)' : 'var(--tx2)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isMe ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {u.role === 'admin' ? 'Remover admin' : 'Tornar admin'}
                </button>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--tx3)', padding: 20 }}>
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--tx3)', lineHeight: 1.6 }}>
        Excluir contas é feito pelo painel do Supabase (Authentication → Users), de propósito:
        apagar um usuário aqui apagaria o progresso dele junto.
      </div>
    </div>
  )
}
