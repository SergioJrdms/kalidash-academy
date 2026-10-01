import type { CSSProperties, ReactNode } from 'react'

// ---------------------------------------------------------------------
// Ícone — traço fino, como o design do Figma
// ---------------------------------------------------------------------
export function Icon({
  d,
  size = 18,
  stroke = 'currentColor',
  width = 1.5,
  fill = 'none',
  style,
}: {
  d: string
  size?: number
  stroke?: string
  width?: number
  fill?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? stroke : 'none'}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', ...style }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export function LockIcon({ size = 14, color = 'var(--tx3)' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      style={{ flex: 'none' }}
      aria-hidden="true"
    >
      <path d="M7 11V8a5 5 0 1110 0v3" />
      <rect x="5" y="11" width="14" height="9" rx="2" />
    </svg>
  )
}

// ---------------------------------------------------------------------
// Botões — raio 10px, sem sombra, como especificado
// ---------------------------------------------------------------------
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  style,
  full,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  full?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'var(--imperial)',
        border: 'none',
        color: 'var(--bg)',
        borderRadius: 'var(--r-control)',
        padding: '11px 24px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        width: full ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        transition: 'opacity .18s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  disabled,
  type = 'button',
  style,
  full,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  full?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="k-hoverable"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line2)',
        color: 'var(--tx)',
        borderRadius: 'var(--r-control)',
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        width: full ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/** Link textual em bronze — usado para "Ver todos", "Esqueci minha senha". */
export function TextLink({
  children,
  onClick,
  style,
}: {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--bronze)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------
export type TagKind = 'free' | 'paid' | 'soon' | 'unlocked' | 'draft' | 'skill'

export function tagFor(kind: TagKind): { label: string; bg: string; fg: string } {
  switch (kind) {
    case 'free':
      return { label: 'GRATUITO', bg: 'var(--oksoft)', fg: 'var(--ok)' }
    case 'unlocked':
      return { label: 'LIBERADO', bg: 'var(--oksoft)', fg: 'var(--ok)' }
    case 'paid':
      return { label: 'PREMIUM', bg: '#f3eee3', fg: 'var(--bronze)' }
    case 'soon':
      return { label: 'EM BREVE', bg: 'var(--surface2)', fg: 'var(--tx2)' }
    case 'draft':
      return { label: 'RASCUNHO', bg: 'var(--surface2)', fg: 'var(--tx2)' }
    case 'skill':
      return { label: '', bg: 'var(--surface2)', fg: 'var(--tx2)' }
  }
}

export function Tag({
  kind,
  label,
  style,
}: {
  kind: TagKind
  label?: string
  style?: CSSProperties
}) {
  const t = tagFor(kind)
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        padding: '4px 9px',
        borderRadius: 6,
        background: t.bg,
        color: t.fg,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {label ?? t.label}
    </span>
  )
}

/** Pílula de competência — "Estratégia", "Liderança", "AI Literacy". */
export function SkillChip({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        padding: '5px 11px',
        borderRadius: 999,
        background: 'var(--surface2)',
        border: '0.8px solid var(--line)',
        color: 'var(--tx2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

export function Kicker({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className="k-kicker" style={style}>
      {children}
    </div>
  )
}

export function Avatar({
  name,
  size = 32,
  fontSize,
}: {
  name: string
  size?: number
  fontSize?: number
}) {
  return (
    <div
      style={{
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--imperial)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: fontSize ?? Math.round(size * 0.36),
        color: 'var(--bg)',
        letterSpacing: '0.02em',
      }}
    >
      {name}
    </div>
  )
}

/** Miniatura de conteúdo. Sem imagem, cai num tom de pedra sóbrio. */
export function CourseThumb({
  imageUrl,
  width,
  height,
  radius = 12,
  badge,
  locked,
  className,
}: {
  iconPath?: string
  imageUrl?: string | null
  width?: number | string
  height: number | string
  radius?: number
  badge?: string
  locked?: boolean
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        flex: 'none',
        width: width ?? '100%',
        height,
        borderRadius: radius,
        background: imageUrl
          ? `center/cover no-repeat url(${JSON.stringify(imageUrl)})`
          : 'linear-gradient(145deg,#e8e1d6,#d1cbc2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '4px 9px',
            borderRadius: 6,
            background: 'rgba(255,255,255,.92)',
            color: 'var(--tx)',
          }}
        >
          {badge}
        </span>
      )}
      {locked && (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'rgba(255,255,255,.92)',
            borderRadius: 6,
            padding: 5,
            display: 'flex',
          }}
        >
          <LockIcon size={13} color="var(--tx2)" />
        </div>
      )}
    </div>
  )
}

