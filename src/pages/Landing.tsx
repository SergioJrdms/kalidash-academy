import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { Icon } from '../components/ui'
import { NAV_ICON } from '../lib/icons'

/**
 * Página inicial aberta.
 *
 * Antes a raiz empurrava todo visitante para o login. O Google recusou a
 * verificação por isso ("sua página inicial está protegida por uma página
 * de login" e "não explica a finalidade do app"), então esta página
 * explica o produto, diz o que fazemos com a agenda do Google e aponta
 * para a política de privacidade — tudo sem exigir conta.
 */

const PILARES = [
  {
    icone: NAV_ICON.jornada,
    titulo: 'Trilhas com ordem',
    texto:
      'Um caminho em etapas, do entendimento à governança, em vez de uma lista solta de cursos. Cada etapa mostra o que falta e o que já foi feito.',
  },
  {
    icone: NAV_ICON.aplicar,
    titulo: 'Kalidash Labs',
    texto:
      'Exercícios para aplicar na operação real: você escreve o que fez, a decisão que tomou e o resultado. Isso fica registrado no seu perfil.',
  },
  {
    icone: NAV_ICON.eventos,
    titulo: 'Encontros ao vivo',
    texto:
      'Clínicas e workshops com o time e com convidados. Ao se inscrever, o encontro pode entrar direto na sua agenda, com lembrete.',
  },
  {
    icone: NAV_ICON.comunidade,
    titulo: 'Comunidade',
    texto:
      'Um diretório opcional de quem está aplicando IA na própria área, com vagas e um grupo para as conversas que continuam.',
  },
]

const COMPETENCIAS = ['AI Literacy', 'Opportunity Mapping', 'Agent Design', 'Governança']

