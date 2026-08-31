-- =====================================================================
-- Kalidash Academy — Storage
--   academy-public    : thumbnails, avatares, imagens editoriais (leitura pública)
--   academy-materials : PDFs, planilhas e materiais de aula (privado)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('academy-public', 'academy-public', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('academy-materials', 'academy-materials', false)
on conflict (id) do update set public = false;

-- ---------------------------------------------------------------------
-- academy-public: qualquer um lê, só admin escreve
-- ---------------------------------------------------------------------
drop policy if exists academy_public_read   on storage.objects;
drop policy if exists academy_public_write  on storage.objects;
drop policy if exists academy_public_update on storage.objects;
drop policy if exists academy_public_delete on storage.objects;

create policy academy_public_read on storage.objects
  for select
  using (bucket_id = 'academy-public');

create policy academy_public_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'academy-public' and public.is_admin());

create policy academy_public_update on storage.objects
  for update to authenticated
  using (bucket_id = 'academy-public' and public.is_admin())
  with check (bucket_id = 'academy-public' and public.is_admin());

create policy academy_public_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'academy-public' and public.is_admin());

-- ---------------------------------------------------------------------
-- academy-materials: PRIVADO.
-- Nem listar nem ler direto. Aluno só recebe signed URL da Edge Function
-- get-material-download, que valida o acesso à aula.
-- ---------------------------------------------------------------------
drop policy if exists academy_materials_admin_all on storage.objects;

create policy academy_materials_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'academy-materials' and public.is_admin())
  with check (bucket_id = 'academy-materials' and public.is_admin());
