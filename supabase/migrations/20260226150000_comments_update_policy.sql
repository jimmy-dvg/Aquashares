drop policy if exists "comments_update_owner_only" on public.comments;
create policy "comments_update_owner_only"
on public.comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
