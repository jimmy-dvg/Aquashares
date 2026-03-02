import { supabase } from '../services/supabase-client.js';

const SOCIAL_OAUTH_PROVIDERS = [
  {
    networkKey: 'facebook',
    provider: 'facebook',
    label: 'Facebook',
    icon: 'bi-facebook'
  },
  {
    networkKey: 'x',
    provider: 'twitter',
    label: 'X',
    icon: 'bi-twitter-x'
  },
  {
    networkKey: 'linkedin',
    provider: 'linkedin_oidc',
    label: 'LinkedIn',
    icon: 'bi-linkedin'
  }
];

function normalizeNetworkKeyFromIdentityProvider(provider) {
  const normalized = (provider || '').trim().toLowerCase();

  if (!normalized) {
    return '';
  }

  if (normalized === 'twitter' || normalized === 'x') {
    return 'x';
  }

  if (normalized === 'linkedin' || normalized === 'linkedin_oidc') {
    return 'linkedin';
  }

  if (normalized === 'facebook') {
    return normalized;
  }

  return '';
}

function getProviderByNetworkKey(networkKey) {
  const normalized = (networkKey || '').trim().toLowerCase();
  return SOCIAL_OAUTH_PROVIDERS.find((item) => item.networkKey === normalized) || null;
}

function getCurrentPageRedirectUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set('social_setup', '1');
  return url.toString();
}

export function getSocialOauthProviders() {
  return [...SOCIAL_OAUTH_PROVIDERS];
}

export function getConnectedSocialProviderKeysFromUser(user) {
  const identities = user?.identities;
  if (!Array.isArray(identities) || !identities.length) {
    return [];
  }

  const connectedKeys = new Set();

  identities.forEach((identity) => {
    const networkKey = normalizeNetworkKeyFromIdentityProvider(identity?.provider);
    if (networkKey) {
      connectedKeys.add(networkKey);
    }
  });

  return [...connectedKeys];
}

export async function getConnectedSocialProviderKeys() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || 'Неуспешно зареждане на свързаните социални профили.');
  }

  return getConnectedSocialProviderKeysFromUser(data?.user || null);
}

export async function signInWithSocialNetwork(networkKey, redirectPath = '/index.html') {
  const provider = getProviderByNetworkKey(networkKey);

  if (!provider) {
    throw new Error('Неподдържана социална мрежа за вход.');
  }

  const redirectUrl = `${window.location.origin}${redirectPath}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider.provider,
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) {
    throw new Error(error.message || 'Неуспешен вход със социална мрежа.');
  }
}

export async function linkSocialNetwork(networkKey) {
  const provider = getProviderByNetworkKey(networkKey);

  if (!provider) {
    throw new Error('Неподдържана социална мрежа за свързване.');
  }

  if (typeof supabase.auth.linkIdentity !== 'function') {
    throw new Error('Тази версия на клиента не поддържа директно свързване на социални профили.');
  }

  const { error } = await supabase.auth.linkIdentity({
    provider: provider.provider,
    options: {
      redirectTo: getCurrentPageRedirectUrl()
    }
  });

  if (error) {
    throw new Error(error.message || 'Неуспешно свързване на социален профил.');
  }
}
