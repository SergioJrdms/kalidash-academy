import { Kicker } from '../components/ui'

/**
 * Aplicar — seção nova trazida pelo design do Figma.
 * A tela está no visual definitivo; o conteúdo entra junto com o schema
 * (labs e cases), que ainda não existe no banco.
 */
export default function Aplicar() {
  return (
    <div className="k-page" style={{ padding: '56px 56px 100px', maxWidth: 1180 }}>
      <Kicker style={{ marginBottom: 14 }}>Prática</Kicker>
      <h1 className="k-display k-h1" style={{ marginBottom: 12 }}>
        Aplicar
      </h1>
      <p style={{ color: 'var(--tx2)', fontSize: 16, margin: '0 0 40px', maxWidth: 560 }}>
        Kalidash Labs e Cases: exercícios práticos para levar o que você aprendeu direto para a sua operação.
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
          Esta seção depende de labs e cases no banco. O visual já segue o design novo.
        </div>
      </div>
    </div>
  )
}
