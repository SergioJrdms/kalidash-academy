-- As tabelas do produto novo (migração 000700) nasceram com `updated_at
-- default now()`, mas sem gatilho. Sem ele a coluna congela no momento da
-- criação: a aba "Minhas anotações" ordena por data e mostraria a ordem
-- errada, e o Admin não saberia quando a pessoa aplicou um Lab.

create trigger user_skills_updated_at
  before update on public.user_skills
  for each row execute function public.set_updated_at();

create trigger lab_submissions_updated_at
  before update on public.lab_submissions
  for each row execute function public.set_updated_at();

create trigger lesson_notes_updated_at
  before update on public.lesson_notes
  for each row execute function public.set_updated_at();
