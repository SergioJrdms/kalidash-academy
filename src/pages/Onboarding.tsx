import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AREAS, GOALS, LEVELS } from '../types/db'
import { Banner, Icon, Spinner } from '../components/ui'
import { NAV_ICON } from '../lib/icons'
import { track } from '../lib/analytics'

const STEPS = ['Área de atuação', 'Objetivo', 'Nível'] as const

type Option = { value: string; title: string; hint: string; icon: string }

const AREA_OPTIONS: Option[] = [
  { value: 'Liderança', title: 'Liderança', hint: 'Estratégia e tomada de decisão', icon: NAV_ICON.perfil },
  { value: 'Operações', title: 'Operações', hint: 'Processos e execução', icon: NAV_ICON.jornada },
  { value: 'Tecnologia', title: 'Tecnologia', hint: 'Infraestrutura e dados', icon: 'M8 6l-5 6 5 6M16 6l5 6-5 6' },
  { value: 'Financeiro', title: 'Financeiro', hint: 'Planejamento e controle', icon: 'M4 18h16M6 14l4-5 3.5 3L19 6' },
  { value: 'RH', title: 'RH', hint: 'Pessoas e cultura', icon: NAV_ICON.comunidade },
  { value: 'Comercial', title: 'Comercial', hint: 'Vendas e crescimento', icon: NAV_ICON.check },
  { value: 'Marketing', title: 'Marketing', hint: 'Comunicação e posicionamento', icon: 'M3 8h18M3 8v11h18V8M3 8l3-4h12l3 4' },
  { value: 'Jurídico', title: 'Jurídico', hint: 'Riscos e compliance', icon: 'M12 3v18M5 7h14' },
  { value: 'Outro', title: 'Outro', hint: 'Outra área de atuação', icon: NAV_ICON.spark },
]

const GOAL_OPTIONS: Option[] = GOALS.map((g) => ({
  value: g.value,
  title: g.value,
  hint: g.hint,
  icon: g.icon,
}))

const LEVEL_OPTIONS: Option[] = LEVELS.map((l) => ({
  value: l.value,
  title: l.value,
  hint: l.hint,
  icon: NAV_ICON.level,
}))

export default function Onboarding() {
  const { updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [area, setArea] = useState<string | null>(null)
  const [goal, setGoal] = useState<string | null>(null)
  const [level, setLevel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const options = step === 0 ? AREA_OPTIONS : step === 1 ? GOAL_OPTIONS : LEVEL_OPTIONS
  const selected = step === 0 ? area : step === 1 ? goal : level
  const pick = step === 0 ? setArea : step === 1 ? setGoal : setLevel

  const titles = [
    { h: 'Onde você atua?', p: 'Isso nos ajuda a personalizar sua experiência na Academy.' },
    { h: 'O que você quer melhorar?', p: 'Vamos priorizar os conteúdos que levam até lá.' },
    { h: 'Qual seu nível com IA?', p: 'Para começar no ponto certo, sem repetir o que você já sabe.' },
  ][step]

  async function finish(skipped: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (!skipped) {
        await updateProfile({ area, goal, level })
        track('onboarding_completed', { area, goal, level })
      } else {
        track('onboarding_skipped', { etapa: step + 1 })
      }
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não conseguimos salvar agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* ---------- barra de etapas ---------- */}
      <header
        style={{
          background: 'var(--surface)',
          borderBottom: '0.8px solid var(--line)',
          padding: '18px 40px',
          display: 'flex',
          alignItems: 'center',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M3 2h5l-5 11z" fill="var(--champagne)" />
            <path d="M3 13l5-11h3L5 13l6 11H8z" fill="var(--imperial)" />
            <path d="M13 2h3v9l7-9h4l-8 10 8 12h-4l-7-10v10h-3z" fill="var(--imperial)" />
          </svg>
          <div style={{ lineHeight: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              Kalidash
            </div>
            <div
              style={{
                fontSize: 8.5,
                fontWeight: 600,
                letterSpacing: '0.26em',
                color: 'var(--tx2)',
                marginTop: 3,
                textAlign: 'right',
              }}
            >
              ACADEMY
            </div>
          </div>
        </div>

        <div
          className="k-hide-mobile"
          style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 1, justifyContent: 'center' }}
        >
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', width: 110 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    margin: '0 auto 7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    background: i <= step ? 'var(--imperial)' : 'transparent',
                    border: i <= step ? 'none' : '1px solid var(--line2)',
                    color: i <= step ? 'var(--bg)' : 'var(--tx3)',
                  }}
                >
                  {i < step ? <Icon d={NAV_ICON.check} size={14} width={2.2} /> : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: i === step ? 'var(--tx)' : 'var(--tx2)',
                    fontWeight: i === step ? 600 : 400,
                  }}
                >
                  {label}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 56, height: 1, background: 'var(--line2)', marginBottom: 20 }} />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => void finish(true)}
          disabled={busy}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--tx2)',
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          Pular por agora
        </button>
      </header>

      {/* ---------- conteúdo ---------- */}
      <div className="k-page" style={{ padding: '48px 40px 120px', maxWidth: 1080 }}>
        <div className="k-kicker" style={{ marginBottom: 14 }}>
          Etapa {step + 1} de {STEPS.length}
        </div>
        <h1 className="k-display k-h1" style={{ marginBottom: 10 }}>
          {titles.h}
        </h1>
        <p style={{ color: 'var(--tx2)', fontSize: 15.5, margin: '0 0 36px' }}>{titles.p}</p>

        {error && (
          <div style={{ marginBottom: 24, maxWidth: 520 }}>
            <Banner kind="error">{error}</Banner>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))',
            gap: 16,
            marginBottom: 40,
          }}
        >
          {options.map((o) => {
            const on = selected === o.value
            return (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                style={{
                  textAlign: 'left',
                  background: 'var(--surface)',
                  border: `1px solid ${on ? 'var(--imperial)' : 'var(--line)'}`,
                  boxShadow: on ? '0 0 0 1px var(--imperial)' : 'none',
                  borderRadius: 'var(--r-card)',
                  padding: '18px 18px 20px',
                  cursor: 'pointer',
                  transition: 'border-color .18s, box-shadow .18s',
                }}
              >
                <Icon
                  d={o.icon}
                  size={20}
                  stroke={on ? 'var(--imperial)' : 'var(--tx2)'}
                  style={{ marginBottom: 14 }}
                />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{o.title}</div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.45 }}>{o.hint}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- rodapé fixo ---------- */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--surface)',
          borderTop: '0.8px solid var(--line)',
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--tx2)',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon d="M19 12H6M11 6l-6 6 6 6" size={16} />
          Voltar
        </button>

        <button
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : void finish(false))}
          disabled={!selected || busy}
          style={{
            background: selected ? 'var(--imperial)' : 'var(--line)',
            border: 'none',
            color: selected ? 'var(--bg)' : 'var(--tx3)',
            borderRadius: 'var(--r-control)',
            padding: '11px 26px',
            fontSize: 14,
            fontWeight: 600,
            cursor: selected ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          {busy && <Spinner size={14} color="var(--bg)" />}
          {step < STEPS.length - 1 ? 'Continuar' : 'Concluir'}
          <Icon d={NAV_ICON.arrow} size={16} />
        </button>
      </div>
    </div>
  )
}
