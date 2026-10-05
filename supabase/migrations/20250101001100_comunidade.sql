-- =====================================================================
-- Comunidade: diretório de networking, conexões e vagas.
--
-- Decisão de privacidade: ninguém entra no diretório sem pedir. O campo
-- `community_opt_in` nasce `false` e a pessoa liga no Perfil. Sem isso,
-- publicar a tela de Comunidade exporia nome, cargo e empresa de todos
-- os alunos uns para os outros sem que nenhum tivesse concordado.
--
-- O e-mail nunca sai no diretório. O LinkedIn só aparece depois que as
-- duas pessoas aceitaram a conexão.
-- =====================================================================

alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists interest text;
alter table public.profiles
  add column if not exists community_opt_in boolean not null default false;

-- ---------------------------------------------------------------------
-- Conexões
-- ---------------------------------------------------------------------

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index if not exists connections_addressee_idx on public.connections(addressee_id, status);

create or replace trigger connections_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

alter table public.connections enable row level security;

drop policy if exists connections_read   on public.connections;
drop policy if exists connections_insert on public.connections;
drop policy if exists connections_update on public.connections;
drop policy if exists connections_delete on public.connections;

-- Cada um vê as conexões em que aparece, dos dois lados.
create policy connections_read on public.connections
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- Só dá para pedir em nome próprio, e só para quem está no diretório.
create policy connections_insert on public.connections
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = addressee_id and p.community_opt_in
    )
  );

-- Aceitar é privilégio de quem recebeu o pedido. Sem restringir a coluna
-- `status` aqui, quem pediu marcaria o próprio pedido como aceito e
-- destravaria o LinkedIn do outro sem autorização.
create policy connections_update on public.connections
  for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

-- Qualquer um dos dois pode desfazer.
create policy connections_delete on public.connections
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------------------------------------------------------------------
-- Diretório
-- ---------------------------------------------------------------------

-- `security_invoker = false`: a view roda como dona e por isso consegue
-- ler `profiles` sem a política de "só a própria linha". O filtro do
-- opt-in e a lista de colunas são a proteção — e-mail, papel e nível de
-- acesso ficam de fora.
create or replace view public.community_directory
with (security_invoker = false) as
  select
    p.id,
    p.full_name,
    p.headline,
    p.company,
    p.area,
    p.interest,
    case
      when p.id = auth.uid() then p.linkedin_url
      when exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and (
            (c.requester_id = auth.uid() and c.addressee_id = p.id)
            or (c.addressee_id = auth.uid() and c.requester_id = p.id)
          )
      ) then p.linkedin_url
      else null
    end as linkedin_url
  from public.profiles p
  where p.community_opt_in;

grant select on public.community_directory to authenticated;

-- ---------------------------------------------------------------------
-- Vagas
-- ---------------------------------------------------------------------

create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text,
  contract_type text,
  description text,
  apply_url text,
  status text not null default 'published' check (status in ('draft', 'published')),
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger job_openings_updated_at
  before update on public.job_openings
  for each row execute function public.set_updated_at();

alter table public.job_openings enable row level security;

drop policy if exists jobs_read  on public.job_openings;
drop policy if exists jobs_admin on public.job_openings;

create policy jobs_read on public.job_openings
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy jobs_admin on public.job_openings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Números do topo da tela, sem expor as linhas de ninguém.
create or replace view public.community_stats
with (security_invoker = false) as
  select
    (select count(*)::int from public.profiles where community_opt_in) as members,
    (select count(*)::int from public.job_openings where status = 'published') as jobs;

grant select on public.community_stats to authenticated;
