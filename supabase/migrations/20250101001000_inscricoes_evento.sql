-- =====================================================================
-- Inscrição em evento.
--
-- O design pede "Minhas inscrições" com selo INSCRITO e CTA "Entrar ao
-- vivo". Até aqui o botão "Inscrever-se" só abria o link externo e nada
-- ficava registrado: a pessoa perdia o evento de vista e o Admin não
-- sabia quantos tinham interesse.
-- =====================================================================

create table if not exists public.event_registrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_reg_event_idx on public.event_registrations(event_id);

alter table public.event_registrations enable row level security;

drop policy if exists event_reg_own   on public.event_registrations;
drop policy if exists event_reg_admin on public.event_registrations;

create policy event_reg_own on public.event_registrations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy event_reg_admin on public.event_registrations
  for select to authenticated
  using (public.is_admin());

-- Contagem pública de inscritos, sem expor quem são. A view roda como
-- dona (security definer por ser owner) para que qualquer autenticado
-- veja o total sem poder ler as linhas das outras pessoas.
create or replace view public.event_registration_counts
with (security_invoker = false) as
  select event_id, count(*)::int as total
  from public.event_registrations
  group by event_id;

grant select on public.event_registration_counts to authenticated;
