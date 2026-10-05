# Sistema de design — Kalidash Academy

Extraído do Figma Make (`x0bosRF7LncQL8BpDB6Nw3`) lendo o DOM do preview, não
a olho. Esta é a fonte de verdade; o Figma exige login e o link do preview
expira em 60 segundos.

## Cores

| Token | Hex | Uso |
|---|---|---|
| `--ink` | `#19171b` | texto principal |
| `--limestone` | `#f1ece4` | fundo da aplicação, item de nav ativo |
| `--imperial` | `#28183b` | botão primário, aba ativa |
| `--champagne` | `#e5ce96` | destaque editorial (o "Continue." em itálico) |
| `--bronze` | `#a88a58` | kickers, links |
| `--muted` | `#6b6570` | texto secundário, nav inativo |
| `--surface` | `#ffffff` | cartões |
| `--line` | `#ebe5dc` | borda de cartão (0.8px) |
| `--field-line` | `#ddd7ce` | borda de campo |
| `--placeholder` | `#9b9399` | placeholder, ícone de campo |
| `--hero-bg` | `#0e0a14` | fundo do painel de arte do login |
| `--hero-fg` | `#fdfcfa` | título sobre a arte |
| `--stone` | `#d1cbc2` / `#b5ae9a` | separadores, estados apagados |

Tema **claro apenas**. O alternador dark/light foi removido: o Figma não
define versão escura e manter duas dobraria o ajuste de cada tela.

## Tipografia

- **Display:** `"Playfair Display", Georgia, serif` — títulos
- **Texto:** `"DM Sans", system-ui, sans-serif` — interface
- **Mono:** `"JetBrains Mono", "Fira Code", monospace`

| Elemento | Fonte | Tamanho | Peso | Entrelinha | Tracking |
|---|---|---|---|---|---|
| H1 de página | Playfair | 51.2px | 600 | 1.05 | -0.025em |
| Corpo | DM Sans | 16px | 400 | 1.5 | normal |
| Nav | DM Sans | 14px | 400 / 600 ativo | 1.5 | normal |
| Kicker | DM Sans | 10px | 700 | 1.5 | 0.1em, caixa alta, cor bronze |

## Componentes

**Botão primário** — `bg imperial`, `color limestone`, raio **10px**,
padding `11px 24px`, DM Sans 14px/600. Sem sombra.

**Cartão** — `bg #fff`, raio **16px**, borda `0.8px solid #ebe5dc`. Sem sombra.

**Nav item** — raio 10px, padding `9px 12px`. Ativo: `bg limestone`, peso 600,
cor ink. Inativo: transparente, peso 400, cor muted.

Raios em geral: 10px (controles), 16px (cartões), 999px só onde o desenho
pedir pílula.

## Navegação

`Início · Explorar · Minha Jornada · Aplicar · Eventos · Comunidade · Perfil`

## Conceitos do produto novo

Além do visual, o design introduz (nada disso existe no banco atual):

- **Trilhas** além de cursos — `Explorar` separa Todos / Trilhas / Cursos / Eventos
- **Competências** (AI Literacy, Opportunity Mapping, Agent Design, Governança)
  com barra de progresso por pessoa
- **Minha Jornada** — caminho de 5 etapas com estado por etapa
- **Aplicar** — Kalidash Labs (exercícios práticos) e Cases
- **Comunidade**
- Na aula: abas Visão geral / Transcrição / Materiais / Minhas anotações,
  quiz de verificação e cartão de "Próxima etapa"
- Curso: nível, certificado de conclusão, "Salvar para depois"
- Onboarding de 3 etapas (área, objetivo, nível)
- Login social Google e Microsoft

---

# Estrutura de cada tela

Extraída do protótipo navegando o DOM. Esta seção é a especificação que
guia a implementação — o Figma não é acessível de forma confiável.

## Minha Jornada

- H1 "Minha Jornada" + "Veja o que você já desenvolveu e qual é o seu próximo passo."
- Hero da trilha: kicker SUA TRILHA, nome, descrição, link "Ver visão geral da trilha",
  **barra de progresso dourada**, "68% concluído"
- Três números: `12 de 18 atividades concluídas` · `4h restantes de conteúdo` ·
  `2 semanas ritmo sugerido`
- Abas: **Etapas · Competências · Minhas anotações**
- Etapas numeradas e expansíveis, com estado:
  - concluída → `100%`
  - em andamento → `3 de 5 atividades`, `60%`, lista de atividades com tipo
    (Vídeo · 8 min / Leitura · 12 min / Aula · 15 min / Ferramenta · 5 min)
    e CTA por item (`Ver novamente` / `Continuar`)
  - bloqueada → `Não iniciada`
