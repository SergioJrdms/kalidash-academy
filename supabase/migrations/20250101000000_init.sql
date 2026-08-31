-- =====================================================================
-- Kalidash Academy — schema inicial
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type user_role as enum ('student','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type access_level as enum ('free','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_access as enum ('free','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type course_status as enum ('draft','published','coming_soon');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_access as enum ('inherit','free','paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lesson_status as enum ('draft','published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type video_status as enum ('empty','uploading','processing','ready','error');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft','published');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  full_name     text,
  company       text,
  area          text,
  goal          text,
  role          user_role    not null default 'student',
  access_level  access_level not null default 'free',
  created_at    timestamptz  not null default now(),
  updated_at    timestamptz  not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- cria o profile automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.profiles (id, email, full_name, company)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data->>'full_name', ''), ''),
    nullif(coalesce(new.raw_user_meta_data->>'company', ''), '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- mantém profiles.email em dia se o usuário trocar de e-mail
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_user_email();

-- ---------- helpers de autorização ----------
-- security definer para as policies de profiles não recursarem
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$fn$;

create or replace function public.is_paid()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.access_level = 'paid' or p.role = 'admin')
  );
$fn$;

-- ---------- courses ----------
create table if not exists public.courses (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  slug                  text not null unique,
  short_description     text,
  description           text,
  area                  text not null default 'Gestão',
  access_type           course_access not null default 'paid',
  status                course_status not null default 'draft',
  thumbnail_url         text,
  instructor_name       text,
  instructor_avatar_url text,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  published_at          timestamptz
);

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

create index if not exists courses_status_idx on public.courses(status);
create index if not exists courses_area_idx on public.courses(area);

-- ---------- course_modules ----------
create table if not exists public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists course_modules_updated_at on public.course_modules;
create trigger course_modules_updated_at
  before update on public.course_modules
  for each row execute function public.set_updated_at();

create index if not exists course_modules_course_idx on public.course_modules(course_id, sort_order);

-- ---------- lessons ----------
create table if not exists public.lessons (
  id                  uuid primary key default gen_random_uuid(),
  module_id           uuid not null references public.course_modules(id) on delete cascade,
  title               text not null,
  summary             text,
  body_markdown       text,
  sort_order          integer not null default 0,
  access_type         lesson_access not null default 'inherit',
  status              lesson_status not null default 'draft',
  duration_seconds    integer,

  mux_upload_id       text,
  mux_asset_id        text,
  mux_playback_id     text,
  video_status        video_status not null default 'empty',

  application_title   text,
  application_minutes integer,
  application_steps   jsonb not null default '[]'::jsonb,
  application_note    text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz
);

drop trigger if exists lessons_updated_at on public.lessons;
create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

create index if not exists lessons_module_idx on public.lessons(module_id, sort_order);
create index if not exists lessons_upload_idx on public.lessons(mux_upload_id);
create index if not exists lessons_asset_idx on public.lessons(mux_asset_id);

-- ---------- lesson_materials ----------
create table if not exists public.lesson_materials (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  title        text not null,
  description  text,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  file_size    bigint,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists lesson_materials_lesson_idx on public.lesson_materials(lesson_id, sort_order);

-- ---------- lesson_progress ----------
create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  watched_seconds integer not null default 0,
  completed_at    timestamptz,
  applied_at      timestamptz,
  updated_at      timestamptz not null default now(),
  unique (user_id, lesson_id)
);

drop trigger if exists lesson_progress_updated_at on public.lesson_progress;
create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.set_updated_at();

create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id, updated_at desc);

-- ---------- events ----------
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  starts_at       timestamptz not null,
  format          text,
  instructor_name text,
  access_type     course_access not null default 'free',
  external_url    text,
  recording_url   text,
  thumbnail_url   text,
  status          event_status not null default 'draft',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create index if not exists events_starts_idx on public.events(starts_at);
