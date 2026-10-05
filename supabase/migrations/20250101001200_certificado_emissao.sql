-- =====================================================================
-- Emissão de certificado.
--
-- A política de 000800 deu `for all` em `certificates` para o dono da
-- linha. Isso serve para anotação e favorito, mas não para certificado:
-- qualquer pessoa autenticada poderia inserir a própria linha e exibir
-- um certificado de um curso que nunca abriu, inclusive com o código
-- que ela mesma escolhesse. Um certificado que o portador consegue
-- emitir sozinho não certifica nada.
--
-- Aqui o usuário fica só com leitura da própria linha, e a emissão passa
-- por uma função que confere a conclusão no servidor.
-- =====================================================================

drop policy if exists certificates_own on public.certificates;

create policy certificates_read_own on public.certificates
  for select to authenticated
  using (user_id = auth.uid());

-- Sem política de insert/update/delete para `authenticated`: ninguém
-- escreve direto na tabela. Só a função abaixo, que é security definer.

create or replace function public.issue_certificate(p_course_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_user uuid := auth.uid();
  v_total int;
  v_feitas int;
  v_tem_certificado boolean;
  v_row public.certificates;
begin
  if v_user is null then
    raise exception 'sem sessão';
  end if;

  select c.has_certificate into v_tem_certificado
  from public.courses c
  where c.id = p_course_id and c.status = 'published';

  if v_tem_certificado is null then
    raise exception 'curso não encontrado';
  end if;
  if not v_tem_certificado then
    raise exception 'este curso não emite certificado';
  end if;

  -- Já emitido: devolve o mesmo, para a tela poder chamar sem medo.
  select * into v_row
  from public.certificates
  where user_id = v_user and course_id = p_course_id;
  if found then
    return v_row;
  end if;

  select count(*) into v_total
  from public.lesson_outline lo
  where lo.course_id = p_course_id;

  select count(*) into v_feitas
  from public.lesson_outline lo
  join public.lesson_progress lp
    on lp.lesson_id = lo.id
   and lp.user_id = v_user
   and lp.completed_at is not null
  where lo.course_id = p_course_id;

  if v_total = 0 or v_feitas < v_total then
    raise exception 'curso ainda não concluído (% de %)', v_feitas, v_total;
  end if;

  insert into public.certificates (user_id, course_id, code)
  values (v_user, p_course_id, upper(encode(gen_random_bytes(6), 'hex')))
  returning * into v_row;

  return v_row;
end $fn$;

revoke all on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid) to authenticated;
