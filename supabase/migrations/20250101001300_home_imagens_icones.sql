-- =====================================================================
-- Tela de Início: imagem por aula e ícones das competências.
--
-- O cartão "Aprenda em poucos minutos" mostra três aulas lado a lado,
-- cada uma com a sua imagem. Só existia `courses.thumbnail_url`, então
-- três aulas do mesmo curso apareceriam com a mesma arte. A coluna nova
-- é opcional: sem ela, a aula cai no thumbnail do curso.
-- =====================================================================

alter table public.lessons add column if not exists thumbnail_url text;

-- Os ícones das competências vieram de outro conjunto e não batiam com o
-- desenho (alvo, rede e escudo). Trocados pelos traços certos.
update public.skills
   set icon = 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13.2a1.2 1.2 0 100-2.4 1.2 1.2 0 000 2.4'
 where slug = 'opportunity-mapping';

update public.skills
   set icon = 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5'
 where slug = 'agent-design';

update public.skills
   set icon = 'M12 3l8 3v6c0 4.6-3.3 7.9-8 9-4.7-1.1-8-4.4-8-9V6z'
 where slug = 'governanca';

update public.skills
   set icon = 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM8 9h8M8 13h5'
 where slug = 'ai-literacy';

-- A view é o que o catálogo lê; sem recriá-la a coluna nova não chega na
-- tela. Mesmo corpo de 000100, com `thumbnail_url` a mais.
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
