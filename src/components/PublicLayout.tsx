import { Link } from 'react-router-dom'

/**
 * Moldura das páginas abertas: home, privacidade e termos.
 *
 * Elas existem fora do login de propósito. A verificação do Google exige
 * uma página inicial que explique o produto sem exigir conta, e uma
 * política de privacidade pública — foi nisso que a primeira submissão
 * foi recusada.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          borderBottom: '0.8px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <Link to="/" style={{ display: 'block' }}>
            <img
              src="/brand/kalidash-academy.png"
              alt="Kalidash Academy"
              width={150}
              height={41}
              style={{ display: 'block', width: 150, height: 'auto' }}
            />
          </Link>
          <span style={{ flex: 1 }} />
          <Link
            to="/login"
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Entrar
          </Link>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer
        style={{
          borderTop: '0.8px solid var(--line)',
          background: 'var(--surface)',
          marginTop: 60,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '28px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
            fontSize: 13.5,
            color: 'var(--tx2)',
          }}
        >
          <span>© {new Date().getFullYear()} Kalidash Academy</span>
          <span style={{ flex: 1 }} />
          <Link to="/privacidade" style={{ color: 'var(--tx2)' }}>
            Política de Privacidade
          </Link>
          <Link to="/termos" style={{ color: 'var(--tx2)' }}>
            Termos de Serviço
          </Link>
        </div>
      </footer>
    </div>
  )
}

/** Casca de texto longo, usada pela privacidade e pelos termos. */
export function PaginaDeTexto({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string
  atualizadoEm: string
  children: React.ReactNode
}) {
  return (
    <PublicLayout>
      <article
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: '56px 24px 20px',
        }}
      >
        <h1 className="k-display" style={{ fontSize: 42, lineHeight: 1.1, marginBottom: 12 }}>
          {titulo}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--tx3)', margin: '0 0 40px' }}>
          Última atualização: {atualizadoEm}
        </p>
        <div className="k-texto">{children}</div>
      </article>
    </PublicLayout>
  )
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 className="k-display" style={{ fontSize: 22, marginBottom: 14 }}>
        {titulo}
      </h2>
      {children}
    </section>
  )
}
