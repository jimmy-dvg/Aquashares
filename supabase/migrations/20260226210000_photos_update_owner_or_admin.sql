drop policy if exists "photos_update_owner_or_admin" on public.photos;

create policy "photos_update_owner_or_admin"
on public.photos
for update
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);