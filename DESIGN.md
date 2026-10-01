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
