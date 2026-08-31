# Kalidash Academy

Aprenda. Aplique. Continue.

React + Vite + TypeScript no frontend. Supabase (Postgres, Auth, Storage, Edge
Functions) como backend. Mux para vídeo.

---

## O que já está pronto

**Aluno:** login/cadastro, Home com "Comece aqui" e "Continue de onde parou",
Conteúdos (Para você / Explorar + filtros por área), página de conteúdo com
estrutura visível mesmo bloqueada, página de aula com vídeo Mux, texto em
Markdown, "Aplique no seu trabalho", "Leve com você" e "Seu próximo passo",
Eventos, Perfil e personalização (área + objetivo).

**Admin (`/admin`):** CRUD de cursos, construtor de módulos e aulas, upload de
vídeo direto para o Mux, materiais no Storage privado, CRUD de eventos e troca
de acesso free/paid dos usuários.

Nada de conteúdo está hardcoded. Publicar um curso novo não exige tocar em
código.

---

## Estado atual

O Supabase **já está provisionado e funcionando**:

| | |
|---|---|
| Projeto | `kalidash-academy` (org Spectra, região `sa-east-1`) |
| Project Ref | `cszjhskzvbfmkmuexgxc` |
| Migrations | 5 aplicadas (schema, RLS, storage, fix do guard, hardening) |
| Seed | 7 cursos, 11 módulos, 26 aulas, 5 eventos |
| Buckets | `academy-public` e `academy-materials` criados |
| Edge Functions | `get-material-download` no ar |
| `.env` | já preenchido com as credenciais reais |

Basta `npm run dev`.

### Duas coisas pendentes

**1. Confirmação de e-mail está ligada.** Contas novas não conseguem entrar
até confirmar o e-mail, e o SMTP padrão do Supabase é limitadíssimo. Para
testar, desligue em **Authentication → Providers → Email → Confirm email**.
Em produção, ligue de volta e configure um SMTP próprio.

**2. Existe uma conta de teste com senha conhecida.** Foi criada para validar
os fluxos (admin, pago) e a senha **não** está versionada aqui de propósito.
**Apague essa conta antes de ir ao ar**, em Authentication → Users. Crie a
sua própria conta e promova com o SQL do passo 7.

Falta o Mux — sem ele, aulas de texto funcionam por completo e o player
mostra "sem vídeo" sem quebrar. Passos 8 a 13 quando você tiver a conta.

---

## Setup do zero — 15 passos

*(Só se você for recriar o projeto. O de cima já está pronto.)*

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

Em https://supabase.com/dashboard, crie um projeto novo. Guarde a **senha do
banco** — ela é pedida no `db push`.

Anote o **Project Ref** (aparece na URL do dashboard e em Settings → General).

### 3. Rodar as migrations

