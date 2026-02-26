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

async function main() {
  loadEnvFile();

  const supabaseUrl = requireEnv('VITE_SUPABASE_URL');
  const supabaseKey = requireEnv('VITE_SUPABASE_ANON_KEY');
  const adminEmail = requireEnv('SEED_ADMIN_EMAIL');
  const adminPassword = requireEnv('SEED_ADMIN_PASSWORD');

  const adminClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const adminAuth = await adminClient.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (adminAuth.error || !adminAuth.data.user) {
    throw new Error(`Admin sign-in failed: ${adminAuth.error?.message ?? 'unknown error'}`);
  }

  const seededPostIds = [
    'a1a11111-1111-4111-8111-111111111111',
    'a2a22222-2222-4222-8222-222222222222',
    'b1b33333-3333-4333-8333-333333333333',
    'b2b44444-4444-4444-8444-444444444444',
    'c1c55555-5555-4555-8555-555555555555',
    'f1f66666-6666-4666-8666-666666666666',
    'f2f77777-7777-4777-8777-777777777777'
  ];

  const seededCommentIds = [
    'd1d11111-1111-4111-8111-111111111111',
    'd2d22222-2222-4222-8222-222222222222',
    'd3d33333-3333-4333-8333-333333333333',
    'd4d44444-4444-4444-8444-444444444444',
    'd5d55555-5555-4555-8555-555555555555',
    'd6d66666-6666-4666-8666-666666666666',
    'd7d77777-7777-4777-8777-777777777777',
    'd8d88888-8888-4888-8888-888888888888',
    'd9d99999-9999-4999-8999-999999999999'
  ];

  const seededPhotoIds = [
    'e1e11111-1111-4111-8111-111111111111',
    'e2e22222-2222-4222-8222-222222222222',
    'e3e33333-3333-4333-8333-333333333333',
    'e4e44444-4444-4444-8444-444444444444',
    'e5e55555-5555-4555-8555-555555555555',
    'e6e66666-6666-4666-8666-666666666666'
  ];

  const deleteComments = await adminClient
    .from('comments')
    .delete()
    .in('id', seededCommentIds);

  if (deleteComments.error) {
    throw new Error(`comments delete failed: ${deleteComments.error.message}`);
  }

  const deletePhotos = await adminClient
    .from('photos')
    .delete()
    .in('id', seededPhotoIds);

  if (deletePhotos.error) {
    throw new Error(`photos delete failed: ${deletePhotos.error.message}`);
  }

  const deletePosts = await adminClient
    .from('posts')
    .delete()
    .in('id', seededPostIds);

  if (deletePosts.error) {
    throw new Error(`posts delete failed: ${deletePosts.error.message}`);
  }

  await adminClient.auth.signOut();

  console.log('Seed demo content reset completed successfully.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