export default function Landing() {
  return (
    <PublicLayout>
      {/* ---------------- hero ---------------- */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '72px 24px 56px',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--bronze)',
            marginBottom: 20,
          }}
        >
          Conhecimento que vira operação
        </div>

        <h1
          className="k-display"
          style={{
            fontSize: 62,
            lineHeight: 1.04,
            letterSpacing: '-0.03em',
            margin: '0 0 24px',
            maxWidth: 800,
          }}
        >
          Aprenda. Aplique.{' '}
          <em style={{ color: 'var(--bronze)', fontStyle: 'italic' }}>Continue.</em>
        </h1>

        <p
          style={{
            fontSize: 18.5,
            lineHeight: 1.6,
            color: 'var(--tx2)',
            margin: '0 0 36px',
            maxWidth: 640,
          }}
        >
          A Kalidash Academy é uma plataforma de educação corporativa para quem lidera
          operação. Ela ensina a usar inteligência artificial no trabalho que já existe —
          e cobra que você aplique, não só assista.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <Link
            to="/login"
            style={{
              background: 'var(--imperial)',
              color: 'var(--bg)',
              borderRadius: 'var(--r-control)',
              padding: '14px 30px',
              fontSize: 15,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            Criar conta gratuita
            <Icon d={NAV_ICON.arrow} size={16} />
          </Link>
          <Link
            to="/login"
            className="k-hoverable"
            style={{
              border: '0.8px solid var(--line2)',
              color: 'var(--tx)',
              borderRadius: 'var(--r-control)',
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Já tenho conta
          </Link>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--tx3)', margin: 0 }}>
          Os conteúdos gratuitos abrem assim que a conta é criada.
        </p>
      </section>

      {/* ---------------- o que é ---------------- */}
      <section
        style={{
          borderTop: '0.8px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
          <h2 className="k-display" style={{ fontSize: 30, marginBottom: 14 }}>
            O que você encontra dentro
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--tx2)',
              lineHeight: 1.6,
              margin: '0 0 40px',
              maxWidth: 620,
            }}
          >
            Aulas curtas, uma trilha com ordem, exercícios aplicados e encontros ao vivo.
            Tudo medido por competência, para você ver no que de fato avançou.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {PILARES.map((p) => (
              <div key={p.titulo} className="k-card" style={{ padding: 24 }}>
                <span
                  style={{
                    display: 'flex',
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'var(--bg)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon d={p.icone} size={18} stroke="var(--imperial)" />
                </span>
                <h3 className="k-display" style={{ fontSize: 19, marginBottom: 10 }}>
                  {p.titulo}
                </h3>
                <p style={{ fontSize: 14.5, color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- competências ---------------- */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
        <h2 className="k-display" style={{ fontSize: 30, marginBottom: 14 }}>
          Quatro competências, medidas
        </h2>
        <p
          style={{
            fontSize: 16,
            color: 'var(--tx2)',
            lineHeight: 1.6,
            margin: '0 0 28px',
            maxWidth: 620,
          }}
        >
          Seu progresso não é um certificado de presença: ele sai do que você concluiu e
          do que você aplicou.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {COMPETENCIAS.map((c) => (
            <span
              key={c}
              style={{
                border: '0.8px solid var(--line2)',
                borderRadius: 999,
                padding: '9px 18px',
                fontSize: 14.5,
                color: 'var(--tx)',
                background: 'var(--surface)',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------- integração com a agenda ---------------- */}
      <section
        style={{
          borderTop: '0.8px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
          <h2 className="k-display" style={{ fontSize: 30, marginBottom: 14 }}>
            Integração com o Google Calendar
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'var(--tx2)',
              lineHeight: 1.65,
              margin: '0 0 18px',
              maxWidth: 700,
            }}
          >
            Conectar a agenda é opcional e serve a um propósito só: os encontros ao vivo da
            Academy. Quando você autoriza, a plataforma passa a fazer duas coisas.
          </p>

          <ul style={{ margin: '0 0 22px', padding: 0, listStyle: 'none', maxWidth: 700 }}>
            {[
              'Ao se inscrever num evento, cria o compromisso na sua agenda, com lembretes antes do horário. Ao cancelar a inscrição, remove esse mesmo compromisso.',
              'Mostra, na tela de Eventos, os seus compromissos do mês — para você decidir se consegue participar sem sair da plataforma.',
            ].map((t) => (
              <li
                key={t}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  marginBottom: 12,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--tx2)',
                }}
              >
                <Icon
                  d={NAV_ICON.check}
                  size={16}
                  width={2.4}
                  stroke="var(--terracotta)"
                  style={{ flex: 'none', marginTop: 4 }}
                />
                {t}
              </li>
            ))}
          </ul>

          <p
            style={{
              fontSize: 15,
              color: 'var(--tx2)',
              lineHeight: 1.65,
              margin: '0 0 20px',
              maxWidth: 700,
            }}
          >
            Nada da sua agenda é vendido, compartilhado ou usado para publicidade, e nada
            dela treina modelos de IA. Você desconecta quando quiser, por um botão na
            própria tela de Eventos ou pela sua Conta do Google.
          </p>

          <Link
            to="/privacidade"
            style={{
              fontSize: 14.5,
              color: 'var(--bronze)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            Ler a política de privacidade
            <Icon d={NAV_ICON.arrow} size={15} stroke="var(--bronze)" />
          </Link>
        </div>
      </section>

      {/* ---------------- chamada final ---------------- */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 0' }}>
        <div
          style={{
            background: 'var(--imperial)',
            color: 'var(--bg)',
            borderRadius: 'var(--r-card)',
            padding: '44px 40px',
          }}
        >
          <h2 className="k-display" style={{ fontSize: 30, color: 'var(--bg)', marginBottom: 12 }}>
            Comece pelo que já está no ar
          </h2>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(241,236,228,.78)',
              lineHeight: 1.6,
              margin: '0 0 26px',
              maxWidth: 560,
            }}
          >
            Criar a conta leva menos de um minuto e os conteúdos gratuitos abrem na hora.
          </p>
          <Link
            to="/login"
            style={{
              background: 'var(--champagne)',
              color: 'var(--imperial)',
              borderRadius: 'var(--r-control)',
              padding: '14px 30px',
              fontSize: 15,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            Criar conta gratuita
            <Icon d={NAV_ICON.arrow} size={16} stroke="var(--imperial)" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
