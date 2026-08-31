-- =====================================================================
-- Endurecimento após o linter de segurança do Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) search_path fixo em set_updated_at
--    Sem isso a função resolve nomes pelo search_path de quem chama.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------
-- 2) Views de estrutura: só leitura, e só para quem está logado.
--    O schema public do Supabase concede tudo por padrão; as views
--    herdaram INSERT/UPDATE/DELETE que não fazem sentido nenhum.
-- ---------------------------------------------------------------------
revoke all on public.lesson_outline   from anon, authenticated;
revoke all on public.material_outline from anon, authenticated;

grant select on public.lesson_outline   to authenticated;
grant select on public.material_outline to authenticated;

-- NOTA sobre o aviso "security_definer_view" do linter:
-- é intencional. Estas views existem justamente para mostrar a ESTRUTURA
-- de uma aula bloqueada (título, duração, nome do material) sem passar
-- pela RLS de lessons, que esconde a linha inteira. Elas filtram sozinhas
-- para conteúdo publicado e não expõem body_markdown, a aplicação prática
-- nem o storage_path. Trocar para security_invoker faria a trilha paga
-- sumir da vitrine, que é o oposto do produto.

-- ---------------------------------------------------------------------
-- 3) Funções expostas como RPC em /rest/v1/rpc/...
--
--    O Postgres concede EXECUTE ao papel PUBLIC por padrão, e anon e
--    authenticated herdam dele. Por isso revogar "from anon" não resolve:
--    tem que revogar de PUBLIC.
--
--    Nenhuma destas funções é chamada pelo frontend.
-- ---------------------------------------------------------------------

-- Primeiro tira todo mundo, inclusive o grant implícito de PUBLIC.
revoke execute on function public.is_admin()                    from public, anon, authenticated;
revoke execute on function public.is_paid()                     from public, anon, authenticated;
revoke execute on function public.can_access_lesson(uuid)       from public, anon, authenticated;
revoke execute on function public.course_is_visible(uuid)       from public, anon, authenticated;
revoke execute on function public.lesson_effective_access(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.sync_user_email()             from public, anon, authenticated;
revoke execute on function public.guard_profile_privileges()    from public, anon, authenticated;
revoke execute on function public.set_updated_at()              from public, anon, authenticated;

-- E devolve SÓ o necessário.
--
-- IMPORTANTE — verificado na prática, não presumido: a expressão de uma
-- policy de RLS roda com o privilégio de QUEM CONSULTA. Sem estes quatro
-- grants o app inteiro morre com:
--     42501 permission denied for function is_admin
-- Testei revogando: o catálogo para de carregar. Não remova.
--
-- Elas continuam listadas pelo linter do Supabase como
-- "authenticated_security_definer_function_executable". É esperado:
-- as quatro só respondem sobre o próprio chamador (o usuário é admin? é
-- pago? pode ver esta aula?) e não devolvem dado de mais ninguém.
grant execute on function public.is_admin()              to authenticated;
grant execute on function public.is_paid()               to authenticated;
grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.course_is_visible(uuid) to authenticated;
