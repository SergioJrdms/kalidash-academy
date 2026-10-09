import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type OAuthProvider } from '../hooks/useAuth'
import { Banner, Field, inputStyle, Spinner } from '../components/ui'

type Mode = 'signin' | 'signup' | 'reset'

/** A marca, no arquivo original baixado do Figma. */
function Logo() {
  return (
    <img
      src="/brand/kalidash-academy.png"
      alt="Kalidash Academy"
      width={210}
      height={57}
      style={{ display: 'block', width: 210, height: 'auto' }}
    />
  )
}

/** Logotipos dos provedores, nas cores oficiais de cada um. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 002 24c0 3.6.9 6.9 2.3 9.8l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.2 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z" />
    </svg>
  )
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M12 1h10v10H12z" />
      <path fill="#00A4EF" d="M1 12h10v10H1z" />
      <path fill="#FFB900" d="M12 12h10v10H12z" />
    </svg>
  )
}

export default function Login() {
  const { signIn, signInWithProvider, signUp, resetPassword, session } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [social, setSocial] = useState<OAuthProvider | null>(null)

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  async function entrarCom(provider: OAuthProvider) {
    setError(null)
    setNotice(null)
    setSocial(provider)
    try {
      // Em caso de sucesso o navegador sai desta página, então não há
      // nada a fazer depois: a volta cai no onAuthStateChange.
      await signInWithProvider(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível continuar.')
      setSocial(null)
    }
  }

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

          {/* Login social. Redefinir senha nao tem a ver com provedor,
              entao essa secao some no modo reset. */}
          {mode !== 'reset' && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  margin: '26px 0 20px',
                }}
              >
                <span style={{ flex: 1, height: 1, background: 'var(--line2)' }} />
                <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>ou continue com</span>
                <span style={{ flex: 1, height: 1, background: 'var(--line2)' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <BotaoSocial
                  onClick={() => void entrarCom('google')}
                  carregando={social === 'google'}
                  marca={<GoogleMark />}
                  nome="Google"
                />
                <BotaoSocial
                  onClick={() => void entrarCom('azure')}
                  carregando={social === 'azure'}
                  marca={<MicrosoftMark />}
                  nome="Microsoft"
                />
              </div>
            </>
          )}

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

          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--tx3)',
              marginTop: 22,
              lineHeight: 1.7,
            }}
          >
            Ao continuar você aceita os{' '}
            <Link to="/termos" style={{ color: 'var(--tx2)' }}>
              Termos de Serviço
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" style={{ color: 'var(--tx2)' }}>
              Política de Privacidade
            </Link>
            .
          </div>
        </form>
      </div>
    </div>
  )
}

/** Botao de provedor: contorno leve, marca colorida e o nome. */
function BotaoSocial({
  onClick,
  carregando,
  marca,
  nome,
}: {
  onClick: () => void
  carregando: boolean
  marca: React.ReactNode
  nome: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={carregando}
      className="k-hoverable"
      style={{
        flex: 1,
        minWidth: 0,
        background: 'var(--surface)',
        border: '0.8px solid var(--line2)',
        borderRadius: 'var(--r-control)',
        padding: '12px 0',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--tx)',
        cursor: carregando ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      {carregando ? <Spinner size={14} color="var(--tx2)" /> : marca}
      {nome}
    </button>
  )
}
