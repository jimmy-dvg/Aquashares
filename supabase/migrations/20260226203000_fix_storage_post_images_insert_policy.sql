drop policy if exists "storage_post_images_insert_owner_only" on storage.objects;

create policy "storage_post_images_insert_authenticated_user_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);