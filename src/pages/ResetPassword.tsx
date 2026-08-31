import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { applyTheme, getStoredTheme } from '../lib/theme'
import { Banner, inputStyle, Spinner } from '../components/ui'

/** Destino do link enviado por resetPasswordForEmail. */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    applyTheme(getStoredTheme())
    // O link do e-mail cria uma sessão de recuperação.
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session))
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)

    if (err) setError(err.message)
    else navigate('/', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: 'var(--bg)',
      }}
    >
      <form onSubmit={submit} className="k-fade" style={{ width: '100%', maxWidth: 400 }}>
        <h1
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '-.025em',
            margin: '0 0 10px',
          }}
        >
          Nova senha
        </h1>
        <p style={{ color: 'var(--tx2)', margin: '0 0 28px', fontSize: 14 }}>
          Escolha uma senha para voltar ao Academy.
        </p>

        {!ready && (
          <div style={{ marginBottom: 18 }}>
            <Banner kind="info">
              Abra esta página pelo link que enviamos por e-mail. Sem ele não conseguimos
              identificar a conta.
            </Banner>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 18 }}>
            <Banner kind="error">{error}</Banner>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nova senha"
            autoComplete="new-password"
            style={{ ...inputStyle, padding: '15px 18px' }}
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            style={{ ...inputStyle, padding: '15px 18px' }}
          />
        </div>

        <button
          type="submit"
          disabled={busy || !ready}
          style={{
            width: '100%',
            background: 'linear-gradient(180deg,#8a5cff,var(--p))',
            border: 'none',
            color: '#fff',
            borderRadius: 999,
            padding: '15px 0',
            fontSize: 14,
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
          Salvar senha
        </button>
      </form>
    </div>
  )
}
