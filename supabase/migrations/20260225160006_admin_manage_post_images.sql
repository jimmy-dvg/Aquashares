drop policy if exists "photos_delete_owner_only" on public.photos;
create policy "photos_delete_owner_or_admin"
on public.photos
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);

drop policy if exists "storage_post_images_delete_owner_only" on storage.objects;
create policy "storage_post_images_delete_owner_or_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-images'
  and (
    (
      owner = auth.uid()
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    or public.is_admin(auth.uid())
  )
);
