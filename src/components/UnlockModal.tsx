import { Kicker, Modal } from './ui'

/**
 * Não existe checkout na V1. Este modal explica o acesso pago e,
 * se VITE_UNLOCK_URL estiver configurada, leva o usuário para lá.
 */
export default function UnlockModal({
  courseTitle,
  onClose,
}: {
  courseTitle: string
  onClose: () => void
}) {
  const unlockUrl = import.meta.env.VITE_UNLOCK_URL as string | undefined

  const items = [
    'Todas as aulas deste conteúdo',
    'Materiais para baixar e levar ao time',
    'As aplicações práticas de cada aula',
  ]

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <Kicker color="var(--p2)" style={{ marginBottom: 14 }}>
        Desbloquear acesso
      </Kicker>
      <h3
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 1.24,
          letterSpacing: '-.025em',
          margin: '0 0 12px',
        }}
      >
        {courseTitle}
      </h3>
      <p
        style={{
          color: 'var(--tx2)',
          fontSize: 13.5,
          margin: '0 0 28px',
          lineHeight: 1.6,
        }}
      >
        Este conteúdo faz parte do acesso pago do Academy. Você já viu a estrutura completa; ao
        liberar, as aulas, os materiais e as aplicações abrem para a sua conta.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 30 }}>
        {items.map((t) => (
          <div key={t} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--p2)"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: 'none', marginTop: 3 }}
            >
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{t}</span>
          </div>
        ))}
      </div>

      {unlockUrl ? (
        <a
          href={unlockUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            textAlign: 'center',
            width: '100%',
            background: 'linear-gradient(180deg,#8a5cff,var(--p))',
            color: '#fff',
            borderRadius: 999,
            padding: '14px 0',
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: 'var(--glow)',
          }}
        >
          Falar com a Kalidash
        </a>
      ) : (
        <div
          style={{
            background: 'var(--psoft)',
            border: '1px solid var(--pline)',
            borderRadius: 16,
            padding: '16px 18px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--tx2)',
          }}
        >
          Fale com o time da Kalidash para liberar o acesso pago na sua conta.
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          width: '100%',
          marginTop: 10,
          background: 'transparent',
          border: 'none',
          color: 'var(--tx3)',
          borderRadius: 999,
          padding: '11px 0',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Voltar
      </button>
    </Modal>
  )
}
