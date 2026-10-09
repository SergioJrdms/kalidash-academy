import { PaginaDeTexto, Secao } from '../components/PublicLayout'

/**
 * Política de privacidade.
 *
 * Escrita a partir do que a plataforma realmente faz — cada item aqui
 * corresponde a uma tabela ou a um serviço que existe no projeto. A
 * seção "Dados do Google" é obrigatória para a verificação dos escopos
 * de calendário e traz a declaração de Uso Limitado exigida.
 */

// Trocar pelo endereço real de contato do responsável pelos dados.
const CONTATO = 'contato@kalidash.com.br'

export default function Privacidade() {
  return (
    <PaginaDeTexto titulo="Política de Privacidade" atualizadoEm="9 de outubro de 2026">
      <P>
        Esta política explica quais dados a <strong>Kalidash Academy</strong> coleta, por
        que coleta, com quem compartilha e o que você pode exigir a respeito. Ela vale
        para a plataforma disponível em <Codigo>kalidash-academy.vercel.app</Codigo> e para
        os serviços ligados a ela.
      </P>

      <Secao titulo="1. Quem é o responsável">
        <P>
          A Kalidash é a controladora dos dados tratados na Academy, nos termos da Lei
          Geral de Proteção de Dados (Lei 13.709/2018). Para qualquer assunto desta
          política, incluindo pedidos de acesso ou exclusão, escreva para{' '}
          <Email />.
        </P>
      </Secao>

      <Secao titulo="2. Dados que coletamos">
        <P>Coletamos apenas o necessário para a plataforma funcionar:</P>
        <Lista
          itens={[
            <>
              <strong>Cadastro.</strong> Nome e e-mail. Se você entra com Google ou
              Microsoft, recebemos nome, e-mail e a foto pública do perfil daquela conta.
              Senhas, quando existem, ficam sob guarda do nosso provedor de autenticação e
              nunca são vistas por nós.
            </>,
            <>
              <strong>Perfil.</strong> Empresa, área de atuação, objetivo, nível de
              familiaridade, cargo e, se você quiser aparecer no diretório da comunidade,
              um interesse e o endereço do seu LinkedIn. Tudo isso é opcional e editável.
            </>,
            <>
              <strong>Uso do conteúdo.</strong> Quais aulas você abriu e concluiu, quanto
              tempo de vídeo assistiu, suas anotações, o que você escreveu nos Kalidash
              Labs, conteúdos salvos, respostas de quiz, certificados emitidos e
              inscrições em eventos.
            </>,
            <>
              <strong>Uso da interface.</strong> Páginas visitadas, cliques e eventos de
              produto, para entendermos o que ajuda e o que atrapalha. Parte fica em base
              própria, parte em uma ferramenta de analytics descrita na seção 5.
            </>,
            <>
              <strong>Técnicos.</strong> Endereço IP, tipo de navegador e dispositivo,
              registrados pelos nossos provedores de infraestrutura para segurança e
              diagnóstico.
            </>,
          ]}
        />
        <P>
          Não coletamos dados sensíveis na acepção da LGPD (saúde, biometria, convicções)
          e não pedimos dados de pagamento na plataforma.
        </P>
      </Secao>

      <Secao titulo="3. Dados da sua Conta do Google">
        <P>
          Conectar o Google Calendar é <strong>opcional</strong>. A Academy funciona
          inteira sem isso. Quando você autoriza, pedimos dois escopos e usamos cada um
          para um fim específico:
        </P>
        <Lista
          itens={[
            <>
              <Codigo>calendar.events</Codigo> — para <strong>criar</strong> na sua agenda
              o compromisso do evento em que você se inscreveu, com lembretes antes do
              horário, e para <strong>removê-lo</strong> se você cancelar a inscrição.
              Mexemos apenas em eventos criados pela própria Academy.
            </>,
            <>
              <Codigo>calendar.readonly</Codigo> — para <strong>exibir a você</strong>, na
              tela de Eventos, os seus compromissos do mês, de modo que você veja conflitos
              de horário antes de se inscrever. Esses compromissos são lidos no momento em
              que a tela é aberta e exibidos apenas para você.
            </>,
          ]}
        />
        <P>
          Não armazenamos o conteúdo da sua agenda nos nossos bancos. Guardamos apenas as
          credenciais de acesso necessárias para manter a conexão viva e o identificador
          dos eventos que nós mesmos criamos, para conseguir removê-los depois. As
          credenciais ficam cifradas em repouso, inacessíveis pelo navegador e legíveis
          somente pelo serviço que fala com o Google.
        </P>

        <Destaque>
          <strong>Uso Limitado.</strong> O uso e a transferência, pela Kalidash Academy, de
          informações recebidas das APIs do Google aderem à{' '}
          <A href="https://developers.google.com/terms/api-services-user-data-policy">
            Política de Dados do Usuário dos Serviços de API do Google
          </A>
          , incluindo os requisitos de Uso Limitado. Em particular: não vendemos esses
          dados; não os transferimos a terceiros, exceto quando necessário para prestar o
          serviço que você pediu, por obrigação legal ou com o seu consentimento expresso;
          não os usamos para publicidade; não os usamos para treinar modelos de
          inteligência artificial, nossos ou de terceiros; e nenhuma pessoa os lê, salvo
          com a sua autorização, por exigência legal ou para apurar um incidente de
          segurança.
        </Destaque>

        <P>
          Você revoga esse acesso a qualquer momento pelo botão{' '}
          <strong>Desconectar agenda</strong>, na tela de Eventos, ou em{' '}
          <A href="https://myaccount.google.com/permissions">
            myaccount.google.com/permissions
          </A>
          . Ao desconectar, apagamos as credenciais imediatamente.
        </P>
      </Secao>

      <Secao titulo="4. Para que usamos">
        <Lista
          itens={[
            'Dar acesso à plataforma e manter sua sessão.',
            'Mostrar seu progresso, suas competências e seu histórico de aplicação.',
            'Liberar ou restringir conteúdo conforme o seu nível de acesso.',
            'Recomendar conteúdo a partir da área e do objetivo que você informou.',
            'Enviar comunicações operacionais, como confirmação de conta e redefinição de senha.',
            'Entender o uso agregado da plataforma para melhorá-la.',
            'Cumprir obrigações legais e apurar abusos ou incidentes de segurança.',
          ]}
        />
        <P>
          Não vendemos seus dados. Não os usamos para publicidade. Não treinamos modelos
          de IA com o seu conteúdo nem com o da sua agenda.
        </P>
      </Secao>

      <Secao titulo="5. Com quem compartilhamos">
        <P>
          Usamos prestadores de serviço que tratam dados em nosso nome, sob contrato e
          apenas para as finalidades acima:
        </P>
        <Lista
          itens={[
            <>
              <strong>Supabase</strong> — banco de dados, autenticação e arquivos.
            </>,
            <>
              <strong>Vercel</strong> — hospedagem da aplicação.
            </>,
            <>
              <strong>Mux</strong> — processamento e entrega dos vídeos das aulas.
            </>,
            <>
              <strong>PostHog</strong> — análise de uso do produto.
            </>,
            <>
              <strong>Google</strong> — login social e, se você autorizar, a integração de
              calendário descrita na seção 3.
            </>,
          ]}
        />
        <P>
          Fora isso, só compartilhamos dados por ordem judicial, exigência de autoridade
          competente, ou com o seu consentimento. O diretório da comunidade mostra nome,
          cargo, empresa e interesse apenas de quem optou por entrar nele, e nunca o
          e-mail; seu LinkedIn só aparece para quem você aceitou conectar.
        </P>
      </Secao>

      <Secao titulo="6. Base legal">
        <P>
          Tratamos seus dados para executar o contrato de uso da plataforma (art. 7º, V da
          LGPD), para cumprir obrigações legais (art. 7º, II), com base no legítimo
          interesse de melhorar e proteger o serviço (art. 7º, IX) e, nos casos em que
          pedimos de forma explícita — como a conexão com o Google Calendar e a entrada no
          diretório da comunidade —, com o seu consentimento (art. 7º, I).
        </P>
      </Secao>

      <Secao titulo="7. Por quanto tempo guardamos">
        <P>
          Mantemos os dados da conta enquanto ela existir. Ao solicitar a exclusão,
          removemos seus dados pessoais em até 30 dias, preservando apenas o que a lei
          exigir e registros agregados que não identificam ninguém. As credenciais do
          Google são apagadas assim que você desconecta a agenda.
        </P>
      </Secao>

      <Secao titulo="8. Seus direitos">
        <P>
          A LGPD garante que você possa confirmar a existência de tratamento, acessar seus
          dados, corrigir o que estiver errado ou desatualizado, pedir anonimização,
          bloqueio ou eliminação, solicitar portabilidade, saber com quem compartilhamos e
          revogar consentimentos.
        </P>
        <P>
          Boa parte disso você faz sozinho na própria plataforma, em Perfil. Para o
          restante, escreva para <Email />; respondemos em até 15 dias.
        </P>
      </Secao>

      <Secao titulo="9. Segurança">
        <P>
          O acesso ao banco é controlado linha a linha: cada pessoa só alcança os próprios
          registros, e essa regra é aplicada no servidor, não no navegador. Credenciais de
          terceiros, como as do Google, ficam em uma tabela que o aplicativo web não
          consegue ler — apenas o serviço de servidor que precisa delas. O tráfego é
          cifrado em trânsito e os dados, em repouso.
        </P>
        <P>
          Nenhum sistema é imune. Se houver incidente com risco relevante, comunicaremos
          você e a Autoridade Nacional de Proteção de Dados conforme a lei.
        </P>
      </Secao>

      <Secao titulo="10. Transferência internacional">
        <P>
          Nossos prestadores podem processar dados fora do Brasil, inclusive nos Estados
          Unidos. Essas transferências se apoiam nas hipóteses do art. 33 da LGPD e em
          cláusulas contratuais com cada fornecedor.
        </P>
      </Secao>

      <Secao titulo="11. Cookies e armazenamento local">
        <P>
          Usamos armazenamento local do navegador para manter você conectado e lembrar
          preferências de tela. A ferramenta de analytics usa identificadores para
          distinguir sessões. Não usamos cookies de publicidade nem de rastreamento entre
          sites.
        </P>
      </Secao>

      <Secao titulo="12. Menores de idade">
        <P>
          A Academy é destinada a profissionais e não se dirige a menores de 18 anos. Se
          soubermos que criamos uma conta de menor sem autorização dos responsáveis, ela
          será removida.
        </P>
      </Secao>

      <Secao titulo="13. Mudanças nesta política">
        <P>
          Se mudarmos algo relevante, atualizamos a data no topo e avisamos na plataforma
          antes de a mudança passar a valer.
        </P>
      </Secao>

      <Secao titulo="14. Contato">
        <P>
          Dúvidas, pedidos ou reclamações sobre dados pessoais: <Email />.
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

function Destaque({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '0.8px solid var(--line2)',
        borderLeft: '3px solid var(--bronze)',
        borderRadius: 10,
        padding: '18px 22px',
        fontSize: 15,
        lineHeight: 1.75,
        color: 'var(--tx2)',
        margin: '0 0 18px',
      }}
    >
      {children}
    </div>
  )
}

function Codigo({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        background: 'var(--surface)',
        border: '0.8px solid var(--line)',
        borderRadius: 5,
        padding: '1px 6px',
        fontSize: 13.5,
      }}
    >
      {children}
    </code>
  )
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--bronze)' }}>
      {children}
    </a>
  )
}

function Email() {
  return (
    <a href={`mailto:${CONTATO}`} style={{ color: 'var(--bronze)' }}>
      {CONTATO}
    </a>
  )
}
