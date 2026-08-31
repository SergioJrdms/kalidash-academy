import { Link, NavLink, Outlet } from 'react-router-dom'

const LINKS = [
  { to: '/admin/cursos', label: 'Conteúdos' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/usuarios', label: 'Usuários' },
]

export default function AdminLayout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header
        style={{
          borderBottom: '1px solid var(--line)',
          background: 'var(--bg2)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          height: 62,
          position: 'sticky',
          top: 0,
          zIndex: 40,
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/admin"
          style={{
            fontFamily: 'Raleway,sans-serif',
            fontWeight: 800,
            fontSize: 12.5,
            letterSpacing: '.05em',
            color: 'var(--tx)',
          }}
        >
          KALIDASH<span style={{ color: 'var(--p2)' }}> ADMIN</span>
        </Link>

        <nav style={{ display: 'flex', gap: 4 }}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: isActive ? 'var(--tx)' : 'var(--tx2)',
                background: isActive ? 'var(--psoft)' : 'transparent',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <Link
          to="/"
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--tx2)',
            border: '1px solid var(--line2)',
            borderRadius: 999,
            padding: '8px 16px',
          }}
        >
          Ver como aluno
        </Link>
      </header>

      <div style={{ padding: '36px 28px 90px', maxWidth: 1100, margin: '0 auto' }}>
        <Outlet />
      </div>
    </div>
  )
}
