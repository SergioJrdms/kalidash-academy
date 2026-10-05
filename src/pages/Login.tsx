import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Banner, Field, inputStyle, Spinner } from '../components/ui'

type Mode = 'signin' | 'signup' | 'reset'

/** Marca em versão clara, para o painel do formulário. */
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width="34" height="34" viewBox="0 0 26 26" aria-hidden="true">
        <path d="M3 2h5l-5 11z" fill="var(--champagne)" />
        <path d="M3 13l5-11h3L5 13l6 11H8z" fill="var(--imperial)" />
        <path d="M13 2h3v9l7-9h4l-8 10 8 12h-4l-7-10v10h-3z" fill="var(--imperial)" />
      </svg>
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 27,
            letterSpacing: '-0.01em',
          }}
        >
          Kalidash
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.28em',
            color: 'var(--tx2)',
            marginTop: 4,
            textAlign: 'right',
          }}
        >
          ACADEMY
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { signIn, signUp, resetPassword, session } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        navigate('/', { replace: true })
      } else if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Diga como podemos te chamar.')
        const { needsConfirmation } = await signUp(email.trim(), password, fullName.trim())
        if (needsConfirmation) {
          setNotice('Conta criada. Confirme o e-mail que enviamos e depois entre.')
          setMode('signin')
        } else {
          navigate('/onboarding', { replace: true })
        }
      } else {
        await resetPassword(email.trim())
        setNotice('Se existe conta com esse e-mail, o link de redefinição já está a caminho.')
        setMode('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.')
    } finally {
      setBusy(false)
    }
  }

  const copy =
    mode === 'reset'
      ? { h: 'Redefinir a senha', p: 'Enviamos um link para você criar uma nova senha.', cta: 'Enviar link' }
      : mode === 'signup'
        ? { h: 'Criar sua conta', p: 'Leva menos de um minuto. Os conteúdos gratuitos abrem na hora.', cta: 'Criar conta' }
        : { h: 'Bem-vinda de volta', p: 'Acesse sua conta para continuar sua jornada na Kalidash Academy.', cta: 'Entrar na Academy' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ---------- painel editorial ---------- */}
      <div
        className="k-hide-mobile"
        style={{
          flex: '0 0 57%',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--hero-bg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '56px 60px',
        }}
      >
        <img
          src="/brand/login-hero.jpg"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.85,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(rgba(14,10,20,.72) 0%, rgba(14,10,20,.1) 30%, rgba(14,10,20,.1) 55%, rgba(14,10,20,.86) 100%)',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 560 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              marginBottom: 26,
            }}
          >
            <span style={{ width: 28, height: 1, background: 'rgba(241,236,228,.5)' }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(241,236,228,.72)',
              }}
            >
              Conhecimento que vira operação
            </span>
          </div>

          <h1
            className="k-display"
            style={{
              fontSize: 72,
              lineHeight: 1.04,
              color: 'var(--hero-fg)',
              margin: '0 0 24px',
            }}
          >
            Aprenda.
            <br />
            Aplique.
            <br />
            <em style={{ color: 'var(--champagne)', fontStyle: 'italic' }}>Continue.</em>
          </h1>

          <p
            style={{
              color: 'rgba(241,236,228,.78)',
              fontSize: 16,
              lineHeight: 1.65,
              margin: 0,
              maxWidth: 440,
            }}
          >
            Desenvolva as competências necessárias para trabalhar com IA dentro da sua operação
            real.
          </p>
        </div>
      </div>

      {/* ---------- painel do formulário ---------- */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 40,
        }}
      >
        <form onSubmit={submit} className="k-fade" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <Logo />
          </div>

          {mode !== 'reset' && (
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--line)',
                marginBottom: 30,
              }}
            >
              {(
                [
                  ['Entrar', 'signin'],
                  ['Criar conta', 'signup'],
                ] as const
              ).map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setMode(key)
                    setError(null)
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${mode === key ? 'var(--imperial)' : 'transparent'}`,
                    color: mode === key ? 'var(--imperial)' : 'var(--tx2)',
                    padding: '12px 0',
                    fontSize: 14,
                    fontWeight: mode === key ? 600 : 400,
                    cursor: 'pointer',
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <h1 className="k-display k-h2" style={{ fontSize: 30, marginBottom: 8 }}>
            {copy.h}
          </h1>
          <p style={{ color: 'var(--tx2)', fontSize: 14.5, margin: '0 0 26px', lineHeight: 1.55 }}>
            {copy.p}
          </p>

          {(error || notice) && (
            <div style={{ marginBottom: 20 }}>
              <Banner kind={error ? 'error' : 'ok'}>{error ?? notice}</Banner>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {mode === 'signup' && (
              <Field label="Nome">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como podemos te chamar"
                  autoComplete="name"
                  style={inputStyle}
                />
              </Field>
            )}

            <Field label="E-mail">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                style={inputStyle}
              />
            </Field>

            {mode !== 'reset' && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 7,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Senha</span>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset')
                        setError(null)
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--bronze)',
                        fontSize: 12.5,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              background: 'var(--imperial)',
              border: 'none',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '13px 0',
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {busy && <Spinner size={14} color="var(--bg)" />}
            {busy ? 'Aguarde...' : copy.cta}
          </button>

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              style={{
                width: '100%',
                marginTop: 14,
                background: 'transparent',
                border: 'none',
                color: 'var(--tx2)',
                padding: '10px 0',
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Voltar para o login
            </button>
          )}

          {mode !== 'reset' && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--tx2)',
                marginTop: 28,
              }}
            >
              {mode === 'signin' ? (
                <>
                  Ainda não tem uma conta?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--tx)',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    Criar conta gratuita
                  </button>
                </>
              ) : (
                'Ao criar a conta você já tem acesso aos conteúdos gratuitos.'
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
