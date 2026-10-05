import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NAV_ICON } from '../lib/icons'
import { firstName, initials } from '../lib/format'
import { Icon } from './ui'

const NAV = [
  { label: 'Início', to: '/', key: 'home', d: NAV_ICON.home },
  { label: 'Explorar', to: '/explorar', key: 'explorar', d: NAV_ICON.explorar },
  { label: 'Minha Jornada', to: '/jornada', key: 'jornada', d: NAV_ICON.jornada },
  { label: 'Aplicar', to: '/aplicar', key: 'aplicar', d: NAV_ICON.aplicar },
  { label: 'Eventos', to: '/eventos', key: 'eventos', d: NAV_ICON.eventos },
  { label: 'Comunidade', to: '/comunidade', key: 'comunidade', d: NAV_ICON.comunidade },
  { label: 'Perfil', to: '/perfil', key: 'perfil', d: NAV_ICON.perfil },
]

function activeKey(pathname: string): string {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/explorar') || pathname.startsWith('/conteudos') || pathname.startsWith('/aula'))
    return 'explorar'
  if (pathname.startsWith('/jornada')) return 'jornada'
  if (pathname.startsWith('/aplicar')) return 'aplicar'
  if (pathname.startsWith('/eventos')) return 'eventos'
  if (pathname.startsWith('/comunidade')) return 'comunidade'
  if (pathname.startsWith('/perfil')) return 'perfil'
  return ''
}

/** Marca da Kalidash: monograma em dois tons + palavra. */
function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ flex: 'none' }}>
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
            letterSpacing: '-0.01em',
            color: 'var(--tx)',
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
  )
}

export default function AppLayout() {
  const { profile, isPaid, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 900,
  )

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const active = activeKey(location.pathname)
  const name = firstName(profile?.full_name) || 'Você'

  const sidebar = (
    <aside
      style={{
        flex: 'none',
        width: 232,
        alignSelf: 'flex-start',
        position: isMobile ? 'relative' : 'sticky',
        top: 0,
        height: isMobile ? '100%' : '100vh',
        background: 'var(--surface)',
        borderRight: '0.8px solid var(--line)',
        padding: '26px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Link to="/" style={{ padding: '0 8px 30px', display: 'block' }}>
        <Logo />
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((it) => {
          const on = active === it.key
          return (
            <Link
              key={it.key}
              to={it.to}
              className="k-nav"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 12px',
                borderRadius: 'var(--r-control)',
                background: on ? 'var(--bg)' : 'transparent',
                color: on ? 'var(--tx)' : 'var(--tx2)',
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                transition: 'background .18s, color .18s',
              }}
            >
              <Icon d={it.d} size={17} width={1.5} />
              {it.label}
            </Link>
          )
        })}

      </nav>

      <div style={{ flex: 1, minHeight: 24 }} />

      <Link
        to="/perfil"
        className="k-hoverable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          border: '0.8px solid var(--line)',
          borderRadius: 'var(--r-control)',
          padding: '10px 11px',
          color: 'var(--tx)',
        }}
      >
        <Avatar name={initials(profile?.full_name ?? 'U')} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--tx2)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isPaid ? 'Acesso liberado' : 'Acesso gratuito'}
          </div>
        </div>
        <Icon d="M9 6l6 6-6 6" size={15} stroke="var(--tx3)" />
      </Link>

      {/* O Admin não faz parte da navegação do aluno: fica aqui embaixo,
          discreto, e só para quem tem o papel. */}
      {isAdmin && (
        <Link
          to="/admin"
          style={{
            marginTop: 10,
            fontSize: 12.5,
            color: 'var(--bronze)',
            padding: '4px 4px',
            display: 'inline-block',
          }}
        >
          Ir para o Admin ↗
        </Link>
      )}

      <button
        onClick={() => {
          void signOut()
        }}
        style={{
          marginTop: isAdmin ? 4 : 10,
          background: 'transparent',
          border: 'none',
          color: 'var(--tx3)',
          fontSize: 12.5,
          cursor: 'pointer',
          padding: '4px 4px',
          textAlign: 'left',
        }}
      >
        Sair
      </button>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {!isMobile && sidebar}

      {isMobile && (
        <>
          <header
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 60,
              height: 60,
              background: 'var(--surface)',
              borderBottom: '0.8px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px',
            }}
          >
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--tx)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
              }}
            >
              <Icon d={NAV_ICON.menu} size={22} width={1.6} />
            </button>
            <Logo />
          </header>

          {drawerOpen && (
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 90,
                background: 'rgba(14,10,20,.45)',
                display: 'flex',
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="k-pop"
                style={{ height: '100vh', overflowY: 'auto' }}
              >
                {sidebar}
              </div>
            </div>
          )}
        </>
      )}

      <main style={{ flex: 1, minWidth: 0, paddingTop: isMobile ? 60 : 0 }}>
        <Outlet />
      </main>
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        flex: 'none',
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: 'var(--imperial)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 12,
        color: 'var(--bg)',
      }}
    >
      {name}
    </div>
  )
}
