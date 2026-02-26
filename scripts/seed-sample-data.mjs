import { existsSync, readFileSync } from 'node:fs';
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
      category_slug: 'plants',
      title: 'Plants: Low-Tech Anubias Setup',
      body: 'Sharing my low-tech Anubias nana layout with driftwood and shaded flow zones.',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'a2a22222-2222-4222-8222-222222222222',
      user_id: demoUserId,
      category_slug: 'plants',
      title: 'Plants: Java Fern Growth Tips',
      body: 'How I attach Java fern to stone and avoid rhizome rot in medium-flow tanks.',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b1b33333-3333-4333-8333-333333333333',
      user_id: demoUserId,
      category_slug: 'fish',
      title: 'Fish: Ember Tetra School Behavior',
      body: 'Observations after adding 18 ember tetras to a planted 80L community tank.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'b2b44444-4444-4444-8444-444444444444',
      user_id: demoUserId,
      category_slug: 'fish',
      title: 'Fish: Apistogramma Pairing Notes',
      body: 'Water parameters and cave placement that helped stabilize pair behavior.',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'c1c55555-5555-4555-8555-555555555555',
      user_id: demoUserId,
      category_slug: 'equipment',
      title: 'Equipment: Canister Filter Maintenance Routine',
      body: 'Monthly workflow for cleaning media without crashing beneficial bacteria.',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'f1f66666-6666-4666-8666-666666666666',
      user_id: demoUserId,
      category_slug: 'inhabitants',
      title: 'Inhabitants: Nerite Snails Cleanup Crew',
      body: 'I added 6 nerite snails to control soft algae and documented how they impacted glass and hardscape over 10 days.',
      created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'f2f77777-7777-4777-8777-777777777777',
      user_id: demoUserId,
      category_slug: 'inhabitants',
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
      asset_file: 'anubias-layout-01.svg',
      storage_path: `${demoUserId}/${posts[0].id}/anubias-layout-01.svg`,
      caption: 'Anubias nana tied to driftwood (day 14).',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e2e22222-2222-4222-8222-222222222222',
      post_id: posts[1].id,
      user_id: demoUserId,
      asset_file: 'java-fern-rhizome.svg',
      storage_path: `${demoUserId}/${posts[1].id}/java-fern-rhizome.svg`,
      caption: 'Java fern rhizome placement on lava rock.',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e3e33333-3333-4333-8333-333333333333',
      post_id: posts[2].id,
      user_id: demoUserId,
      asset_file: 'ember-school-01.svg',
      storage_path: `${demoUserId}/${posts[2].id}/ember-school-01.svg`,
      caption: 'Ember tetra school during feeding.',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e4e44444-4444-4444-8444-444444444444',
      post_id: posts[4].id,
      user_id: demoUserId,
      asset_file: 'canister-maintenance-steps.svg',
      storage_path: `${demoUserId}/${posts[4].id}/canister-maintenance-steps.svg`,
      caption: 'Canister filter maintenance step-by-step.',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e5e55555-5555-4555-8555-555555555555',
      post_id: posts[5].id,
      user_id: demoUserId,
      asset_file: 'nerite-snails-crew.svg',
      storage_path: `${demoUserId}/${posts[5].id}/nerite-snails-crew.svg`,
      caption: 'Nerite snails grazing on driftwood and front glass.',
      created_at: new Date(now.getTime() - 35 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'e6e66666-6666-4666-8666-666666666666',
      post_id: posts[6].id,
      user_id: demoUserId,
      asset_file: 'amano-acclimation.svg',
      storage_path: `${demoUserId}/${posts[6].id}/amano-acclimation.svg`,
      caption: 'Amano shrimp drip acclimation setup before release.',
      created_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString()
    }
  ].map((photo) => ({ ...photo, updated_at: photo.created_at }));

  return { posts, demoComments, adminComments, photos };
}

async function upsertIgnoreDuplicates(client, table, rows, onConflict = 'id', ignoreDuplicates = true) {
  const { error } = await client
    .from(table)
    .upsert(rows, { onConflict, ignoreDuplicates });

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
}

async function ensureUser(client, email, password, label) {
  const signInAttempt = await client.auth.signInWithPassword({ email, password });

  if (!signInAttempt.error && signInAttempt.data.user && signInAttempt.data.session) {
    await client.auth.setSession({
      access_token: signInAttempt.data.session.access_token,
      refresh_token: signInAttempt.data.session.refresh_token
    });

    return {
      user: signInAttempt.data.user,
      session: signInAttempt.data.session
    };
  }

  const signUpAttempt = await client.auth.signUp({ email, password });

  if (signUpAttempt.error) {
    throw new Error(`${label} sign-up failed: ${signUpAttempt.error.message}`);
  }

  if (!signUpAttempt.data.user) {
    throw new Error(`${label} sign-up failed: user not returned by API.`);
  }

  if (signUpAttempt.data.session?.user && signUpAttempt.data.session) {
    await client.auth.setSession({
      access_token: signUpAttempt.data.session.access_token,
      refresh_token: signUpAttempt.data.session.refresh_token
    });

    return {
      user: signUpAttempt.data.session.user,
      session: signUpAttempt.data.session
    };
  }

  const signInAfterSignUp = await client.auth.signInWithPassword({ email, password });
  if (signInAfterSignUp.error || !signInAfterSignUp.data.user || !signInAfterSignUp.data.session) {
    throw new Error(
      `${label} sign-in failed after sign-up. Confirm email for ${email} or disable email confirmation in Auth settings.`
    );
  }

  await client.auth.setSession({
    access_token: signInAfterSignUp.data.session.access_token,
    refresh_token: signInAfterSignUp.data.session.refresh_token
  });

  return {
    user: signInAfterSignUp.data.user,
    session: signInAfterSignUp.data.session
  };
}

