-- =====================================================================
-- Integração com o Google Calendar.
--
-- O desenho da tela de Eventos tem um cartão "Conectar Google Calendar".
-- Para ele funcionar de verdade é preciso guardar o refresh token do
-- Google — que é uma credencial de longa duração da pessoa.
--
-- Por isso esta tabela tem RLS ligada e NENHUMA política: nem o próprio
-- dono consegue ler a própria linha pelo PostgREST. Só a Edge Function,
-- que usa service role, enxerga. O frontend sabe apenas se a conexão
-- existe, pela flag em `profiles`.
-- =====================================================================

create table if not exists public.user_google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_google_tokens enable row level security;

-- Sem políticas de propósito. Qualquer select/insert vindo do browser
-- é negado; a Edge Function passa por cima com service role.
revoke all on public.user_google_tokens from anon, authenticated;

create or replace trigger user_google_tokens_updated_at
  before update on public.user_google_tokens
  for each row execute function public.set_updated_at();

-- Flag legível pelo app: só diz se existe conexão, nada do token.
alter table public.profiles
  add column if not exists google_calendar_connected boolean not null default false;

-- O id do evento criado na agenda da pessoa, para conseguir remover
-- quando ela cancelar a inscrição.
alter table public.event_registrations
  add column if not exists google_event_id text;
