import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { applyTheme, getStoredTheme } from '../lib/theme'
import { Banner, inputStyle, Spinner } from '../components/ui'

type Mode = 'signin' | 'signup' | 'reset'

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
    applyTheme(getStoredTheme())
  }, [])

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
          setNotice(
            'Conta criada. Confirme o e-mail que acabamos de enviar e depois faça login.',
          )
          setMode('signin')
        } else {
          navigate('/', { replace: true })
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

  const titles: Record<Mode, { h: string; p: string; cta: string }> = {
    signin: {
      h: 'Entrar no Academy',
      p: 'Comece pelos conteúdos gratuitos. Sem cartão, sem configuração.',
      cta: 'Entrar',
    },
    signup: {
      h: 'Criar sua conta',
      p: 'Leva menos de um minuto. Os conteúdos gratuitos abrem na hora.',
      cta: 'Criar conta gratuita',
    },
    reset: {
      h: 'Redefinir a senha',
      p: 'Enviamos um link para você criar uma nova senha.',
      cta: 'Enviar link',
    },
  }
  const t = titles[mode]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        className="k-hide-mobile"
        style={{
          flex: '0 0 44%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(165deg,#1B1029 0%,#0C0713 66%)',
          padding: '56px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px,transparent 1px)',
            backgroundSize: '24px 24px',
            opacity: 0.5,
          }}
        />
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '.03em',
              color: '#fff',
            }}
          >
            KALIDASH<span style={{ color: 'var(--p2)' }}> ACADEMY</span>
          </div>
          <div
            style={{
              height: 1,
              background: 'var(--line2)',
              margin: '24px 0 20px',
              width: 56,
            }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: '#A49CB3',
              fontWeight: 600,
            }}
          >
            Conhecimento que vira operação
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 700,
              fontSize: 40,
              lineHeight: 1.12,
              letterSpacing: '-.03em',
              color: '#fff',
              maxWidth: 400,
            }}
          >
            Aprenda.
            <br />
            Aplique.
            <br />
            Continue.
          </div>
          <p
            style={{
              color: '#A49CB3',
              maxWidth: 390,
              margin: '24px 0 0',
              fontSize: 14.5,
              lineHeight: 1.68,
            }}
          >
            Você já sabe trabalhar. O Academy existe para reduzir trabalho manual e devolver
            espaço para pensar — usando a sua própria operação como laboratório.
          </p>
        </div>
        <div style={{ position: 'relative', fontSize: 12, color: '#6C6480' }}>
          Feito por gente que trabalha com operação de verdade.
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <form onSubmit={submit} className="k-fade" style={{ width: '100%', maxWidth: 400 }}>
          <h1
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1.2,
              letterSpacing: '-.025em',
              margin: '0 0 10px',
            }}
          >
            {t.h}
          </h1>
          <p style={{ color: 'var(--tx2)', margin: '0 0 28px', fontSize: 14 }}>{t.p}</p>

          {(error || notice) && (
            <div style={{ marginBottom: 18 }}>
              <Banner kind={error ? 'error' : 'ok'}>{error ?? notice}</Banner>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
            {mode === 'signup' && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                style={{ ...inputStyle, padding: '15px 18px' }}
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              style={{ ...inputStyle, padding: '15px 18px' }}
            />
            {mode !== 'reset' && (
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                style={{ ...inputStyle, padding: '15px 18px' }}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={busy}
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
            {busy ? 'Aguarde...' : t.cta}
          </button>

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
              className="k-hoverable"
              style={{
                width: '100%',
                marginTop: 11,
                background: 'transparent',
                border: '1px solid var(--line2)',
                color: 'var(--tx)',
                borderRadius: 999,
                padding: '14px 0',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Criar conta gratuita
            </button>
          )}

          {mode !== 'signin' && (
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError(null)
              }}
              style={{
                width: '100%',
                marginTop: 11,
                background: 'transparent',
                border: 'none',
                color: 'var(--tx3)',
                padding: '12px 0',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Voltar para o login
            </button>
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => {
                setMode('reset')
                setError(null)
              }}
              style={{
                width: '100%',
                marginTop: 14,
                background: 'transparent',
                border: 'none',
                color: 'var(--tx3)',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Esqueci minha senha
            </button>
          )}

          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--tx3)',
              marginTop: 24,
            }}
          >
            Ao entrar você já tem acesso aos conteúdos gratuitos.
          </div>
        </form>
      </div>
    </div>
  )
}
