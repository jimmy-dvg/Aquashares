-- Seed Users
-- Replace these placeholder UUIDs with real auth.users IDs from your Supabase project.
-- DEMO_USER_ID  = 11111111-1111-1111-1111-111111111111
-- ADMIN_USER_ID = 22222222-2222-2222-2222-222222222222

-- Seed Profiles
insert into public.profiles (id, username, display_name, avatar_url, bio, created_at, updated_at)
select
  u.id,
  'demo_aquarist',
  'Demo Aquarist',
  '/assets/avatars/demo-user.jpg',
  'Freshwater aquarist focused on planted tanks.',
  timezone('utc', now()) - interval '7 days',
  timezone('utc', now()) - interval '7 days'
from auth.users u
where u.id = '11111111-1111-1111-1111-111111111111'::uuid
on conflict (id) do nothing;

insert into public.profiles (id, username, display_name, avatar_url, bio, created_at, updated_at)
select
  u.id,
  'admin_aquashares',
  'Aquashares Admin',
  '/assets/avatars/admin-user.jpg',
  'Platform administrator and community moderator.',
  timezone('utc', now()) - interval '10 days',
  timezone('utc', now()) - interval '10 days'
from auth.users u
where u.id = '22222222-2222-2222-2222-222222222222'::uuid
on conflict (id) do nothing;

-- Seed Roles
insert into public.user_roles (user_id, role, created_at, updated_at)
select
  u.id,
  'user',
  timezone('utc', now()) - interval '7 days',
  timezone('utc', now()) - interval '7 days'
from auth.users u
where u.id = '11111111-1111-1111-1111-111111111111'::uuid
on conflict (user_id) do update
set role = excluded.role,
    updated_at = timezone('utc', now());

insert into public.user_roles (user_id, role, created_at, updated_at)
select
  u.id,
  'admin',
  timezone('utc', now()) - interval '10 days',
  timezone('utc', now()) - interval '10 days'
from auth.users u
where u.id = '22222222-2222-2222-2222-222222222222'::uuid
on conflict (user_id) do update
set role = excluded.role,
    updated_at = timezone('utc', now());

-- Seed Posts
insert into public.posts (id, user_id, title, body, created_at, updated_at)
select
  v.id,
  v.user_id,
  v.title,
  v.body,
  v.created_at,
  v.updated_at
from (
  values
    (
      'a1a11111-1111-4111-8111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Plants: Low-Tech Anubias Setup',
      'Sharing my low-tech Anubias nana layout with driftwood and shaded flow zones.',
      timezone('utc', now()) - interval '6 days',
      timezone('utc', now()) - interval '6 days'
    ),
    (
      'a2a22222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Plants: Java Fern Growth Tips',
      'How I attach Java fern to stone and avoid rhizome rot in medium-flow tanks.',
      timezone('utc', now()) - interval '5 days',
      timezone('utc', now()) - interval '5 days'
    ),
    (
      'b1b33333-3333-4333-8333-333333333333'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Fish: Ember Tetra School Behavior',
      'Observations after adding 18 ember tetras to a planted 80L community tank.',
      timezone('utc', now()) - interval '4 days',
      timezone('utc', now()) - interval '4 days'
    ),
    (
      'b2b44444-4444-4444-8444-444444444444'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Fish: Apistogramma Pairing Notes',
      'Water parameters and cave placement that helped stabilize pair behavior.',
      timezone('utc', now()) - interval '3 days',
      timezone('utc', now()) - interval '3 days'
    ),
    (
      'c1c55555-5555-4555-8555-555555555555'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Equipment: Canister Filter Maintenance Routine',
      'Monthly workflow for cleaning media without crashing beneficial bacteria.',
      timezone('utc', now()) - interval '2 days',
      timezone('utc', now()) - interval '2 days'
    )
) as v(id, user_id, title, body, created_at, updated_at)
join auth.users u on u.id = v.user_id
on conflict (id) do nothing;

-- Seed Comments
insert into public.comments (id, post_id, user_id, body, created_at, updated_at)
select
  v.id,
  v.post_id,
  v.user_id,
  v.body,
  v.created_at,
  v.updated_at
