import type { CSSProperties, ReactNode } from 'react'

// ---------------------------------------------------------------------
// Ícone: mesmo traçado do protótipo (stroke 1.6~2, linecap round)
// ---------------------------------------------------------------------
export function Icon({
  d,
  size = 18,
  stroke = 'currentColor',
  width = 1.6,
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

/** Cadeado — no protótipo é path + rect, então tem componente próprio. */
export function LockIcon({ size = 13, color = 'var(--tx3)' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
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
// Botões
// ---------------------------------------------------------------------
const PRIMARY: CSSProperties = {
  background: 'linear-gradient(180deg,#8a5cff,var(--p))',
  border: 'none',
  color: '#fff',
  borderRadius: 999,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: 'var(--glow)',
}

const GHOST: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line2)',
  color: 'var(--tx)',
  borderRadius: 999,
  fontWeight: 600,
  cursor: 'pointer',
}

const SOFT: CSSProperties = {
  background: 'var(--psoft)',
  border: '1px solid var(--pline)',
  color: 'var(--p2)',
  borderRadius: 999,
  fontWeight: 600,
  cursor: 'pointer',
}

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
        ...PRIMARY,
        padding: '14px 30px',
        fontSize: 13.5,
        width: full ? '100%' : undefined,
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
        ...GHOST,
        padding: '12px 26px',
        fontSize: 12.5,
        width: full ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function SoftButton({
  children,
  onClick,
  disabled,
  style,
  full,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  style?: CSSProperties
  full?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...SOFT,
        padding: '9px 18px',
        fontSize: 12,
        width: full ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------
// Tags e kickers
// ---------------------------------------------------------------------
export type TagKind = 'free' | 'paid' | 'soon' | 'unlocked' | 'draft'

export function tagFor(kind: TagKind): { label: string; bg: string; fg: string } {
  switch (kind) {
    case 'free':
      return { label: 'GRATUITO', bg: 'var(--oksoft)', fg: 'var(--ok)' }
    case 'unlocked':
      return { label: 'LIBERADO', bg: 'var(--oksoft)', fg: 'var(--ok)' }
    case 'paid':
      return { label: 'PAGO', bg: 'var(--psoft)', fg: 'var(--p2)' }
    case 'soon':
      return { label: 'EM BREVE', bg: 'var(--sf2)', fg: 'var(--tx3)' }
    case 'draft':
      return { label: 'RASCUNHO', bg: 'var(--sf2)', fg: 'var(--tx3)' }
  }
}

export function Tag({ kind, style }: { kind: TagKind; style?: CSSProperties }) {
  const t = tagFor(kind)
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '.08em',
        padding: '3px 9px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: '1px solid var(--line)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {t.label}
    </span>
  )
}

export function Kicker({
  children,
  color = 'var(--tx3)',
  style,
}: {
  children: ReactNode
  color?: string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        fontSize: 10.5,
        letterSpacing: '.18em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Avatar({
  name,
  size = 30,
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
        background: 'linear-gradient(150deg,#2C1C40,#171021)',
        border: '1px solid var(--line2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Raleway,sans-serif',
        fontWeight: 700,
        fontSize: fontSize ?? Math.round(size * 0.34),
        color: 'var(--p2)',
      }}
    >
      {name}
    </div>
  )
}

/** Miniatura padrão do protótipo: gradiente + hachura + ícone de área. */
export function CourseThumb({
  iconPath,
  imageUrl,
  width,
  height,
  radius = 14,
  label,
  locked,
  className,
}: {
  iconPath: string
  imageUrl?: string | null
  width?: number | string
  height: number | string
  radius?: number
  label?: string
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
          : 'linear-gradient(135deg,var(--psoft) 0%,var(--bg2) 62%)',
        border: '1px solid var(--line)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: label ? 15 : 0,
      }}
    >
      {!imageUrl && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(115deg,var(--line) 0 1px,transparent 1px 20px)',
              opacity: 0.7,
            }}
          />
          <Icon
            d={iconPath}
            size={88}
            stroke="var(--p2)"
            width={1.1}
            style={{ position: 'absolute', right: -14, bottom: -18, opacity: 0.22 }}
          />
          <div
            style={{
              position: 'absolute',
              left: 13,
              top: 12,
              width: 18,
              height: 1,
              background: 'var(--p2)',
              opacity: 0.7,
            }}
          />
        </>
      )}
      {label && (
        <span
          style={{
            position: 'relative',
            fontSize: 9.5,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            fontWeight: 700,
            color: imageUrl ? '#fff' : 'var(--tx2)',
            textShadow: imageUrl ? '0 1px 6px rgba(0,0,0,.6)' : undefined,
          }}
        >
          {label}
        </span>
      )}
      {locked && (
        <div style={{ position: 'absolute', right: 13, top: 12 }}>
          <LockIcon />
        </div>
      )}
    </div>
  )
}

export function ProgressBar({
  percent,
  height = 5,
  maxWidth,
}: {
  percent: number
  height?: number
  maxWidth?: number | string
}) {
  return (
    <div
      style={{
        flex: 1,
        maxWidth,
        height,
        borderRadius: 9,
        background: 'var(--line)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          height: '100%',
          borderRadius: 9,
          background: 'linear-gradient(90deg,var(--p),var(--p2))',
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
  radius = 14,
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
    <div style={{ padding: '64px 56px 100px', maxWidth: 900 }} className="k-page">
      <Skeleton height={34} width="60%" style={{ marginBottom: 14 }} />
      <Skeleton height={18} width="42%" style={{ marginBottom: 52 }} />
      <Skeleton height={150} radius={22} style={{ marginBottom: 24 }} />
      <Skeleton height={110} radius={20} style={{ marginBottom: 14 }} />
      <Skeleton height={110} radius={20} />
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
      style={{
        border: '1px solid var(--line2)',
        background: 'var(--sf)',
        borderRadius: 20,
        padding: 32,
        textAlign: 'center',
        maxWidth: 520,
      }}
    >
      <div
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 17,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: onRetry ? 20 : 0 }}>
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
        borderRadius: 20,
        padding: 40,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'Raleway,sans-serif',
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--tx3)' }}>{message}</div>
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
// Modal — mesmo tratamento visual dos overlays do protótipo
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
        background: 'rgba(6,3,11,.74)',
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
          background: 'var(--sf)',
          border: '1px solid var(--line2)',
          borderRadius: 26,
          padding: 34,
          boxShadow: 'var(--shadow)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Formulário (usado no Admin e no Perfil)
// ---------------------------------------------------------------------
export const inputStyle: CSSProperties = {
  width: '100%',
  background: 'var(--sf)',
  border: '1px solid var(--line)',
  borderRadius: 14,
  padding: '13px 16px',
  color: 'var(--tx)',
  fontSize: 14,
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
          fontSize: 11,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--tx3)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 6 }}>{hint}</div>
      )}
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
    error: { bg: 'var(--dangersoft)', fg: 'var(--danger)', bd: 'var(--danger)' },
    ok: { bg: 'var(--oksoft)', fg: 'var(--ok)', bd: 'var(--ok)' },
    info: { bg: 'var(--psoft)', fg: 'var(--p2)', bd: 'var(--pline)' },
  }[kind]

  return (
    <div
      style={{
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        borderRadius: 14,
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  )
}
