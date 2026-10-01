-- =====================================================================
-- RLS das tabelas do produto novo. Mesma régua do resto do projeto:
--   catálogo   -> autenticado lê, só admin escreve
--   do usuário -> cada um só enxerga e escreve o próprio
-- =====================================================================

alter table public.skills          enable row level security;
alter table public.course_skills   enable row level security;
alter table public.lesson_skills   enable row level security;
alter table public.user_skills     enable row level security;
alter table public.journeys        enable row level security;
alter table public.journey_steps   enable row level security;
alter table public.labs            enable row level security;
alter table public.lab_skills      enable row level security;
alter table public.lab_submissions enable row level security;
alter table public.lesson_quizzes  enable row level security;
alter table public.lesson_notes    enable row level security;
alter table public.bookmarks       enable row level security;
alter table public.certificates    enable row level security;

-- Catálogo puro: não há nada sensível em saber que uma competência ou
-- uma etapa de jornada existe.
do $k$
declare t text;
begin
  foreach t in array array['skills','course_skills','lesson_skills','journeys','journey_steps','lab_skills']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('drop policy if exists %I_admin on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_admin on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $k$;

drop policy if exists labs_read  on public.labs;
drop policy if exists labs_admin on public.labs;

create policy labs_read on public.labs
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy labs_admin on public.labs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- O quiz é conteúdo da aula: só sai para quem pode consumi-la. Sem isso,
-- um usuário gratuito leria as perguntas (e as respostas) de aula paga.
drop policy if exists quiz_read  on public.lesson_quizzes;
drop policy if exists quiz_admin on public.lesson_quizzes;

create policy quiz_read on public.lesson_quizzes
  for select to authenticated
  using (public.can_access_lesson(lesson_id));

create policy quiz_admin on public.lesson_quizzes
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Dados pessoais: anotação, progresso de competência, favorito,
-- submissão de lab e certificado. Cada um só mexe no seu.
do $k$
declare t text;
begin
  foreach t in array array['user_skills','lab_submissions','lesson_notes','bookmarks','certificates']
  loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format('create policy %I_own on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t, t);
    execute format('create policy %I_admin_read on public.%I for select to authenticated using (public.is_admin())', t, t);
  end loop;
end $k$;
