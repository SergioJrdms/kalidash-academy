import { Kicker } from '../components/ui'

/**
 * Comunidade — seção nova trazida pelo design do Figma.
 * A tela está no visual definitivo; o conteúdo entra junto com o schema
 * (posts e discussões), que ainda não existe no banco.
 */
export default function Comunidade() {
  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 1180 }}>
      <Kicker style={{ marginBottom: 14 }}>Rede</Kicker>
      <h1 className="k-display k-h1" style={{ marginBottom: 12 }}>
        Comunidade
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 40px', maxWidth: 560 }}>
        Converse com outros gestores que estão aplicando IA na operação, trocando o que funcionou e o que não funcionou.
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
          Esta seção depende de posts e discussões no banco. O visual já segue o design novo.
        </div>
      </div>
    </div>
  )
}
