import { Kicker } from '../components/ui'

/**
 * Minha Jornada — seção nova trazida pelo design do Figma.
 * A tela está no visual definitivo; o conteúdo entra junto com o schema
 * (trilhas e competências), que ainda não existe no banco.
 */
export default function Jornada() {
  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 1180 }}>
      <Kicker style={{ marginBottom: 14 }}>Seu progresso</Kicker>
      <h1 className="k-display k-h1" style={{ marginBottom: 12 }}>
        Minha Jornada
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 40px', maxWidth: 560 }}>
        Seu caminho de competências, etapa por etapa, com base na sua área e no seu objetivo.
      </p>

      <div
        style={{
          border: '1px dashed var(--line2)',
          borderRadius: 'var(--r-card)',
          padding: 48,
          textAlign: 'center',
          maxWidth: 560,
        }}
      >
        <div className="k-display k-h3" style={{ marginBottom: 10 }}>
          Em construção
        </div>
        <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.6 }}>
          Esta seção depende de trilhas e competências no banco. O visual já segue o design novo.
        </div>
      </div>
    </div>
  )
}