export function ProgressBar({
  percent,
  height = 5,
  maxWidth,
  color = 'var(--bronze)',
}: {
  percent: number
  height?: number
  maxWidth?: number | string
  color?: string
}) {
  return (
    <div
      style={{
        flex: 1,
        maxWidth,
        height,
        borderRadius: 999,
        background: 'var(--line)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 999,
          background: color,
          width: `${Math.max(0, Math.min(100, percent))}%`,
          transition: 'width .3s ease',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------
export function Skeleton({
  height,
  width = '100%',
  radius = 16,
  style,
}: {
  height: number | string
  width?: number | string
  radius?: number
  style?: CSSProperties
}) {
  return <div className="k-skel" style={{ height, width, borderRadius: radius, ...style }} />
}

export function PageLoading() {
  return (
    <div style={{ padding: '56px 56px 100px', maxWidth: 1180 }} className="k-page">
      <Skeleton height={52} width="55%" style={{ marginBottom: 16 }} />
      <Skeleton height={20} width="40%" style={{ marginBottom: 48 }} />
      <Skeleton height={180} style={{ marginBottom: 20 }} />
      <Skeleton height={130} style={{ marginBottom: 14 }} />
      <Skeleton height={130} />
    </div>
  )
}

export function ErrorState({
  title = 'Algo não carregou',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      className="k-card"
      style={{ padding: 32, textAlign: 'center', maxWidth: 520 }}
    >
      <div className="k-display k-h3" style={{ marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--tx2)', marginBottom: onRetry ? 22 : 0 }}>
        {message}
      </div>
      {onRetry && <GhostButton onClick={onRetry}>Tentar de novo</GhostButton>}
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--line2)',
        borderRadius: 'var(--r-card)',
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div className="k-display k-h3" style={{ marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--tx2)' }}>{message}</div>
    </div>
  )
}

export function Spinner({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <span
      className="k-spin"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        flex: 'none',
      }}
    />
  )
}

// ---------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------
export function Modal({
  children,
  onClose,
  maxWidth = 560,
}: {
  children: ReactNode
  onClose: () => void
  maxWidth?: number
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(14,10,20,.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="k-pop"
        style={{
          width: '100%',
          maxWidth,
          margin: 'auto',
          background: 'var(--surface)',
          border: '0.8px solid var(--line)',
          borderRadius: 20,
          padding: 36,
          boxShadow: '0 24px 60px rgba(14,10,20,.18)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------
export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--surface)',
  border: '1px solid var(--line2)',
  borderRadius: 'var(--r-control)',
  padding: '12px 14px',
  color: 'var(--tx)',
  fontSize: 15,
  outline: 'none',
}

export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string
  hint?: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <label style={{ display: 'block', ...style }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--tx)',
          marginBottom: 7,
        }}
      >
        {label}
      </div>
      {children}
      {hint && <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 6 }}>{hint}</div>}
    </label>
  )
}

export function Banner({
  kind,
  children,
}: {
  kind: 'error' | 'ok' | 'info'
  children: ReactNode
}) {
  const map = {
    error: { bg: 'var(--dangersoft)', fg: 'var(--danger)', bd: '#e8cdc9' },
    ok: { bg: 'var(--oksoft)', fg: 'var(--ok)', bd: '#c9e0d4' },
    info: { bg: '#f3eee3', fg: 'var(--bronze)', bd: '#e5dcc9' },
  }[kind]

  return (
    <div
      style={{
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        borderRadius: 'var(--r-control)',
        padding: '12px 16px',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}