function getAssetMimeType(fileName) {
  if (fileName.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  if (fileName.endsWith('.png')) {
    return 'image/png';
  }

  if (fileName.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
}

async function uploadSeedPhotoAssets(client, photos) {
  const bucket = client.storage.from('post-images');

  const uploadedPhotos = [];
  for (const photo of photos) {
    const assetFileName = photo.asset_file;
    if (!assetFileName) {
      throw new Error(`Missing asset file for photo ${photo.id}`);
    }

    const localAssetPath = resolve(process.cwd(), 'scripts', 'seed-assets', assetFileName);
    if (!existsSync(localAssetPath)) {
      throw new Error(`Seed asset file not found: ${localAssetPath}`);
    }

    const fileBuffer = readFileSync(localAssetPath);

    const { error: uploadError } = await bucket.upload(photo.storage_path, fileBuffer, {
      upsert: true,
      contentType: getAssetMimeType(assetFileName),
      cacheControl: '3600'
    });

    let resolvedPublicUrl = '';
    if (uploadError) {
      resolvedPublicUrl = `/seed-images/${assetFileName}`;
    } else {
      const { data: publicUrlData } = bucket.getPublicUrl(photo.storage_path);
      if (!publicUrlData?.publicUrl) {
        throw new Error(`Unable to resolve public URL for ${photo.storage_path}`);
      }

      resolvedPublicUrl = publicUrlData.publicUrl;
    }

    uploadedPhotos.push({
      id: photo.id,
      post_id: photo.post_id,
      user_id: photo.user_id,
      storage_path: photo.storage_path,
      public_url: resolvedPublicUrl,
      caption: photo.caption,
      created_at: photo.created_at,
      updated_at: photo.updated_at
    });
  }

  return uploadedPhotos;
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

  const demoAuth = await ensureUser(demoClient, demoEmail, demoPassword, 'Demo user');
  const adminAuth = await ensureUser(adminClient, adminEmail, adminPassword, 'Admin user');

  const demoUserId = demoAuth.user.id;
  const adminUserId = adminAuth.user.id;

  await upsertIgnoreDuplicates(demoClient, 'profiles', [
    {
      id: demoUserId,
      username: 'demo_aquarist',
      display_name: 'Demo Aquarist',
      avatar_url: '/assets/avatars/demo-user.svg',
      bio: 'Freshwater aquarist focused on planted tanks.'
    }
  ], 'id', false);

  await upsertIgnoreDuplicates(adminClient, 'profiles', [
    {
      id: adminUserId,
      username: 'admin_aquashares',
      display_name: 'Aquashares Admin',
      avatar_url: '/assets/avatars/admin-user.svg',
      bio: 'Platform administrator and community moderator.'
    }
  ], 'id', false);

  await upsertIgnoreDuplicates(adminClient, 'user_roles', [
    { user_id: demoUserId, role: 'user' },
    { user_id: adminUserId, role: 'admin' }
  ], 'user_id');

  const { posts, demoComments, adminComments, photos } = buildSampleData(demoUserId, adminUserId);

  const { data: categories, error: categoriesError } = await demoClient
    .from('categories')
    .select('id, slug');

  if (categoriesError) {
    throw new Error(`categories: ${categoriesError.message}`);
  }

  const categoryIdBySlug = new Map((categories ?? []).map((category) => [category.slug, category.id]));

  const postsWithCategoryId = posts.map((post) => {
    const categoryId = categoryIdBySlug.get(post.category_slug);
    if (!categoryId) {
      throw new Error(`Missing category id for slug: ${post.category_slug}`);
    }

    return {
      id: post.id,
      user_id: post.user_id,
      category_id: categoryId,
      title: post.title,
      body: post.body,
      created_at: post.created_at,
      updated_at: post.updated_at
    };
  });

  await upsertIgnoreDuplicates(demoClient, 'posts', postsWithCategoryId);
  await upsertIgnoreDuplicates(demoClient, 'comments', demoComments);
  await upsertIgnoreDuplicates(adminClient, 'comments', adminComments);
  const uploadedPhotos = await uploadSeedPhotoAssets(demoClient, photos);
  await upsertIgnoreDuplicates(demoClient, 'photos', uploadedPhotos, 'id', false);

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
