-- Ensure admins can update and delete any post

drop policy if exists "posts_update_owner_only" on public.posts;
drop policy if exists "posts_update_owner_or_admin" on public.posts;
drop policy if exists "posts_delete_owner_or_admin" on public.posts;

create policy "posts_update_owner_or_admin"
on public.posts
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

create policy "posts_delete_owner_or_admin"
on public.posts
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
);
