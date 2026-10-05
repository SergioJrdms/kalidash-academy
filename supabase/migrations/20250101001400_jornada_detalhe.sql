-- =====================================================================
-- Minha Jornada: o que a tela mostra e o banco ainda não guardava.
--
-- O desenho traz, por etapa, uma frase do que ela entrega, e por
-- atividade o tipo (Vídeo, Leitura, Aula, Ferramenta). Nada disso
-- existia: a etapa só tinha título e a aula só sabia dizer se tem vídeo.
-- =====================================================================

alter table public.journey_steps add column if not exists description text;

-- Ritmo sugerido da trilha, em semanas. Fica nulo por padrão: quando não
-- houver um número editorial, a tela calcula um a partir do conteúdo que
-- falta, em vez de inventar.
alter table public.journeys add column if not exists suggested_weeks integer;

-- Tipo da atividade. O rótulo sai daqui; `has_video` continua dizendo se
-- existe vídeo para tocar, que é outra coisa.
do $k$
begin
  if not exists (select 1 from pg_type where typname = 'activity_kind') then
    create type public.activity_kind as enum ('video', 'leitura', 'aula', 'ferramenta');
  end if;
end $k$;

alter table public.lessons
  add column if not exists activity_kind public.activity_kind;

-- Preenche o que já existe: com vídeo vira "aula", sem vídeo vira
-- "leitura". É o mesmo que a tela mostrava antes, agora explícito e
-- editável.
update public.lessons
   set activity_kind = case when video_status <> 'empty' then 'aula'::public.activity_kind
                            else 'leitura'::public.activity_kind end
 where activity_kind is null;

-- A etapa herda a descrição do curso que ela aponta, para a tela não
-- nascer vazia. Quem cuidar do conteúdo reescreve depois.
update public.journey_steps s
   set description = c.short_description
  from public.courses c
 where c.id = s.course_id
   and s.description is null
   and c.short_description is not null;

-- A view é o que o catálogo lê; precisa carregar o tipo novo.
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
    l.thumbnail_url,
    l.activity_kind,
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

revoke all on public.lesson_outline from anon, authenticated;
grant select on public.lesson_outline to authenticated;