- Coluna direita: PRÓXIMA ATIVIDADE (selo KALIDASH LAB, título, descrição,
  minutos, "Etapa 3 · Aplicar na operação", CTA "Continuar atividade"),
  SUAS COMPETÊNCIAS com %, SEU PROGRESSO NO TEMPO (Sem 1..4 + frase
  "Você evoluiu 40% nas últimas 4 semanas.")

## Aplicar

- H1 "Aplicar" + "Transforme conhecimento em prática com Labs e Cases."
- Abas: **Kalidash Labs · Cases**
- LAB EM DESTAQUE: imagem, título, descrição, nível, minutos, skills, "Aplicar agora"
- TODOS OS LABS: filtros `Todos os níveis` · `Todas as skills` · `Mais recentes`
- Item de lab: imagem, título, descrição, nível, minutos, skills e **estado**
  (`Concluído` / `Em andamento` / `Novo`)
- Coluna direita: SKILLS DESENVOLVIDAS (%), ÚLTIMA APLICAÇÃO (selo Concluído,
  título, minutos, data, resumo do que a pessoa escreveu, "Ver minha aplicação"),
  CONTINUE SUA PRÁTICA (CTA "Explorar outros Labs")

## Comunidade

- Kicker KALIDASH COMMUNITY, H1 "Comunidade",
  "Conecte-se com profissionais, compartilhe experiências e encontre novas oportunidades."
- CTA no topo: "Ir para o WhatsApp"
- Três números: `248 membros na comunidade` · `36 conexões disponíveis` ·
  `12 vagas e oportunidades`
- NETWORKING → "Pessoas para você conhecer": avatar de iniciais, nome,
  "Cargo · Empresa", chip de interesse, botão `Conectar`
- OPORTUNIDADES → "Vagas em destaque": título, empresa, local, "Há N dias",
  tipo (Tempo integral / Projeto)
- CONVERSAS QUE CONTINUAM: card do WhatsApp com 3 bullets e "Acessar comunidade",
  nota "O link será aberto em uma nova aba."

## Eventos

- H1 "Eventos" + "Encontros para aprofundar, aplicar e discutir o que você está desenvolvendo."
- PRÓXIMOS: dia/mês grande, selos (CLÍNICA / WORKSHOP / DISCUSSÃO + AO VIVO + GRATUITO),
  título, descrição, `19h (BRT)`, apresentador, "Inscrever-se"
- MINHAS INSCRIÇÕES: mesmo card com selo `INSCRITO` e CTA "Entrar ao vivo"
- Coluna direita INTEGRAÇÃO → **Google Calendar**: mês navegável com os dias
  dos eventos destacados, "Conectar Google Calendar",
  nota "Você controla quais calendários serão sincronizados e pode desconectar quando quiser."
  (conexão visual; sincronizar de verdade exige OAuth)

## Perfil

- Nome + "AI Operations · Foundations" + "Seu histórico de aprendizagem,
  aplicação e competências." + "Compartilhar perfil"
- Quatro números: aulas concluídas · cursos concluídos · Labs concluídos · Case concluído
- COMPETÊNCIAS: nome, %, rótulo de nível (Intermediário / Em desenvolvimento / Iniciante)
- **CERTIFICADOS** (não "credenciais"): título, "Curso · Kalidash Academy",
  "Concluído em DD mmm AAAA", selo Concluído
- CASES: selo CASE, título, resumo, "Ver case"
- ATIVIDADE RECENTE: frase + "N dias atrás"
- CONFIGURAÇÕES DA CONTA: Dados da conta · Preferências · Segurança
- Largura máxima 1280, centralizado

## Aula

- Título em Playfair, player com controles próprios
- Chip "Marcada como concluída"
- Abas: **Visão geral · Transcrição · Materiais (N) · Minhas anotações**
  (anotações com salvamento automático; aparecem também em Minha Jornada)
- Coluna direita: VERIFICAÇÃO DE CONHECIMENTO (pergunta, alternativas,
  "Verificar resposta") e PRÓXIMA ETAPA (selo do Lab, título, "Laboratório
  prático · 20 min")

## Curso / Trilha

- Hero com título, descrição e chips: `N módulos`, duração, nível
  (`Iniciante a Intermediário`), `Certificado de conclusão`
- Imagem editorial
- Cartão fixo na lateral: preço/acesso (`Gratuito` + selo `PREMIUM`),
  "Começar trilha", "Salvar para depois", e a ficha
  (`3 módulos / 12 aulas no total`, `2h 30min de conteúdo`, `Certificado ao concluir`)
- "O que você vai aprender": lista com check