from (
  values
    (
      'd1d11111-1111-4111-8111-111111111111'::uuid,
      'a1a11111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Great structure and plant placement. Please share your light schedule too.',
      timezone('utc', now()) - interval '6 days' + interval '2 hours',
      timezone('utc', now()) - interval '6 days' + interval '2 hours'
    ),
    (
      'd2d22222-2222-4222-8222-222222222222'::uuid,
      'a1a11111-1111-4111-8111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Thanks! Running 7 hours at 60% intensity.',
      timezone('utc', now()) - interval '6 days' + interval '4 hours',
      timezone('utc', now()) - interval '6 days' + interval '4 hours'
    ),
    (
      'd3d33333-3333-4333-8333-333333333333'::uuid,
      'a2a22222-2222-4222-8222-222222222222'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Solid advice. Consider pinning this as a beginner reference.',
      timezone('utc', now()) - interval '5 days' + interval '1 hour',
      timezone('utc', now()) - interval '5 days' + interval '1 hour'
    ),
    (
      'd4d44444-4444-4444-8444-444444444444'::uuid,
      'b1b33333-3333-4333-8333-333333333333'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'They colored up after week two once tannins settled.',
      timezone('utc', now()) - interval '4 days' + interval '3 hours',
      timezone('utc', now()) - interval '4 days' + interval '3 hours'
    ),
    (
      'd5d55555-5555-4555-8555-555555555555'::uuid,
      'b1b33333-3333-4333-8333-333333333333'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Nice update. Please keep posting monthly progression photos.',
      timezone('utc', now()) - interval '4 days' + interval '6 hours',
      timezone('utc', now()) - interval '4 days' + interval '6 hours'
    ),
    (
      'd6d66666-6666-4666-8666-666666666666'::uuid,
      'b2b44444-4444-4444-8444-444444444444'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      'Coconut caves helped reduce aggression significantly.',
      timezone('utc', now()) - interval '3 days' + interval '2 hours',
      timezone('utc', now()) - interval '3 days' + interval '2 hours'
    ),
    (
      'd7d77777-7777-4777-8777-777777777777'::uuid,
      'c1c55555-5555-4555-8555-555555555555'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'Excellent maintenance guide. This is exactly what new users need.',
      timezone('utc', now()) - interval '2 days' + interval '4 hours',
      timezone('utc', now()) - interval '2 days' + interval '4 hours'
    )
) as v(id, post_id, user_id, body, created_at, updated_at)
join auth.users u on u.id = v.user_id
join public.posts p on p.id = v.post_id
on conflict (id) do nothing;

-- Seed Photos (downloaded locally, not links from internet)
insert into public.photos (id, post_id, user_id, storage_path, public_url, caption, created_at, updated_at)
select
  v.id,
  v.post_id,
  v.user_id,
  v.storage_path,
  v.public_url,
  v.caption,
  v.created_at,
  v.updated_at
from (
  values
    (
      'e1e11111-1111-4111-8111-111111111111'::uuid,
      'a1a11111-1111-4111-8111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111/a1a11111-1111-4111-8111-111111111111/anubias-layout-01.jpg',
      '/storage/v1/object/public/post-images/11111111-1111-1111-1111-111111111111/a1a11111-1111-4111-8111-111111111111/anubias-layout-01.jpg',
      'Anubias nana tied to driftwood (day 14).',
      timezone('utc', now()) - interval '6 days',
      timezone('utc', now()) - interval '6 days'
    ),
    (
      'e2e22222-2222-4222-8222-222222222222'::uuid,
      'a2a22222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111/a2a22222-2222-4222-8222-222222222222/java-fern-rhizome.jpg',
      '/storage/v1/object/public/post-images/11111111-1111-1111-1111-111111111111/a2a22222-2222-4222-8222-222222222222/java-fern-rhizome.jpg',
      'Java fern rhizome placement on lava rock.',
      timezone('utc', now()) - interval '5 days',
      timezone('utc', now()) - interval '5 days'
    ),
    (
      'e3e33333-3333-4333-8333-333333333333'::uuid,
      'b1b33333-3333-4333-8333-333333333333'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111/b1b33333-3333-4333-8333-333333333333/ember-school-01.jpg',
      '/storage/v1/object/public/post-images/11111111-1111-1111-1111-111111111111/b1b33333-3333-4333-8333-333333333333/ember-school-01.jpg',
      'Ember tetra school during feeding.',
      timezone('utc', now()) - interval '4 days',
      timezone('utc', now()) - interval '4 days'
    ),
    (
      'e4e44444-4444-4444-8444-444444444444'::uuid,
      'c1c55555-5555-4555-8555-555555555555'::uuid,
      '11111111-1111-1111-1111-111111111111'::uuid,
      '11111111-1111-1111-1111-111111111111/c1c55555-5555-4555-8555-555555555555/canister-maintenance-steps.jpg',
      '/storage/v1/object/public/post-images/11111111-1111-1111-1111-111111111111/c1c55555-5555-4555-8555-555555555555/canister-maintenance-steps.jpg',
      'Canister filter maintenance step-by-step.',
      timezone('utc', now()) - interval '2 days',
      timezone('utc', now()) - interval '2 days'
    )
) as v(id, post_id, user_id, storage_path, public_url, caption, created_at, updated_at)
join auth.users u on u.id = v.user_id
join public.posts p on p.id = v.post_id
on conflict (id) do nothing;