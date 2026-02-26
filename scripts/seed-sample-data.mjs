import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  const content = readFileSync(envPath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildSampleData(demoUserId, adminUserId) {
  const now = new Date();

  const posts = [
    {
      id: 'a1a11111-1111-4111-8111-111111111111',
      user_id: demoUserId,
      title: 'Plants: Low-Tech Anubias Setup',
      body: 'Sharing my low-tech Anubias nana layout with driftwood and shaded flow zones.',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'a2a22222-2222-4222-8222-222222222222',
      user_id: demoUserId,
      title: 'Plants: Java Fern Growth Tips',
      body: 'How I attach Java fern to stone and avoid rhizome rot in medium-flow tanks.',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b1b33333-3333-4333-8333-333333333333',
      user_id: demoUserId,
      title: 'Fish: Ember Tetra School Behavior',
      body: 'Observations after adding 18 ember tetras to a planted 80L community tank.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b2b44444-4444-4444-8444-444444444444',
      user_id: demoUserId,
      title: 'Fish: Apistogramma Pairing Notes',
      body: 'Water parameters and cave placement that helped stabilize pair behavior.',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'c1c55555-5555-4555-8555-555555555555',
      user_id: demoUserId,
      title: 'Equipment: Canister Filter Maintenance Routine',
      body: 'Monthly workflow for cleaning media without crashing beneficial bacteria.',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'f1f66666-6666-4666-8666-666666666666',
      user_id: demoUserId,
      title: 'Inhabitants: Nerite Snails Cleanup Crew',
      body: 'I added 6 nerite snails to control soft algae and documented how they impacted glass and hardscape over 10 days.',
      created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'f2f77777-7777-4777-8777-777777777777',
      user_id: demoUserId,
      title: 'Inhabitants: Amano Shrimp Acclimation Checklist',
      body: 'Step-by-step drip acclimation routine for Amano shrimp, including TDS checks and first feeding timing.',
      created_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString()
    }
  ].map((post) => ({ ...post, updated_at: post.created_at }));

  const demoComments = [
    {
      id: 'd2d22222-2222-4222-8222-222222222222',
      post_id: posts[0].id,
      user_id: demoUserId,
      body: 'Thanks! Running 7 hours at 60% intensity.',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd4d44444-4444-4444-8444-444444444444',
      post_id: posts[2].id,
      user_id: demoUserId,
      body: 'They colored up after week two once tannins settled.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd6d66666-6666-4666-8666-666666666666',
      post_id: posts[3].id,
      user_id: demoUserId,
      body: 'Coconut caves helped reduce aggression significantly.',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd8d88888-8888-4888-8888-888888888888',
      post_id: posts[5].id,
      user_id: demoUserId,
      body: 'They started cleaning diatoms from the front glass within the first 24 hours.',
      created_at: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString()
    }
  ].map((comment) => ({ ...comment, updated_at: comment.created_at }));

  const adminComments = [
    {
      id: 'd1d11111-1111-4111-8111-111111111111',
      post_id: posts[0].id,
      user_id: adminUserId,
      body: 'Great structure and plant placement. Please share your light schedule too.',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd3d33333-3333-4333-8333-333333333333',
      post_id: posts[1].id,
      user_id: adminUserId,
      body: 'Solid advice. Consider pinning this as a beginner reference.',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd5d55555-5555-4555-8555-555555555555',
      post_id: posts[2].id,
      user_id: adminUserId,
      body: 'Nice update. Please keep posting monthly progression photos.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd7d77777-7777-4777-8777-777777777777',
      post_id: posts[4].id,
      user_id: adminUserId,
      body: 'Excellent maintenance guide. This is exactly what new users need.',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'd9d99999-9999-4999-8999-999999999999',
      post_id: posts[6].id,
      user_id: adminUserId,
      body: 'Great checklist. This is a helpful reference for beginners adding shrimp colonies.',
      created_at: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString()
    }
  ].map((comment) => ({ ...comment, updated_at: comment.created_at }));

  const photos = [
    {
      id: 'e1e11111-1111-4111-8111-111111111111',
      post_id: posts[0].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[0].id}/anubias-layout-01.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[0].id}/anubias-layout-01.jpg`,
      caption: 'Anubias nana tied to driftwood (day 14).',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e2e22222-2222-4222-8222-222222222222',
      post_id: posts[1].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[1].id}/java-fern-rhizome.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[1].id}/java-fern-rhizome.jpg`,
      caption: 'Java fern rhizome placement on lava rock.',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e3e33333-3333-4333-8333-333333333333',
      post_id: posts[2].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[2].id}/ember-school-01.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[2].id}/ember-school-01.jpg`,
      caption: 'Ember tetra school during feeding.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e4e44444-4444-4444-8444-444444444444',
      post_id: posts[4].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[4].id}/canister-maintenance-steps.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[4].id}/canister-maintenance-steps.jpg`,
      caption: 'Canister filter maintenance step-by-step.',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e5e55555-5555-4555-8555-555555555555',
      post_id: posts[5].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[5].id}/nerite-snails-crew.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[5].id}/nerite-snails-crew.jpg`,
      caption: 'Nerite snails grazing on driftwood and front glass.',
      created_at: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e6e66666-6666-4666-8666-666666666666',
      post_id: posts[6].id,
      user_id: demoUserId,
      storage_path: `${demoUserId}/${posts[6].id}/amano-acclimation.jpg`,
      public_url: `/storage/v1/object/public/post-images/${demoUserId}/${posts[6].id}/amano-acclimation.jpg`,
      caption: 'Amano shrimp drip acclimation setup before release.',
      created_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString()
    }
  ].map((photo) => ({ ...photo, updated_at: photo.created_at }));

  return { posts, demoComments, adminComments, photos };
}

async function upsertIgnoreDuplicates(client, table, rows, onConflict = 'id') {
  const { error } = await client
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates: true });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function ensureUser(client, email, password, label) {
  const signInAttempt = await client.auth.signInWithPassword({ email, password });

  if (!signInAttempt.error && signInAttempt.data.user) {
    return signInAttempt.data.user;
  }

  const signUpAttempt = await client.auth.signUp({ email, password });

  if (signUpAttempt.error) {
    throw new Error(`${label} sign-up failed: ${signUpAttempt.error.message}`);
  }

  if (!signUpAttempt.data.user) {
    throw new Error(`${label} sign-up failed: user not returned by API.`);
  }

  if (signUpAttempt.data.session?.user) {
    return signUpAttempt.data.session.user;
  }

  const signInAfterSignUp = await client.auth.signInWithPassword({ email, password });
  if (signInAfterSignUp.error || !signInAfterSignUp.data.user) {
    throw new Error(
      `${label} sign-in failed after sign-up. Confirm email for ${email} or disable email confirmation in Auth settings.`
    );
  }

  return signInAfterSignUp.data.user;
}

async function main() {
  loadEnvFile();

  const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
  const supabaseKey = requireEnv('VITE_SUPABASE_ANON_KEY');
  const demoEmail = requireEnv('SEED_DEMO_EMAIL');
  const demoPassword = requireEnv('SEED_DEMO_PASSWORD');
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  const demoClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const demoUser = await ensureUser(demoClient, demoEmail, demoPassword, 'Demo user');
  const adminUser = await ensureUser(adminClient, adminEmail, adminPassword, 'Admin user');

  const demoUserId = demoUser.id;
  const adminUserId = adminUser.id;

  await upsertIgnoreDuplicates(demoClient, 'profiles', [
    {
      id: demoUserId,
      username: 'demo_aquarist',
      display_name: 'Demo Aquarist',
      avatar_url: '/assets/avatars/demo-user.jpg',
      bio: 'Freshwater aquarist focused on planted tanks.'
    }
  ]);

  await upsertIgnoreDuplicates(adminClient, 'profiles', [
    {
      id: adminUserId,
      username: 'admin_aquashares',
      display_name: 'Aquashares Admin',
      avatar_url: '/assets/avatars/admin-user.jpg',
      bio: 'Platform administrator and community moderator.'
    }
  ]);

  await upsertIgnoreDuplicates(adminClient, 'user_roles', [
    { user_id: demoUserId, role: 'user' },
    { user_id: adminUserId, role: 'admin' }
  ], 'user_id');

  const { posts, demoComments, adminComments, photos } = buildSampleData(demoUserId, adminUserId);

  await upsertIgnoreDuplicates(demoClient, 'posts', posts);
  await upsertIgnoreDuplicates(demoClient, 'comments', demoComments);
  await upsertIgnoreDuplicates(adminClient, 'comments', adminComments);
  await upsertIgnoreDuplicates(demoClient, 'photos', photos);

  await demoClient.auth.signOut();
  await adminClient.auth.signOut();

  console.log('Seed completed successfully via Supabase API.');
  console.log(`Demo user ID: ${demoUserId}`);
  console.log(`Admin user ID: ${adminUserId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
