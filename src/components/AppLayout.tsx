import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { applyTheme, getStoredTheme, type Theme } from '../lib/theme'
import { NAV_ICON } from '../lib/icons'
import { firstName, initials } from '../lib/format'
import { Icon } from './ui'

const NAV = [
  { label: 'Início', to: '/', key: 'home', d: NAV_ICON.home },
  { label: 'Conteúdos', to: '/conteudos', key: 'conteudos', d: NAV_ICON.conteudos },
  { label: 'Eventos', to: '/eventos', key: 'eventos', d: NAV_ICON.eventos },
  { label: 'Perfil', to: '/perfil', key: 'perfil', d: NAV_ICON.perfil },
]

function activeKey(pathname: string): string {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/conteudos') || pathname.startsWith('/aula')) return 'conteudos'
  if (pathname.startsWith('/eventos')) return 'eventos'
  if (pathname.startsWith('/perfil')) return 'perfil'
  return ''
}

export default function AppLayout() {
  const { profile, isPaid, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 900,
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

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
  const name = firstName(profile?.full_name) || 'Usuário'

  const sidebar = (
    <aside
      style={{
        flex: 'none',
        width: 232,
        alignSelf: 'flex-start',
        position: isMobile ? 'relative' : 'sticky',
        top: 0,
        height: isMobile ? '100%' : '100vh',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--line)',
        padding: '26px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 30px' }}>
        <div
          style={{
            flex: 'none',
            width: 28,
            height: 28,
            borderRadius: 9,
            background: 'linear-gradient(150deg,var(--p2),var(--pd))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 800,
            fontSize: 13,
            color: '#fff',
          }}
        >
          K
        </div>
        <div>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: '.05em',
              lineHeight: 1.25,
            }}
          >
            KALIDASH
          </div>
          <div
            style={{
              fontFamily: 'Raleway,sans-serif',
              fontWeight: 600,
              fontSize: 10.5,
              letterSpacing: '.17em',
              color: 'var(--p2)',
            }}
          >
            ACADEMY
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map((it) => {
          const on = active === it.key
          return (
            <Link
              key={it.key}
              to={it.to}
              className="k-nav"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                padding: '11px 12px',
                borderRadius: 12,
                background: on ? 'var(--psoft)' : 'transparent',
                color: on ? 'var(--tx)' : 'var(--tx2)',
                fontSize: 13.5,
                fontWeight: on ? 600 : 500,
                textAlign: 'left',
                transition: 'background .18s, color .18s',
              }}
            >
              <Icon d={it.d} size={18} style={{ opacity: 0.92 }} />
              {it.label}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            to="/admin"
            className="k-nav"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 13,
              padding: '11px 12px',
              borderRadius: 12,
              background: 'transparent',
              color: 'var(--p2)',
              fontSize: 13.5,
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            <Icon d="M12 3l7 4v10l-7 4-7-4V7z" size={18} style={{ opacity: 0.92 }} />
            Admin
          </Link>
        )}
      </nav>

      <div style={{ flex: 1, minHeight: 30 }} />

      {!isPaid && (
        <div
          style={{
            border: '1px solid var(--line)',
            background: 'var(--sf)',
            borderRadius: 16,
            padding: 15,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: 'var(--tx3)',
              fontWeight: 700,
              marginBottom: 7,
            }}
          >
            Seu acesso
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Gratuito</div>
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--tx3)',
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Você tem os conteúdos gratuitos do Academy.
          </div>
          <button
            onClick={() => navigate('/conteudos?tab=explorar')}
            style={{
              width: '100%',
              border: '1px solid var(--pline)',
              background: 'var(--psoft)',
              borderRadius: 999,
              padding: '9px 0',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--p2)',
            }}
          >
            Ver conteúdos pagos
          </button>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          background: 'var(--sf)',
          border: '1px solid var(--line)',
          borderRadius: 999,
          padding: 3,
          marginBottom: 11,
          gap: 2,
        }}
      >
        <button
          onClick={() => setTheme('dark')}
          title="Modo escuro"
          style={{
            flex: 1,
            border: 'none',
            borderRadius: 999,
            padding: '7px 0',
            cursor: 'pointer',
            background: theme === 'dark' ? 'var(--sf2)' : 'transparent',
            color: theme === 'dark' ? 'var(--p2)' : 'var(--tx3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5" size={14} width={1.8} />
        </button>
        <button
          onClick={() => setTheme('light')}
          title="Modo claro"
          style={{
            flex: 1,
            border: 'none',
            borderRadius: 999,
            padding: '7px 0',
            cursor: 'pointer',
            background: theme === 'light' ? 'var(--sf2)' : 'transparent',
            color: theme === 'light' ? 'var(--p2)' : 'var(--tx3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
          </svg>
        </button>
      </div>

      <Link
        to="/perfil"
        className="k-hoverable"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 14,
          padding: '10px 11px',
          color: 'var(--tx)',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            flex: 'none',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--sf2)',
            border: '1px solid var(--line2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: 'var(--p2)',
          }}
        >
          {initials(profile?.full_name ?? 'U')}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--tx3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {isPaid ? 'Acesso liberado' : 'Acesso gratuito'}
          </div>
        </div>
      </Link>

      <button
        onClick={() => {
          void signOut()
        }}
        style={{
          marginTop: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--tx3)',
          fontSize: 11.5,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '6px 4px',
          textAlign: 'left',
        }}
      >
        Sair
      </button>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
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
              height: 58,
              background: 'var(--bg2)',
              borderBottom: '1px solid var(--line)',
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
              <Icon d={NAV_ICON.menu} size={22} width={1.8} />
            </button>
            <div
              style={{
                fontFamily: 'Raleway,sans-serif',
                fontWeight: 800,
                fontSize: 12.5,
                letterSpacing: '.05em',
              }}
            >
              KALIDASH<span style={{ color: 'var(--p2)' }}> ACADEMY</span>
            </div>
          </header>

          {drawerOpen && (
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 90,
                background: 'rgba(6,3,11,.7)',
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

      <main style={{ flex: 1, minWidth: 0, paddingTop: isMobile ? 58 : 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
