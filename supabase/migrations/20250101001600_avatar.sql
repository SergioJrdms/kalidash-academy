-- =====================================================================
-- Foto de perfil.
--
-- O bucket academy-public já existe e é de leitura aberta, mas só admin
-- escrevia nele. Para a pessoa trocar a própria foto, abrimos a escrita
-- apenas dentro de `avatars/<id dela>/` — o caminho carrega a dona, e a
-- política confere isso em cada operação.
-- =====================================================================

alter table public.profiles add column if not exists avatar_url text;

drop policy if exists avatar_proprio_write  on storage.objects;
drop policy if exists avatar_proprio_update on storage.objects;
drop policy if exists avatar_proprio_delete on storage.objects;

create policy avatar_proprio_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'academy-public'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy avatar_proprio_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'academy-public'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'academy-public'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy avatar_proprio_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'academy-public'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
