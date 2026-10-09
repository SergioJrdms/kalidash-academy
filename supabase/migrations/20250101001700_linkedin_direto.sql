-- =====================================================================
-- Networking: LinkedIn direto, sem pedido de conexão.
--
-- O fluxo de "Conectar / aceitar" não se sustentava: a pessoa pedia, e
-- do outro lado ninguém era avisado nem respondia. O cartão passa a
-- levar direto ao LinkedIn de quem está no diretório.
--
-- Isso muda o que a view expõe. Antes o `linkedin_url` só saía depois do
-- aceite dos dois lados; agora sai para todo mundo que está no
-- diretório. O consentimento continua existindo, só que num ponto só e
-- mais claro: quem entra no diretório e preenche o LinkedIn sabe que ele
-- fica visível — é essa a função do campo.
--
-- A tabela `connections` fica onde está, sem uso pelo app. Apagá-la é
-- irreversível e ninguém ganha nada com a pressa.
-- =====================================================================

drop view if exists public.community_directory;

create view public.community_directory
with (security_invoker = false) as
  select
    p.id,
    p.full_name,
    p.headline,
    p.company,
    p.area,
    p.interest,
    p.avatar_url,
    p.linkedin_url
  from public.profiles p
  where p.community_opt_in;

grant select on public.community_directory to authenticated;
