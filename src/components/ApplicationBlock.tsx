import { NAV_ICON } from '../lib/icons'
import { Icon, Spinner } from './ui'

/**
 * "Aplique no seu trabalho" — o componente central do Academy.
 * Visual preservado do protótipo; o estado vem de lesson_progress.applied_at.
 */
export default function ApplicationBlock({
  title,
  minutes,
  steps,
  note,
  applied,
  busy,
  disabled,
  onToggle,
}: {
  title: string
  minutes: number | null
  steps: string[]
  note: string | null
  applied: boolean
  busy?: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div
      style={{
        border: '1px solid var(--pline)',
        background: 'linear-gradient(140deg,rgba(115,67,251,.13),transparent 78%)',
        borderRadius: 24,
        padding: '34px 36px',
        marginBottom: 40,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -70,
          top: -70,
          width: 220,
          height: 220,
          border: '1px solid var(--pline)',
          borderRadius: '50%',
          opacity: 0.55,
        }}
      />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Icon d={NAV_ICON.spark} size={17} stroke="var(--p2)" width={1.9} />
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--p2)',
            }}
          >
            Aplique no seu trabalho
          </span>
        </div>

        <div
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1.28,
            letterSpacing: '-.015em',
            marginBottom: 6,
            maxWidth: 520,
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 26 }}>
          {minutes ? `${minutes} minutos · ` : ''}use a sua própria operação, não um exemplo
          fictício
        </div>

        {steps.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 15,
              marginBottom: 28,
            }}
          >
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span
                  style={{
                    flex: 'none',
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: 'var(--sf)',
                    border: '1px solid var(--pline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Raleway,sans-serif',
                    fontWeight: 700,
                    fontSize: 11,
                    color: 'var(--p2)',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14.5, lineHeight: 1.55, paddingTop: 2 }}>{step}</span>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            paddingTop: 24,
            borderTop: '1px solid var(--line)',
          }}
        >
          <button
            onClick={onToggle}
            disabled={busy || disabled}
            style={{
              background: applied ? 'var(--oksoft)' : 'var(--sf)',
              border: `1px solid ${applied ? 'var(--line)' : 'var(--pline)'}`,
              color: applied ? 'var(--ok)' : 'var(--tx)',
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {busy ? (
              <Spinner size={15} />
            ) : (
              <Icon d={NAV_ICON.check} size={15} width={2.3} />
            )}
            {applied ? 'Aplicado à sua operação' : 'Marcar como aplicado'}
          </button>

          <span
            style={{
              fontSize: 12.5,
              color: applied ? 'var(--ok)' : 'var(--tx3)',
              maxWidth: 380,
              lineHeight: 1.5,
            }}
          >
            {applied
              ? 'Você não só assistiu. Levou o aprendizado para o trabalho.'
              : (note ?? '')}
          </span>
        </div>
      </div>
    </div>
  )
}
