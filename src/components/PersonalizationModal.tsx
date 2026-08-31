import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { AREAS, GOALS } from '../types/db'
import { Banner, Kicker, Modal, Spinner } from './ui'

function Chip({
  label,
  on,
  onClick,
}: {
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: on ? 'var(--psoft)' : 'var(--sf2)',
        border: `1px solid ${on ? 'var(--pline)' : 'var(--line)'}`,
        color: on ? 'var(--tx)' : 'var(--tx2)',
        borderRadius: 999,
        padding: '11px 18px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all .18s',
      }}
    >
      {label}
    </button>
  )
}

/**
 * As duas perguntas da personalização. Nada além disso — grava
 * profiles.area e profiles.goal.
 */
export default function PersonalizationModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved?: () => void
}) {
  const { profile, updateProfile } = useAuth()
  const [area, setArea] = useState<string | null>(profile?.area ?? null)
  const [goal, setGoal] = useState<string | null>(profile?.goal ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await updateProfile({ area, goal })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos salvar agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={560}>
      <Kicker color="var(--p2)" style={{ marginBottom: 14 }}>
        Duas perguntas
      </Kicker>
      <h3
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 26,
          lineHeight: 1.22,
          letterSpacing: '-.025em',
          margin: '0 0 10px',
        }}
      >
        Vamos deixar o Academy mais relevante para você?
      </h3>
      <p style={{ color: 'var(--tx2)', fontSize: 14, margin: '0 0 32px' }}>
        Leva quinze segundos e muda o que aparece na sua home.
      </p>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}

      <div
        style={{
          fontSize: 10.5,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--tx3)',
          marginBottom: 14,
        }}
      >
        Qual área você lidera?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 32 }}>
        {[...AREAS, 'Outra'].map((a) => (
          <Chip key={a} label={a} on={area === a} onClick={() => setArea(a)} />
        ))}
      </div>

      <div
        style={{
          fontSize: 10.5,
          letterSpacing: '.16em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--tx3)',
          marginBottom: 14,
        }}
      >
        O que você mais quer melhorar agora?
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 36 }}>
        {GOALS.map((g) => (
          <Chip key={g} label={g} on={goal === g} onClick={() => setGoal(g)} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
        <button
          onClick={save}
          disabled={busy}
          style={{
            flex: 1,
            background: 'linear-gradient(180deg,#8a5cff,var(--p))',
            border: 'none',
            color: '#fff',
            borderRadius: 999,
            padding: '14px 0',
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {busy && <Spinner size={14} color="#fff" />}
          Salvar
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 'none',
            background: 'transparent',
            border: '1px solid var(--line2)',
            color: 'var(--tx2)',
            borderRadius: 999,
            padding: '14px 24px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Depois
        </button>
      </div>
    </Modal>
  )
}
