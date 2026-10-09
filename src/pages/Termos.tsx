import { Link } from 'react-router-dom'
import { PaginaDeTexto, Secao } from '../components/PublicLayout'

/** Termos de serviço. Exigidos na verificação do Google junto da política. */

const CONTATO = 'contato@kalidash.com.br'

export default function Termos() {
  return (
    <PaginaDeTexto titulo="Termos de Serviço" atualizadoEm="9 de outubro de 2026">
      <P>
        Estes termos regem o uso da <strong>Kalidash Academy</strong>. Ao criar uma conta
        ou usar a plataforma, você concorda com eles. Se não concordar, não use o serviço.
      </P>

      <Secao titulo="1. O que é a Academy">
        <P>
          A Kalidash Academy é uma plataforma de educação corporativa: aulas em vídeo e
          texto, trilhas de aprendizagem, exercícios aplicados (os Kalidash Labs),
          encontros ao vivo e um diretório opcional de comunidade. O conteúdo é
          educacional e não constitui consultoria, aconselhamento jurídico, contábil ou
          de investimento.
        </P>
      </Secao>

      <Secao titulo="2. Sua conta">
        <P>
          Você precisa de uma conta para acessar o conteúdo e é responsável por mantê-la
          segura. A conta é pessoal e intransferível: não compartilhe credenciais nem
          permita que terceiros usem o seu acesso. Avise-nos se suspeitar de uso indevido.
        </P>
        <P>
          Você declara ter ao menos 18 anos e que as informações fornecidas são
          verdadeiras.
        </P>
      </Secao>

      <Secao titulo="3. Níveis de acesso">
        <P>
          Parte do conteúdo é gratuita e abre assim que a conta é criada. Outra parte
          exige acesso pago, liberado pela equipe conforme a contratação feita com a sua
          empresa ou com você. Podemos alterar o que é gratuito e o que é pago, sem tirar
          de você o que já foi contratado.
        </P>
      </Secao>

      <Secao titulo="4. Uso aceitável">
        <P>Ao usar a Academy, você se compromete a não:</P>
        <Lista
          itens={[
            'Copiar, redistribuir, revender ou exibir publicamente o conteúdo sem autorização por escrito.',
            'Baixar vídeos por meios não oferecidos pela plataforma ou burlar controles de acesso.',
            'Compartilhar sua conta ou usar a conta de outra pessoa.',
            'Publicar, no diretório da comunidade ou nos Labs, conteúdo ilegal, ofensivo, enganoso ou de terceiros sem autorização.',
            'Tentar obter acesso não autorizado a sistemas, dados de outras pessoas ou áreas administrativas.',
            'Usar robôs ou automações para extrair conteúdo em massa.',
          ]}
        />
        <P>
          Podemos suspender ou encerrar contas que descumpram estas regras, com aviso
          sempre que possível.
        </P>
      </Secao>

      <Secao titulo="5. Conteúdo que você cria">
        <P>
          Anotações, aplicações de Labs e textos de perfil continuam sendo seus. Ao
          publicá-los na plataforma, você nos concede licença não exclusiva para
          armazená-los e exibi-los a você — e, no caso do diretório da comunidade, aos
          demais participantes, conforme a visibilidade que você escolher.
        </P>
        <P>
          Você garante ter o direito de publicar o que publica e assume a
          responsabilidade por esse conteúdo.
        </P>
      </Secao>

      <Secao titulo="6. Propriedade intelectual">
        <P>
          Aulas, textos, materiais, marca e a própria plataforma pertencem à Kalidash ou a
          quem nos licenciou. Seu acesso é uma licença de uso pessoal, limitada, revogável
          e intransferível, para fins de aprendizagem e aplicação no seu trabalho. Nada
          nestes termos transfere a titularidade desse conteúdo.
        </P>
      </Secao>

      <Secao titulo="7. Integrações opcionais">
        <P>
          A conexão com o Google Calendar é opcional e serve para colocar na sua agenda os
          encontros em que você se inscrever e mostrar seus compromissos do mês na tela de
          Eventos. Você autoriza e revoga quando quiser. O tratamento desses dados está
          descrito na{' '}
          <Link to="/privacidade" style={{ color: 'var(--bronze)' }}>
            Política de Privacidade
          </Link>
          .
        </P>
      </Secao>

      <Secao titulo="8. Disponibilidade">
        <P>
          Trabalhamos para manter a plataforma no ar, mas ela pode ficar indisponível para
          manutenção, por falha de terceiros ou por eventos fora do nosso controle. Não
          garantimos operação ininterrupta ou livre de erros.
        </P>
      </Secao>

      <Secao titulo="9. Limitação de responsabilidade">
        <P>
          Na máxima extensão permitida pela lei brasileira, a Kalidash não responde por
          lucros cessantes, perda de dados ou danos indiretos decorrentes do uso da
          plataforma. Nada aqui exclui responsabilidades que a lei não permite excluir,
          incluindo as do Código de Defesa do Consumidor quando aplicável.
        </P>
      </Secao>

      <Secao titulo="10. Encerramento">
        <P>
          Você pode encerrar sua conta quando quiser, escrevendo para <Email />. Podemos
          encerrar ou suspender o acesso em caso de descumprimento destes termos ou de
          encerramento do serviço, avisando com antecedência razoável quando possível.
        </P>
      </Secao>

      <Secao titulo="11. Mudanças nestes termos">
        <P>
          Podemos atualizar estes termos. Mudanças relevantes são avisadas na plataforma
          antes de entrar em vigor; continuar usando a Academy depois disso significa
          aceitá-las.
        </P>
      </Secao>

      <Secao titulo="12. Lei aplicável">
        <P>
          Estes termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do
          usuário para dirimir controvérsias, quando aplicável a legislação consumerista.
        </P>
      </Secao>

      <Secao titulo="13. Contato">
        <P>
          Dúvidas sobre estes termos: <Email />.
        </P>
      </Secao>
    </PaginaDeTexto>
  )
}

// ---------------------------------------------------------------------

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--tx2)', margin: '0 0 16px' }}>
      {children}
    </p>
  )
}

function Lista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul style={{ margin: '0 0 18px', paddingLeft: 0, listStyle: 'none' }}>
      {itens.map((it, i) => (
        <li
          key={i}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            marginBottom: 11,
            fontSize: 15.5,
            lineHeight: 1.7,
            color: 'var(--tx2)',
          }}
        >
          <span
            style={{
              flex: 'none',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--bronze)',
              marginTop: 11,
            }}
          />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

function Email() {
  return (
    <a href={`mailto:${CONTATO}`} style={{ color: 'var(--bronze)' }}>
      {CONTATO}
    </a>
  )
}
