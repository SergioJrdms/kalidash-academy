-- =====================================================================
-- Kalidash Academy — eventos de produto (primeira parte)
--
-- O PostHog cuida do comportamento de interface: clique, navegação,
-- replay, funil. É exploratório e descartável.
--
-- Esta tabela guarda o punhado de sinais que viram DECISÃO de produto e
-- que precisam ser cruzados com curso, aula e usuário: qual "em breve"
-- desperta mais interesse, onde a pessoa abandona a trilha, quem clica
-- em desbloquear. Dado próprio, exato, que não depende de bloqueador de
-- anúncios nem de plano de terceiro.
-- =====================================================================

create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  event      text not null,
  course_id  uuid references public.courses(id) on delete set null,
  lesson_id  uuid references public.lessons(id) on delete set null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_event_time_idx on public.analytics_events(event, created_at desc);
create index if not exists analytics_course_idx     on public.analytics_events(course_id, event);
create index if not exists analytics_user_idx       on public.analytics_events(user_id, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists analytics_insert_own on public.analytics_events;
drop policy if exists analytics_admin_read on public.analytics_events;

-- A pessoa registra os próprios eventos e mais nada. Não pode ler nem os
-- seus: não há motivo de produto, e leitura é superfície desnecessária.
create policy analytics_insert_own on public.analytics_events
  for insert to authenticated
  with check (user_id = auth.uid());

create policy analytics_admin_read on public.analytics_events
  for select to authenticated
  using (public.is_admin());

-- =====================================================================
-- Perguntas de negócio, respondidas em SQL.
-- Todas checam is_admin() por dentro: são security definer para poder
-- cruzar progresso de todo mundo, então a trava fica explícita.
-- =====================================================================

-- "Qual curso é mais assistido?" — vem de lesson_progress, que já existe.
drop function if exists public.admin_course_engagement();
create function public.admin_course_engagement()
returns table (
  curso            text,
  status           text,
  acesso           text,
  aulas            bigint,
  alunos_iniciaram bigint,
  aulas_concluidas bigint,
  aplicacoes       bigint,
  minutos_assistidos numeric
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select c.title,
         c.status::text,
         c.access_type::text,
         count(distinct l.id),
         count(distinct lp.user_id),
         count(*) filter (where lp.completed_at is not null),
         count(*) filter (where lp.applied_at is not null),
         round(coalesce(sum(lp.watched_seconds), 0) / 60.0, 1)
  from public.courses c
  join public.course_modules m  on m.course_id = c.id
  join public.lessons l         on l.module_id = m.id
  left join public.lesson_progress lp on lp.lesson_id = l.id
  group by c.id, c.title, c.status, c.access_type, c.sort_order
  order by count(distinct lp.user_id) desc, c.sort_order;
end;
$fn$;

-- "Qual 'em breve' tem mais interesse?" — o sinal que decide o que produzir.
drop function if exists public.admin_interest_signals();
create function public.admin_interest_signals()
returns table (
  curso              text,
  status             text,
  visualizacoes      bigint,
  pessoas            bigint,
  cliques_desbloquear bigint
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select c.title,
         c.status::text,
         count(*) filter (where a.event = 'course_viewed'),
         count(distinct a.user_id),
         count(*) filter (where a.event = 'unlock_clicked')
  from public.courses c
  left join public.analytics_events a on a.course_id = c.id
  group by c.id, c.title, c.status, c.sort_order
  order by count(*) filter (where a.event = 'unlock_clicked') desc,
           count(*) filter (where a.event = 'course_viewed') desc,
           c.sort_order;
end;
$fn$;

-- "Onde as pessoas abandonam?" — aula a aula, na ordem da trilha.
drop function if exists public.admin_lesson_funnel();
create function public.admin_lesson_funnel()
returns table (
  curso      text,
  modulo     text,
  aula       text,
  ordem      integer,
  iniciaram  bigint,
  concluiram bigint,
  aplicaram  bigint
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select c.title,
         m.title,
         l.title,
         (row_number() over (partition by c.id order by m.sort_order, l.sort_order))::integer,
         count(distinct lp.user_id),
         count(*) filter (where lp.completed_at is not null),
         count(*) filter (where lp.applied_at is not null)
  from public.courses c
  join public.course_modules m on m.course_id = c.id
  join public.lessons l        on l.module_id = m.id
  left join public.lesson_progress lp on lp.lesson_id = l.id
  group by c.id, c.title, c.sort_order, m.title, m.sort_order, l.title, l.sort_order
  order by c.sort_order, m.sort_order, l.sort_order;
end;
$fn$;

-- "O que está acontecendo agora?" — volume por evento nos últimos 30 dias.
drop function if exists public.admin_event_volume();
create function public.admin_event_volume()
returns table (evento text, total bigint, pessoas bigint, ultimo timestamptz)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'acesso negado';
  end if;

  return query
  select a.event, count(*), count(distinct a.user_id), max(a.created_at)
  from public.analytics_events a
  where a.created_at > now() - interval '30 days'
  group by a.event
  order by count(*) desc;
end;
$fn$;

-- Mesmo padrão das demais: PUBLIC não executa, authenticated executa e a
-- própria função barra quem não é admin.
revoke execute on function public.admin_course_engagement()  from public, anon;
revoke execute on function public.admin_interest_signals()   from public, anon;
revoke execute on function public.admin_lesson_funnel()      from public, anon;
revoke execute on function public.admin_event_volume()       from public, anon;

grant execute on function public.admin_course_engagement() to authenticated;
grant execute on function public.admin_interest_signals()  to authenticated;
grant execute on function public.admin_lesson_funnel()     to authenticated;
grant execute on function public.admin_event_volume()      to authenticated;
