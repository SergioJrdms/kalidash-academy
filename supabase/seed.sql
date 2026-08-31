-- =====================================================================
-- Kalidash Academy — seed inicial
-- Os conteúdos do protótipo entram aqui como DADOS. Depois disso tudo é
-- editável pelo Admin: nada disso está hardcoded na aplicação.
--
-- Idempotente: pode rodar mais de uma vez (on conflict do nothing).
--
-- OBS: materiais (PDF/XLSX) NÃO são semeados porque os arquivos ainda não
-- existem no Storage. Suba-os pelo Admin em Aula > Materiais adicionais.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CURSOS
-- ---------------------------------------------------------------------
insert into public.courses
  (id, title, slug, short_description, description, area, access_type, status,
   instructor_name, sort_order, published_at)
values
  ('a0000000-0000-4000-8000-000000000001',
   'Como identificar onde a IA realmente vale a pena na sua operação',
   'onde-a-ia-vale-a-pena',
   'Uma leitura honesta da sua área antes de qualquer ferramenta entrar.',
   'Uma leitura honesta da sua área antes de qualquer ferramenta entrar: onde o tempo vai, o que é decisão e o que é execução repetitiva. Doze minutos de aula e dez de aplicação na sua própria operação.',
   'Gestão', 'free', 'published', 'Time Kalidash', 1, now()),

  ('a0000000-0000-4000-8000-000000000002',
   'IA para Líderes',
   'ia-para-lideres',
   'Leia a própria área, escolha o que vale automatizar e leve a primeira iniciativa até a operação.',
   'Leia a própria área, escolha o que vale automatizar e leve a primeira iniciativa até a operação. Aulas de dez a quinze minutos, para encaixar na rotina. O Módulo 1 é aberto.',
   'Gestão', 'free', 'published', 'Time Kalidash', 2, now()),

  ('a0000000-0000-4000-8000-000000000003',
   'IA aplicada ao Financeiro',
   'ia-aplicada-ao-financeiro',
   'Fechamento, conciliação e análise de desvios com muito menos trabalho manual.',
   'Fechamento, conciliação e análise de desvios com muito menos trabalho manual — sem trocar de ERP.',
   'Financeiro', 'paid', 'published', 'Time Kalidash', 3, now()),

  ('a0000000-0000-4000-8000-000000000004',
   'Ecossistema Cloud',
   'ecossistema-cloud',
   'O que sustenta uma automação que roda todo dia sem alguém olhando.',
   'O que sustenta uma automação que roda todo dia sem alguém olhando. Conteúdo individual, pela ótica de quem vai operar.',
   'Operações', 'paid', 'published', 'César Germano', 4, now()),

  ('a0000000-0000-4000-8000-000000000005',
   'IA aplicada ao RH',
   'ia-aplicada-ao-rh',
   'Onboarding, comunicação interna e documentação sem coordenação manual.',
   'Onboarding, comunicação interna e documentação que passam a rodar sem coordenação manual. Em produção com o time da Kalidash.',
   'RH', 'paid', 'coming_soon', 'Time Kalidash', 5, null),

  ('a0000000-0000-4000-8000-000000000006',
   'IA aplicada ao Marketing',
   'ia-aplicada-ao-marketing',
   'Conteúdo, campanhas e pesquisa operando em outra escala.',
   'Conteúdo, campanhas e pesquisa operando em outra escala. Ainda em definição com o time da Kalidash.',
   'Marketing', 'paid', 'coming_soon', 'Time Kalidash', 6, null),

  ('a0000000-0000-4000-8000-000000000007',
   'IA aplicada ao Comercial',
   'ia-aplicada-ao-comercial',
   'Preparação de reunião, registro e follow-up sem depender de memória.',
   'Preparação de reunião, registro e follow-up sem depender de memória. Ainda em definição.',
   'Comercial', 'paid', 'coming_soon', 'Time Kalidash', 7, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- MÓDULOS
-- ---------------------------------------------------------------------
insert into public.course_modules (id, course_id, title, sort_order) values
  ('b0000000-0000-4000-8000-000000000101','a0000000-0000-4000-8000-000000000001','Aula única', 1),

  ('b0000000-0000-4000-8000-000000000201','a0000000-0000-4000-8000-000000000002','Entender', 1),
  ('b0000000-0000-4000-8000-000000000202','a0000000-0000-4000-8000-000000000002','Mapear', 2),
  ('b0000000-0000-4000-8000-000000000203','a0000000-0000-4000-8000-000000000002','Aplicar', 3),

  ('b0000000-0000-4000-8000-000000000301','a0000000-0000-4000-8000-000000000003','Entender o ciclo', 1),
  ('b0000000-0000-4000-8000-000000000302','a0000000-0000-4000-8000-000000000003','Automatizar', 2),
  ('b0000000-0000-4000-8000-000000000303','a0000000-0000-4000-8000-000000000003','Implementar', 3),

  ('b0000000-0000-4000-8000-000000000401','a0000000-0000-4000-8000-000000000004','Fundamentos do ecossistema', 1),
  ('b0000000-0000-4000-8000-000000000402','a0000000-0000-4000-8000-000000000004','Serviços essenciais', 2),
  ('b0000000-0000-4000-8000-000000000403','a0000000-0000-4000-8000-000000000004','Operação', 3),
  ('b0000000-0000-4000-8000-000000000404','a0000000-0000-4000-8000-000000000004','Governança', 4)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- AULAS
-- ---------------------------------------------------------------------

-- ===== Curso 1: aula aberta =====
insert into public.lessons
  (id, module_id, title, summary, sort_order, access_type, status, duration_seconds,
   application_title, application_minutes, application_steps, application_note, published_at)
values
  ('c0000000-0000-4000-8000-000000000101',
   'b0000000-0000-4000-8000-000000000101',
   'Como identificar onde a IA realmente vale a pena na sua operação',
   'Toda operação tem trabalho manual acumulado, e quase nunca por falta de ferramenta. Nesta aula percorremos como ler a própria área antes de decidir qualquer coisa: onde o tempo vai, o que é decisão e o que é apenas execução repetitiva.',
   1, 'free', 'published', 720,
   'Faça uma leitura honesta da sua última semana.', 10,
   '["Pense na última semana da sua equipe.","Liste três atividades que se repetiram.","Escolha a que mais consome tempo.","Marque onde existe decisão humana e onde existe apenas execução."]'::jsonb,
   'Guarde essa resposta. Ela é o ponto de partida das próximas aulas.',
   now())
on conflict (id) do nothing;

-- ===== Curso 2: IA para Líderes =====
-- Módulo 01 aberto (free). Módulos 02 e 03 exigem acesso pago.
insert into public.lessons
  (id, module_id, title, summary, sort_order, access_type, status, duration_seconds,
   application_title, application_minutes, application_steps, application_note, published_at)
values
  ('c0000000-0000-4000-8000-000000000201',
   'b0000000-0000-4000-8000-000000000201',
   'Por que a operação acumula trabalho manual',
   'Trabalho manual raramente é falta de ferramenta. É acúmulo: exceção que virou regra, planilha paralela que virou fonte, conferência criada depois de um erro antigo. Esta aula separa as quatro origens mais comuns.',
   1, 'free', 'published', 540,
   'Descubra qual origem explica a sua rotina mais pesada.', 10,
   '["Escolha a rotina que mais consome tempo da sua equipe.","Passe pelas quatro origens vistas na aula.","Anote qual delas explica o caso.","Se for mais de uma, marque a principal."]'::jsonb,
   'Saber a origem muda o que você vai automatizar depois.',
   now()),

  ('c0000000-0000-4000-8000-000000000202',
   'b0000000-0000-4000-8000-000000000201',
   'Onde a IA cabe (e onde não cabe)',
   'Nem tudo que é repetitivo deve ser automatizado agora. O critério tem quatro partes: regra clara, frequência real, consequência de erro tolerável e processo estável o suficiente para valer o esforço.',
   2, 'free', 'published', 720,
   'Passe duas rotinas pelos quatro critérios.', 15,
   '["Liste duas rotinas candidatas da sua área.","Passe cada uma pelos quatro critérios.","Descarte a que falhar em estabilidade.","Escolha a que sobrar como a primeira."]'::jsonb,
   'A que sobrar é o processo que você leva para o Módulo 2.',
   now()),

  ('c0000000-0000-4000-8000-000000000203',
   'b0000000-0000-4000-8000-000000000202',
   'Mapeando o que se repete toda semana',
   'Um método curto para listar as rotinas do time, medir onde o tempo realmente vai e separar decisão de execução — sem instalar ferramenta nenhuma.',
   1, 'paid', 'published', 780,
   'Mapeie o processo que você escolheu.', 20,
   '["Descreva o processo em no máximo sete etapas.","Estime o tempo de cada etapa.","Marque quais etapas geram retrabalho.","Aponte a primeira etapa que dá para tirar da mão."]'::jsonb,
   'Esse mapa é o que você leva para a conversa com o time.',
   now()),

  ('c0000000-0000-4000-8000-000000000204',
   'b0000000-0000-4000-8000-000000000202',
   'Medindo tempo e retrabalho de verdade',
   'Medir não precisa de ferramenta. Precisa de duas semanas de honestidade e um critério fixo. Esta aula mostra como chegar a um número que sustenta uma decisão.',
   2, 'paid', 'published', 660,
   'Meça a rotina que você mapeou.', 15,
   '["Defina o que conta como tempo da rotina.","Registre duas ocorrências reais.","Some o retrabalho separadamente.","Anote o número mensal estimado."]'::jsonb,
   'Esse número é o que você usa para defender a fila de automações.',
   now()),

  ('c0000000-0000-4000-8000-000000000205',
   'b0000000-0000-4000-8000-000000000203',
   'Como priorizar iniciativas de automação',
   'Como sair de uma lista de ideias para uma fila com critério: tempo economizado contra risco de erro, mais um terceiro eixo que quase todo mundo esquece — quem vai manter aquilo depois.',
   1, 'paid', 'published', 840,
   'Monte a fila da sua área.', 20,
   '["Liste as iniciativas candidatas.","Posicione cada uma na matriz de tempo × risco.","Defina o responsável pela manutenção de cada uma.","Escolha a primeira e escreva por que ela vem antes."]'::jsonb,
   'Leve a fila para a próxima reunião de operação.',
   now()),

  ('c0000000-0000-4000-8000-000000000206',
   'b0000000-0000-4000-8000-000000000203',
   'Levando a primeira automação para o time',
   'O que fazer entre a automação pronta e a automação usada: quem testa, o que fica escrito, como o time é avisado quando algo para e como você mede se valeu.',
   2, 'paid', 'published', 960,
   'Implemente com uma pessoa antes de todo o time.', 30,
   '["Escolha uma pessoa do time para o primeiro uso.","Escreva o combinado em cinco linhas.","Defina quem é avisado se algo parar.","Registre o tempo economizado na primeira semana."]'::jsonb,
   'Sem esse passo, a automação vira dívida técnica de operação.',
   now())
on conflict (id) do nothing;

-- ===== Curso 3: IA aplicada ao Financeiro =====
insert into public.lessons
  (id, module_id, title, summary, sort_order, access_type, status, duration_seconds,
   application_title, application_minutes, application_steps, application_note, published_at)
values
  ('c0000000-0000-4000-8000-000000000301','b0000000-0000-4000-8000-000000000301',
   'Onde o Financeiro acumula retrabalho',
   'Conferência criada depois de um erro antigo, planilha paralela que virou fonte, fechamento que depende de memória. Esta aula separa o que é controle necessário do que é só acúmulo.',
   1,'inherit','published',960,
   'Leve o conteúdo desta aula para uma rotina real da sua operação.',15,
   '["Escolha uma rotina do Financeiro ligada ao tema da aula.","Descreva como ela funciona hoje, em poucas etapas.","Marque o que é decisão e o que é execução repetitiva.","Defina o primeiro ajuste que você consegue fazer nesta semana."]'::jsonb,
   'Anote o resultado antes de seguir para a próxima aula.', now()),

  ('c0000000-0000-4000-8000-000000000302','b0000000-0000-4000-8000-000000000301',
   'Separando conferência de julgamento',
   'Uma parte do fechamento é conferir. Outra é decidir. Misturar as duas é o que faz o mês inteiro parecer urgente.',
   2,'inherit','published',1080,
   'Separe as duas metades do seu fechamento.',15,
   '["Liste as etapas do seu fechamento.","Marque cada uma como conferência ou julgamento.","Some o tempo de cada grupo.","Escolha a conferência mais cara para atacar primeiro."]'::jsonb,
   'Conferência é automatizável. Julgamento é o que você protege.', now()),

  ('c0000000-0000-4000-8000-000000000303','b0000000-0000-4000-8000-000000000302',
   'Coleta e cruzamento sem copiar e colar',
   'Como tirar da mão a parte mais mecânica do ciclo: buscar, padronizar e cruzar dados de origens diferentes sem trocar de ERP.',
   1,'inherit','published',1440,
   'Escolha um cruzamento que você faz toda semana.',20,
   '["Identifique as origens envolvidas.","Descreva o critério de casamento entre elas.","Anote as exceções que hoje você resolve na mão.","Defina o que aconteceria com cada exceção se ninguém olhasse."]'::jsonb,
   'As exceções são o que decide se isso vai rodar sozinho ou não.', now()),

  ('c0000000-0000-4000-8000-000000000304','b0000000-0000-4000-8000-000000000302',
   'Automatizando o fechamento gerencial',
   'Do dado bruto ao número que a diretoria lê: o que dá para montar sozinho e onde alguém precisa continuar assinando embaixo.',
   2,'inherit','published',1560,
   'Desenhe o seu fechamento gerencial em etapas.',20,
   '["Liste as etapas do relatório gerencial atual.","Marque as que dependem de uma pessoa específica.","Escolha a etapa mais repetitiva.","Escreva como você saberia que ela rodou errado."]'::jsonb,
   'Automação sem sinal de erro é risco, não ganho.', now()),

  ('c0000000-0000-4000-8000-000000000305','b0000000-0000-4000-8000-000000000302',
   'O alerta que vale interromper alguém',
   'Alerta demais vira ruído e todo mundo para de olhar. Esta aula define o critério do que realmente merece interromper uma pessoa.',
   3,'inherit','published',1320,
   'Revise os alertas que a sua área recebe hoje.',15,
   '["Liste os alertas que chegam para o time.","Marque quais geraram ação nos últimos 30 dias.","Elimine os que nunca geraram.","Defina o dono de cada alerta que sobrou."]'::jsonb,
   'Alerta sem dono é alerta ignorado.', now()),

  ('c0000000-0000-4000-8000-000000000306','b0000000-0000-4000-8000-000000000303',
   'Colocando em produção sem parar o time',
   'Como fazer a transição do processo manual para o automatizado rodando os dois em paralelo pelo tempo certo — nem menos, nem para sempre.',
   1,'inherit','published',1320,
   'Planeje o paralelo da sua primeira automação.',20,
   '["Defina por quantos ciclos os dois processos rodam juntos.","Escolha o critério objetivo de desligamento do manual.","Defina quem compara os dois resultados.","Marque a data da decisão."]'::jsonb,
   'Sem data de decisão, o paralelo vira permanente.', now()),

  ('c0000000-0000-4000-8000-000000000307','b0000000-0000-4000-8000-000000000303',
   'Medindo o que mudou',
   'O número que você usa para defender a próxima automação. Tempo economizado, retrabalho evitado e o que a equipe passou a fazer com o espaço que sobrou.',
   2,'inherit','published',1320,
   'Feche o ciclo com um número.',15,
   '["Compare o tempo antes e depois.","Some o retrabalho evitado.","Anote o que a equipe passou a fazer com o tempo liberado.","Escreva o caso em cinco linhas."]'::jsonb,
   'Esse texto de cinco linhas é o que aprova a próxima iniciativa.', now())
on conflict (id) do nothing;

-- ===== Curso 4: Ecossistema Cloud =====
insert into public.lessons
  (id, module_id, title, summary, sort_order, access_type, status, duration_seconds,
   application_title, application_minutes, application_steps, application_note, published_at)
values
  ('c0000000-0000-4000-8000-000000000401','b0000000-0000-4000-8000-000000000401','O vocabulário mínimo para conversar com TI',
   'Os poucos termos que você realmente precisa para não delegar uma decisão que é sua. Sem virar engenheiro.',
   1,'inherit','published',1440,'Liste o que você não entendeu na última conversa com TI.',15,
   '["Anote os termos que passaram batido.","Marque quais mudavam a sua decisão.","Peça a definição prática dos que restaram.","Escreva cada um com as suas palavras."]'::jsonb,
   'Vocabulário é o que separa delegar de abdicar.', now()),
  ('c0000000-0000-4000-8000-000000000402','b0000000-0000-4000-8000-000000000401','Onde uma automação quebra em produção',
   'Os pontos de falha que aparecem só depois que aquilo passa a rodar todo dia, sem ninguém olhando.',
   2,'inherit','published',1320,'Mapeie os pontos de falha da sua automação.',15,
   '["Liste as dependências externas do processo.","Marque o que acontece se cada uma falhar.","Escolha a falha mais provável.","Defina o plano para ela."]'::jsonb,
   'Toda automação falha. A diferença é se alguém percebe.', now()),
  ('c0000000-0000-4000-8000-000000000403','b0000000-0000-4000-8000-000000000401','Custo: o que realmente pesa na conta',
   'De onde vem a fatura da nuvem e quais decisões suas mudam esse número de verdade.',
   3,'inherit','published',1440,'Estime o custo da sua primeira automação.',15,
   '["Liste os recursos que ela vai consumir.","Estime a frequência de execução.","Compare com o custo do processo manual atual.","Defina o teto aceitável."]'::jsonb,
   'Custo previsto é o que evita a surpresa do terceiro mês.', now()),

  ('c0000000-0000-4000-8000-000000000404','b0000000-0000-4000-8000-000000000402','Computação e armazenamento na prática',
   'O que roda o processo e onde o dado descansa — pela ótica de quem vai operar, não de quem vai construir.',
   1,'inherit','published',1920,'Classifique os dados da sua área.',20,
   '["Liste os dados que a sua automação vai tocar.","Marque quais precisam de resposta imediata.","Marque quais só são consultados de vez em quando.","Aponte o que pode ser arquivado."]'::jsonb,
   'Nem todo dado precisa estar sempre à mão.', now()),
  ('c0000000-0000-4000-8000-000000000405','b0000000-0000-4000-8000-000000000402','Rede e acesso sem complicar',
   'Quem fala com quem, por onde, e o mínimo de controle que evita a conversa difícil depois.',
   2,'inherit','published',2040,'Desenhe o caminho do seu dado.',20,
   '["Desenhe de onde o dado sai e para onde vai.","Marque cada ponto de passagem.","Identifique quem tem acesso a cada ponto.","Aponte o elo mais frágil."]'::jsonb,
   'O elo mais frágil é onde a conversa com TI começa.', now()),
  ('c0000000-0000-4000-8000-000000000406','b0000000-0000-4000-8000-000000000402','Monitoramento do que importa',
   'A diferença entre ter log e saber que algo parou. Poucos sinais, bem escolhidos.',
   3,'inherit','published',2040,'Escolha os três sinais da sua operação.',20,
   '["Defina o que significa a automação estar saudável.","Escolha três sinais que provam isso.","Defina o limite de cada um.","Aponte quem é avisado quando o limite estoura."]'::jsonb,
   'Três sinais que alguém olha valem mais que trinta que ninguém vê.', now()),

  ('c0000000-0000-4000-8000-000000000407','b0000000-0000-4000-8000-000000000403','Colocando um fluxo em produção',
   'O caminho entre funcionar na sua máquina e rodar todo dia às sete da manhã.',
   1,'inherit','published',2160,'Escreva o combinado de entrada em produção.',25,
   '["Defina a janela de execução.","Aponte o responsável pela primeira semana.","Escreva o que fazer se não rodar.","Marque a data da revisão."]'::jsonb,
   'Produção começa com um combinado escrito, não com um deploy.', now()),
  ('c0000000-0000-4000-8000-000000000408','b0000000-0000-4000-8000-000000000403','Quando algo para: o que olhar primeiro',
   'Uma ordem de investigação que evita meia hora de pânico e chute.',
   2,'inherit','published',2280,'Monte o seu roteiro de primeira resposta.',25,
   '["Liste as três causas mais prováveis de parada.","Ordene o que checar primeiro.","Aponte onde cada informação está.","Deixe isso escrito onde o time acha."]'::jsonb,
   'O roteiro serve justamente para o dia em que você não está.', now()),
  ('c0000000-0000-4000-8000-000000000409','b0000000-0000-4000-8000-000000000403','Rotina de manutenção enxuta',
   'O mínimo recorrente que mantém a automação viva sem virar um segundo emprego.',
   3,'inherit','published',2160,'Defina a manutenção da sua automação.',20,
   '["Liste o que precisa ser checado periodicamente.","Defina a frequência de cada item.","Aponte o responsável.","Some o tempo mensal disso."]'::jsonb,
   'Se a manutenção custa mais que o ganho, a automação está errada.', now()),

  ('c0000000-0000-4000-8000-000000000410','b0000000-0000-4000-8000-000000000404','Permissões que não travam o time',
   'Controle suficiente para dormir tranquilo e leve o bastante para o time não criar atalho por fora.',
   1,'inherit','published',2400,'Revise quem acessa o quê na sua área.',25,
   '["Liste os acessos que a sua operação usa.","Marque quem precisa de cada um de verdade.","Identifique os acessos herdados de funções antigas.","Proponha o corte."]'::jsonb,
   'Acesso demais e acesso de menos criam o mesmo problema: atalho.', now()),
  ('c0000000-0000-4000-8000-000000000411','b0000000-0000-4000-8000-000000000404','Dado sensível na nuvem',
   'O que muda quando o dado é de pessoa, de cliente ou de contrato — e o combinado mínimo com o jurídico.',
   2,'inherit','published',2400,'Classifique o que a sua automação toca.',25,
   '["Liste os campos de dado envolvidos.","Marque os que identificam alguém.","Aponte o tempo de retenção de cada um.","Leve a lista para o jurídico."]'::jsonb,
   'A conversa com o jurídico é mais curta com a lista pronta.', now()),
  ('c0000000-0000-4000-8000-000000000412','b0000000-0000-4000-8000-000000000404','O combinado com TI',
   'O documento curto que evita a discussão de quem é a culpa quando algo para.',
   3,'inherit','published',2400,'Escreva o combinado da sua área com TI.',25,
   '["Defina o que é responsabilidade da sua área.","Defina o que é responsabilidade de TI.","Aponte o canal e o prazo de resposta.","Combine a revisão trimestral."]'::jsonb,
   'Combinado escrito é o que sustenta a automação no ano dois.', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- EVENTOS
-- ---------------------------------------------------------------------
insert into public.events
  (id, title, description, starts_at, format, instructor_name, access_type, status, recording_url)
values
  ('d0000000-0000-4000-8000-000000000001',
   'Como identificar oportunidades reais de IA na sua operação',
   'Encontro ao vivo para ler a própria área antes de escolher qualquer ferramenta.',
   ((date_trunc('year', now())::date + interval '8 month' + interval '8 day')::date + time '19:00') at time zone 'America/Sao_Paulo',
   'Webinar', 'Time Kalidash', 'free', 'published', null),

  ('d0000000-0000-4000-8000-000000000002',
   'Clínica de operação: onde a IA entra primeiro',
   'Traga um processo da sua área. Analisamos ao vivo.',
   ((date_trunc('year', now())::date + interval '8 month' + interval '22 day')::date + time '19:00') at time zone 'America/Sao_Paulo',
   'Live', 'Time Kalidash', 'free', 'published', null),

  ('d0000000-0000-4000-8000-000000000003',
   'Cloud na prática: o que sustenta uma automação',
   'O que precisa existir por baixo para uma automação rodar todo dia.',
   ((date_trunc('year', now())::date + interval '9 month' + interval '6 day')::date + time '19:00') at time zone 'America/Sao_Paulo',
   'Live', 'César Germano', 'paid', 'published', null),

  ('d0000000-0000-4000-8000-000000000004',
   'Abertura da AI League — o que vamos construir juntos',
   'Gravação da abertura da AI League.',
   ((date_trunc('year', now())::date + interval '7 month' + interval '11 day')::date + time '19:00') at time zone 'America/Sao_Paulo',
   'Gravação', 'Time Kalidash', 'free', 'published', 'https://www.youtube.com/'),

  ('d0000000-0000-4000-8000-000000000005',
   'Primeiros passos em automação da operação',
   'Gravação do encontro de julho.',
   ((date_trunc('year', now())::date + interval '6 month' + interval '28 day')::date + time '19:00') at time zone 'America/Sao_Paulo',
   'Gravação', 'Time Kalidash', 'free', 'published', 'https://www.youtube.com/')
on conflict (id) do nothing;
