-- =====================================================================
-- Produto novo trazido pelo design do Figma: trilhas, competências,
-- jornada, labs, cases, quiz, anotações, favoritos e certificados.
-- O RLS correspondente está em 20250101000800.
-- =====================================================================

alter table public.profiles add column if not exists level text;

do $k$ begin create type content_kind as enum ('curso','trilha'); exception when duplicate_object then null; end $k$;
do $k$ begin create type content_level as enum ('Iniciante','Intermediário','Avançado'); exception when duplicate_object then null; end $k$;
do $k$ begin create type lab_status as enum ('draft','published'); exception when duplicate_object then null; end $k$;

-- Cursos ganham tipo (curso ou trilha), nível, certificado e aprendizados.
alter table public.courses add column if not exists kind content_kind not null default 'curso';
alter table public.courses add column if not exists level content_level;
alter table public.courses add column if not exists level_max content_level;
alter table public.courses add column if not exists has_certificate boolean not null default false;
alter table public.courses add column if not exists outcomes jsonb not null default '[]'::jsonb;
alter table public.courses add column if not exists hero_image_url text;

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_skills (
  course_id uuid not null references public.courses(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (course_id, skill_id)
);

create table if not exists public.lesson_skills (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (lesson_id, skill_id)
);

-- Progresso por competência, 0..100. Recalculado pelo app a partir das
-- aulas concluídas e dos labs aplicados.
create table if not exists public.user_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  area text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  title text not null,
  course_id uuid references public.courses(id) on delete set null,
  sort_order integer not null default 0
);

-- Kalidash Labs e Cases moram na mesma tabela; is_case separa os dois.
create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  body_markdown text,
  minutes integer,
  level content_level,
  image_url text,
  is_case boolean not null default false,
  featured boolean not null default false,
  lesson_id uuid references public.lessons(id) on delete set null,
  status lab_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_skills (
  lab_id uuid not null references public.labs(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  primary key (lab_id, skill_id)
);

create table if not exists public.lab_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  content text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lab_id)
);

alter table public.lessons add column if not exists transcript text;

create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  explanation text,
  sort_order integer not null default 0
);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  code text not null unique default encode(gen_random_bytes(8), 'hex'),
  unique (user_id, course_id)
);

create index if not exists labs_status_idx   on public.labs(status, sort_order);
create index if not exists lab_sub_user_idx  on public.lab_submissions(user_id, updated_at desc);
create index if not exists quiz_lesson_idx   on public.lesson_quizzes(lesson_id, sort_order);
create index if not exists journey_steps_idx on public.journey_steps(journey_id, sort_order);
