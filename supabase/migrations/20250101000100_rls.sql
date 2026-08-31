-- =====================================================================
-- Kalidash Academy — Row Level Security
-- =====================================================================
-- Regra geral:
--   * metadados/estrutura de conteúdo publicado  -> qualquer autenticado
--   * conteúdo em si (texto, aplicação, material) -> só quem tem acesso
--   * escrita de conteúdo                         -> só admin
--   * progresso                                   -> só o dono
-- =====================================================================

alter table public.profiles         enable row level security;
alter table public.courses          enable row level security;
alter table public.course_modules   enable row level security;
alter table public.lessons          enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.lesson_progress  enable row level security;
alter table public.events           enable row level security;

-- ---------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------

-- o curso está visível na vitrine?
create or replace function public.course_is_visible(p_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and c.status in ('published','coming_soon')
  );
$fn$;

-- acesso efetivo de uma aula: 'free' ou 'paid'
create or replace function public.lesson_effective_access(p_lesson_id uuid)
returns course_access
language sql
security definer
stable
set search_path = public
as $fn$
  select case
           when l.access_type = 'free' then 'free'::course_access
           when l.access_type = 'paid' then 'paid'::course_access
           else c.access_type
         end
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c        on c.id = m.course_id
  where l.id = p_lesson_id;
$fn$;

-- o usuário atual pode CONSUMIR esta aula (vídeo, texto, materiais)?
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c        on c.id = m.course_id
    where l.id = p_lesson_id
      and auth.uid() is not null
      and (
        public.is_admin()
        or (
          l.status = 'published'
          and c.status = 'published'
          and (
            case
              when l.access_type = 'free' then true
              when l.access_type = 'paid' then public.is_paid()
              else (c.access_type = 'free' or public.is_paid())
            end
          )
        )
      )
  );
$fn$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
drop policy if exists profiles_select_own   on public.profiles;
drop policy if exists profiles_select_admin on public.profiles;
drop policy if exists profiles_update_own   on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_insert_own   on public.profiles;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- O usuário edita o próprio perfil. role/access_level são protegidos pelo
-- trigger abaixo (RLS não faz coluna a coluna em UPDATE).
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- trava: usuário comum não muda role nem access_level de ninguém
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if public.is_admin() then
    return new;
  end if;
  new.role         := old.role;
  new.access_level := old.access_level;
  new.email        := old.email;
  return new;
end;
$fn$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------
drop policy if exists courses_select_visible on public.courses;
drop policy if exists courses_admin_all      on public.courses;

create policy courses_select_visible on public.courses
  for select to authenticated
  using (status in ('published','coming_soon') or public.is_admin());

create policy courses_admin_all on public.courses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- course_modules
-- ---------------------------------------------------------------------
drop policy if exists modules_select_visible on public.course_modules;
drop policy if exists modules_admin_all      on public.course_modules;

create policy modules_select_visible on public.course_modules
  for select to authenticated
  using (public.course_is_visible(course_id) or public.is_admin());

create policy modules_admin_all on public.course_modules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- lessons
-- A LINHA COMPLETA (inclui body_markdown e a aplicação prática) só aparece
-- para quem tem acesso. A estrutura da trilha para quem não tem acesso vem
-- da view lesson_outline, mais abaixo.
-- ---------------------------------------------------------------------
drop policy if exists lessons_select_accessible on public.lessons;
drop policy if exists lessons_admin_all         on public.lessons;

create policy lessons_select_accessible on public.lessons
  for select to authenticated
  using (public.can_access_lesson(id));

create policy lessons_admin_all on public.lessons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- lesson_materials
-- ---------------------------------------------------------------------
drop policy if exists materials_select_accessible on public.lesson_materials;
drop policy if exists materials_admin_all         on public.lesson_materials;

create policy materials_select_accessible on public.lesson_materials
  for select to authenticated
  using (public.can_access_lesson(lesson_id));

create policy materials_admin_all on public.lesson_materials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- lesson_progress — só o dono. E só em aula que ele pode consumir.
-- ---------------------------------------------------------------------
drop policy if exists progress_select_own on public.lesson_progress;
drop policy if exists progress_insert_own on public.lesson_progress;
drop policy if exists progress_update_own on public.lesson_progress;
drop policy if exists progress_admin_read on public.lesson_progress;

create policy progress_select_own on public.lesson_progress
  for select to authenticated
  using (user_id = auth.uid());

create policy progress_admin_read on public.lesson_progress
  for select to authenticated
  using (public.is_admin());

create policy progress_insert_own on public.lesson_progress
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_lesson(lesson_id));

create policy progress_update_own on public.lesson_progress
  for update to authenticated
  using (user_id = auth.uid() and public.can_access_lesson(lesson_id))
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------
drop policy if exists events_select_published on public.events;
drop policy if exists events_admin_all        on public.events;

create policy events_select_published on public.events
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy events_admin_all on public.events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- VIEWS DE ESTRUTURA
-- Servem a vitrine e a página de curso bloqueado: mostram o esqueleto do
-- conteúdo sem entregar o conteúdo. São security definer (padrão de view),
-- então filtram elas mesmas o que pode aparecer.
-- =====================================================================

drop view if exists public.lesson_outline;
create view public.lesson_outline as
  select
    l.id,
    l.module_id,
    m.course_id,
    l.title,
    l.summary,
    l.sort_order,
    l.status,
    l.duration_seconds,
    l.video_status <> 'empty' as has_video,
    case
      when l.access_type = 'free' then 'free'::course_access
      when l.access_type = 'paid' then 'paid'::course_access
      else c.access_type
    end as effective_access
  from public.lessons l
  join public.course_modules m on m.id = l.module_id
  join public.courses c        on c.id = m.course_id
  where l.status = 'published'
    and c.status in ('published','coming_soon');

drop view if exists public.material_outline;
create view public.material_outline as
  select
    mt.id,
    mt.lesson_id,
    mt.title,
    mt.description,
    mt.file_name,
    mt.mime_type,
    mt.file_size,
    mt.sort_order
  from public.lesson_materials mt
  join public.lessons l        on l.id = mt.lesson_id
  join public.course_modules m on m.id = l.module_id
  join public.courses c        on c.id = m.course_id
  where l.status = 'published'
    and c.status in ('published','coming_soon');

revoke all on public.lesson_outline   from anon;
revoke all on public.material_outline from anon;
grant select on public.lesson_outline   to authenticated;
grant select on public.material_outline to authenticated;