Instale a CLI do Supabase (https://supabase.com/docs/guides/local-development/cli/getting-started),
depois:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

```bash
npx supabase db push
```

Isso aplica, na ordem:

- `20250101000000_init.sql` — tabelas, enums, triggers
- `20250101000100_rls.sql` — Row Level Security e as views de estrutura
- `20250101000200_storage.sql` — buckets e políticas de Storage
- `20250101000300_fix_privilege_guard.sql` — deixa o servidor promover admin
- `20250101000400_hardening.sql` — fecha as funções expostas como RPC

### 4. Buckets

O passo 3 já cria os dois buckets:

- `academy-public` — thumbnails e avatares. Leitura pública, escrita só admin.
- `academy-materials` — PDFs e planilhas. **Privado.** O aluno nunca lê direto;
  recebe uma signed URL de 2 minutos da Edge Function.

Confira em Storage → Buckets que `academy-materials` está com **Public = off**.

### 5. Configurar o Auth

Em Authentication → URL Configuration:

- **Site URL:** `http://localhost:5173` (troque pela URL de produção depois)
- **Redirect URLs:** adicione `http://localhost:5173/redefinir-senha` e, em
  produção, `https://SEU_DOMINIO/redefinir-senha`

Em Authentication → Providers → Email: deixe **Confirm email** ligado em
produção. Para testar rápido, desligue.

### 6. Rodar o seed

Em SQL Editor, cole o conteúdo de `supabase/seed.sql` e execute. Isso cria os
conteúdos do protótipo (a aula aberta, IA para Líderes, Financeiro, Cloud e os
três "em breve") e cinco eventos.

Os materiais **não** são semeados: os arquivos ainda não existem no Storage.
Suba-os pelo Admin, em Aula → Materiais adicionais.

### 7. Criar o primeiro admin

Crie sua conta normalmente pela tela de login do app. Depois, no SQL Editor:

```sql
update public.profiles
set role = 'admin', access_level = 'paid'
where email = 'SEU@EMAIL.COM';
```

A partir daí você promove outros admins pela tela `/admin/usuarios`.

> Isso só funciona por causa da migration `20250101000300`. A versão
> original do trigger `guard_profile_privileges` revertia esse UPDATE **em
> silêncio**, porque ele decidia por `is_admin()`, que é falso sempre que
> não há usuário logado — inclusive no SQL Editor e no `service_role`. A
> correção libera quando `auth.uid()` é nulo (contexto de servidor) e
> mantém a trava para aluno logado. É a mesma correção que vai permitir o
> futuro webhook de pagamento gravar `access_level`.

### 8. Criar a conta no Mux

Em https://dashboard.mux.com, crie a conta. O plano **Free** tem limite externo
de vídeos armazenados — a plataforma não tem limite próprio, mas o Mux vai
recusar novos uploads quando o limite for atingido, e o Admin mostra a
mensagem de erro correspondente. Remova um vídeo antigo (Aula → Remover vídeo,
que apaga o asset no Mux também) ou faça upgrade.

### 9. Criar as credenciais de API

Settings → Access Tokens → Generate new token.

- Permissões: **Mux Video** com acesso de leitura e escrita
- Guarde o **Token ID** e o **Token Secret**

### 10. Criar a signing key

Settings → Signing Keys → Create new key, tipo **Signed playback**.

Guarde o **Key ID** e a **Private Key** (o Mux entrega em base64 — pode colar
como está).

### 11. Configurar o webhook

Settings → Webhooks → Create new webhook.

- URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/mux-webhook`
- Guarde o **Signing Secret** do webhook

### 12. Definir os secrets das Edge Functions

```bash
npx supabase secrets set MUX_TOKEN_ID=xxx MUX_TOKEN_SECRET=xxx MUX_SIGNING_KEY_ID=xxx MUX_SIGNING_PRIVATE_KEY=xxx MUX_WEBHOOK_SECRET=xxx APP_ORIGIN=http://localhost:5173
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem no
runtime das Edge Functions — não precisa defini-las.

Em produção, troque `APP_ORIGIN` pela origem real do site (ela vira o
`cors_origin` do Direct Upload do Mux).

### 13. Deploy das Edge Functions

```bash
npx supabase functions deploy create-mux-upload get-video-playback-token get-material-download delete-mux-video
```

O webhook precisa ir **sem** verificação de JWT, porque quem chama é o Mux:

```bash
npx supabase functions deploy mux-webhook --no-verify-jwt
```

### 14. Configurar o `.env` e rodar local

```bash
cp .env.example .env
```

Preencha com os valores de Settings → API do Supabase:

```
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm run dev
```

Abra http://localhost:5173.

### 15. Deploy do frontend

Build:

```bash
npm run build
```

O resultado fica em `dist/`.

**Vercel:**

- Framework preset: `Vite` (detectado sozinho)
- Build command: `npm run build`
- Output directory: `dist`
- Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

O fallback de SPA vem do `vercel.json` (`rewrites` de `/(.*)` para
`/index.html`). **Sem ele o Vercel devolve 404** em `/conteudos`, `/perfil` e
`/admin` quando a página é recarregada — o Vercel não lê `public/_redirects`.

**Cloudflare Pages ou Netlify:**

- Build command: `npm run build`
- Build output directory: `dist`
- Mesmas duas variáveis de ambiente

Nesses dois o fallback vem do `public/_redirects` (`/* /index.html 200`).

Os dois arquivos convivem sem conflito: cada host lê o seu e ignora o outro.

Depois do deploy, volte e ajuste:

- Supabase → Auth → Site URL e Redirect URLs para o domínio real
- `APP_ORIGIN` nos secrets das Edge Functions
- Mux → o webhook continua apontando para o Supabase, não muda

---

## Comandos

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm test
```

`npm test` roda as regras puras de acesso e formatação (12 testes, sem rede).

---

## Como o acesso free/paid funciona

Cada usuário tem `role` (`student` | `admin`) e `access_level` (`free` |
`paid`). Não existe outro plano.

Cada aula tem `access_type`: `inherit` (segue o curso), `free` ou `paid`. É isso
que permite "IA para Líderes" ser um curso gratuito com o módulo 1 aberto e os
módulos 2 e 3 pagos.

A regra é aplicada em três camadas, e as três são reais:

1. **RLS** — a linha completa da aula (texto, aplicação, materiais) só sai do
   banco para quem tem acesso. Quem não tem enxerga apenas as views
   `lesson_outline` e `material_outline`: título, duração, nome do arquivo. A
   estrutura aparece; o conteúdo não.
2. **Playback assinado** — o vídeo usa signed playback do Mux. Saber o
   `playback_id` não basta: é preciso um JWT curto que só a Edge Function
   `get-video-playback-token` emite, e só depois de checar o acesso.
3. **Download assinado** — o bucket de materiais é privado. A signed URL de 2
   minutos vem da `get-material-download`, também após checagem.

Trocar alguém para pago: `/admin/usuarios` → **Mudar para Pago**. Quando houver
checkout, o webhook do gateway só precisa fazer
`update profiles set access_level = 'paid'` — nada mais muda.

### Verificado, não presumido

Rodei estes cenários contra o banco real, simulando o JWT do usuário:

| Cenário | Resultado |
|---|---|
| Aluno free lê a linha completa da aula gratuita | 1 linha |
| Aluno free lê a linha completa da aula **paga** | **0 linhas** |
| Aluno free lê a estrutura da aula paga (view) | 1 linha |
| Aluno free lê curso em rascunho | 0 linhas |
| Aluno free lê perfil de outra pessoa | 0 linhas |
| Aluno tenta `update profiles set role='admin'` | revertido para `student` |
| O mesmo update mexendo em `full_name` | permitido |
| Depois de virar `paid`: linha completa da aula paga | 1 linha |

### Um aviso do linter que fica de propósito

O linter do Supabase acusa `security_definer_view` em `lesson_outline` e
`material_outline`. É intencional: essas views existem justamente para
mostrar a estrutura de uma aula bloqueada sem passar pela RLS de `lessons`.
Elas filtram sozinhas para conteúdo publicado e não expõem `body_markdown`,
a aplicação prática nem o `storage_path`. Trocar para `security_invoker`
faria a trilha paga sumir da vitrine — o oposto do produto.

Também ficam quatro avisos de `SECURITY DEFINER` executável por usuário
logado (`is_admin`, `is_paid`, `can_access_lesson`, `course_is_visible`).
Testei revogar: o app inteiro quebra com `42501 permission denied for
function is_admin`, porque expressão de policy roda com o privilégio de
quem consulta. As quatro só respondem sobre o próprio chamador.

---

## Upload de vídeo

O arquivo vai do **browser direto para o Mux**. Nunca passa pelo Supabase nem
por um servidor nosso.

```
Admin → create-mux-upload (Edge Function, valida admin)
      → Mux cria Direct Upload
      → browser envia via UpChunk (retomável)
      → Mux processa
      → mux-webhook grava asset_id, playback_id e duração
      → video_status = ready
```

Enquanto o Mux processa, o Admin mostra "Processando..." e atualiza sozinho.

**Remover vídeo** apaga o asset no Mux também — importante no plano Free, onde
asset órfão ocupa vaga.

---

## Checklist de validação

Depois do setup, confira estes fluxos:

- [ ] Criar conta e entrar
- [ ] Home mostra "Comece aqui" para usuário novo
- [ ] Usuário free abre e assiste a aula gratuita
- [ ] Usuário free vê a estrutura do curso pago, mas não reproduz o vídeo
- [ ] Marcar "aplicado" persiste depois de recarregar
- [ ] Fechar o navegador, voltar e ver "Continue de onde parou" no ponto certo
- [ ] Admin muda o usuário para pago → curso pago abre após recarregar
- [ ] Admin cria curso, módulo e aula
- [ ] Admin sobe um vídeo real e o status vira "Pronto" sozinho
- [ ] Admin sobe um material e o aluno autorizado baixa
- [ ] Aluno sem acesso **não** baixa o material
- [ ] `/conteudos` e `/admin` funcionam ao recarregar a página em produção

---

## Estrutura

```
src/
  components/   layout, player, aplicação, materiais, modais
  pages/        Login, Home, Conteúdos, Conteúdo, Aula, Eventos, Perfil
  admin/        CMS: cursos, módulos, aulas, vídeo, materiais, eventos, usuários
  hooks/        useAuth, useCatalog
  lib/          supabase, acesso, formatação, markdown, tema, ícones
  services/     catálogo, progresso, mídia, admin
  types/        tipos do schema

supabase/
  migrations/   schema, RLS, storage
  functions/    Edge Functions (Deno)
  seed.sql      conteúdo inicial do protótipo

tests/          regras puras de acesso e formatação
```

---

## O que NÃO existe nesta versão (de propósito)

Checkout, Stripe/Hotmart, assinatura, múltiplos planos, AI Builder, chat,
comunidade, gamificação, XP, certificados, analytics, In Company, favoritos,
anotações e busca avançada.

A arquitetura está pronta para o pagamento entrar depois sem redesenho: basta
um webhook que altere `access_level`.
