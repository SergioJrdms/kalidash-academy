import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { initials } from '../lib/format'
import { Banner, GhostButton, inputStyle, Spinner, Tag } from '../components/ui'
import PersonalizationModal from '../components/PersonalizationModal'

const AI_LEAGUE_URL = import.meta.env.VITE_AI_LEAGUE_URL as string | undefined

export default function Perfil() {
  const { profile, isPaid, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [showPers, setShowPers] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile({
        full_name: fullName.trim() || null,
        company: company.trim() || null,
      })
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos salvar agora.')
    } finally {
      setBusy(false)
    }
  }

  const rows = [
    { label: 'Área que lidera', value: profile?.area ?? 'Ainda não informado', edit: true },
    { label: 'Quer melhorar', value: profile?.goal ?? 'Ainda não informado', edit: true },
  ]

  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 880 }}>
      <h1
        className="k-h1"
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 31,
          lineHeight: 1.16,
          letterSpacing: '-.03em',
          margin: '0 0 44px',
        }}
      >
        Perfil
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div
          style={{
            flex: 'none',
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'var(--sf2)',
            border: '1px solid var(--line2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 19,
            color: 'var(--p2)',
          }}
        >
          {initials(profile?.full_name ?? 'U')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '-.015em',
              marginBottom: 5,
            }}
          >
            {profile?.full_name || 'Usuário'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--tx2)' }}>
            {[profile?.area, profile?.company].filter(Boolean).join(' · ') ||
              profile?.email ||
              'Complete seu perfil'}
          </div>
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--p2)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="error">{error}</Banner>
        </div>
      )}
      {saved && (
        <div style={{ marginBottom: 20 }}>
          <Banner kind="ok">Perfil atualizado.</Banner>
        </div>
      )}

      {editing && (
        <div
          style={{
            border: '1px solid var(--line)',
            background: 'var(--sf)',
            borderRadius: 18,
            padding: 22,
            marginBottom: 32,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome"
            style={inputStyle}
          />
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Empresa"
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => void save()}
              disabled={busy}
              style={{
                background: 'linear-gradient(180deg,#8a5cff,var(--p))',
                border: 'none',
                color: '#fff',
                borderRadius: 999,
                padding: '11px 26px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--glow)',
                display: 'flex',
                alignItems: 'center',
                gap: 9,
              }}
            >
              {busy && <Spinner size={13} color="#fff" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          background: 'var(--line)',
          border: '1px solid var(--line)',
          borderRadius: 18,
          overflow: 'hidden',
          marginBottom: 32,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              background: 'var(--sf)',
              padding: '18px 22px',
            }}
          >
            <span style={{ flex: 'none', width: 150, fontSize: 12.5, color: 'var(--tx3)' }}>
              {r.label}
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, minWidth: 0 }}>
              {r.value}
            </span>
            <button
              onClick={() => setShowPers(true)}
              style={{
                flex: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--p2)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Alterar
            </button>
          </div>
        ))}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            background: 'var(--sf)',
            padding: '18px 22px',
          }}
        >
          <span style={{ flex: 'none', width: 150, fontSize: 12.5, color: 'var(--tx3)' }}>
            Acesso
          </span>
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>
            {isPaid ? 'Conteúdos pagos liberados' : 'Conteúdos gratuitos'}
          </span>
          <Tag kind={isPaid ? 'paid' : 'free'} style={{ fontSize: 9.5, padding: '4px 10px' }} />
        </div>
      </div>

      <div
        style={{
          fontSize: 13.5,
          color: 'var(--tx2)',
          lineHeight: 1.6,
          marginBottom: 14,
          maxWidth: 520,
        }}
      >
        {isPaid
          ? 'Você tem acesso aos conteúdos pagos do Academy, incluindo materiais e aplicações.'
          : 'Você tem acesso aos conteúdos gratuitos do Academy. Eles não são demonstração: dão para aprender e aplicar de verdade.'}
      </div>

      {!isPaid && (
        <div style={{ marginBottom: 44 }}>
          <GhostButton onClick={() => navigate('/conteudos?tab=explorar')}>
            Explorar conteúdos pagos
          </GhostButton>
        </div>
      )}

      <div
        className="k-stack-mobile"
        style={{
          borderTop: '1px solid var(--line)',
          paddingTop: 34,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 700,
              fontSize: 16.5,
              marginBottom: 6,
            }}
          >
            Faça parte da AI League
          </div>
          <div
            style={{ fontSize: 13, color: 'var(--tx2)', maxWidth: 420, lineHeight: 1.55 }}
          >
            Continue a conversa com outros gestores que estão aplicando isso na operação.
          </div>
        </div>
        {AI_LEAGUE_URL ? (
          <a
            href={AI_LEAGUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="k-hoverable"
            style={{
              flex: 'none',
              background: 'transparent',
              border: '1px solid var(--line2)',
              color: 'var(--tx)',
              borderRadius: 999,
              padding: '11px 22px',
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Abrir WhatsApp
          </a>
        ) : (
          <span style={{ flex: 'none', fontSize: 12, color: 'var(--tx3)' }}>
            Link em configuração
          </span>
        )}
      </div>

      {showPers && (
        <PersonalizationModal
          onClose={() => setShowPers(false)}
          onSaved={() => void refreshProfile()}
        />
      )}
    </div>
  )
}
