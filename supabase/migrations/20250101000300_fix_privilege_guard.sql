-- =====================================================================
-- Correção: o guard de privilégios estava bloqueando o servidor também.
--
-- guard_profile_privileges() decidia só por is_admin(). Como is_admin()
-- depende de auth.uid(), ele é FALSO em qualquer contexto sem usuário
-- autenticado: SQL direto, SQL Editor do dashboard e service_role.
--
-- Resultado: `update profiles set role='admin'` era revertido em silêncio.
-- Isso quebrava a criação do primeiro admin e quebraria o futuro webhook
-- de pagamento (que roda com service_role e precisa gravar access_level).
--
-- A trava existe para impedir que um ALUNO se promova. Aluno sempre tem
-- auth.uid() preenchido, então continuar travando esse caso basta.
-- =====================================================================

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Sem usuário autenticado = chamada de servidor (service_role, SQL direto,
  -- dashboard). Contexto confiável: deixa passar.
  -- O papel anon nunca chega aqui: não existe policy de UPDATE para ele.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin autenticado pode alterar role e acesso de qualquer perfil.
  if public.is_admin() then
    return new;
  end if;

  -- Aluno autenticado: preserva os campos privilegiados, aconteça o que
  -- acontecer no payload que veio do browser.
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
