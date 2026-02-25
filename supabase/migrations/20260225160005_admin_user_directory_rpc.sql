-- Admin-only user directory RPC for dashboard author display

create or replace function public.get_admin_user_directory()
returns table (
  user_id uuid,
  email text,
  username text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(p.username, '') as username
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_admin(auth.uid());
$$;

grant execute on function public.get_admin_user_directory() to authenticated;
