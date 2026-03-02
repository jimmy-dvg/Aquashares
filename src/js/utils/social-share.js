import { supabase } from '../services/supabase-client.js';

const SOCIAL_NETWORKS = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: 'bi-facebook',
    profileField: 'facebookUrl',
    buildShareUrl: ({ postUrl }) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`
  },
  {
    key: 'x',
    label: 'X',
    icon: 'bi-twitter-x',
    profileField: 'xUrl',
    buildShareUrl: ({ postUrl, postTitle }) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: 'bi-linkedin',
    profileField: 'linkedinUrl',
    buildShareUrl: ({ postUrl }) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`
  },
  {
    key: 'reddit',
    label: 'Reddit',
    icon: 'bi-reddit',
    profileField: 'redditUrl',
    buildShareUrl: ({ postUrl, postTitle }) => `https://www.reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(postTitle)}`
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: 'bi-telegram',
    profileField: 'telegramUrl',
    buildShareUrl: ({ postUrl, postTitle }) => `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(postTitle)}`
  }
];

const MODAL_ID = 'aqua-social-links-modal';
let socialModalState = null;

function normalizeSocialUrl(value) {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

  let parsedUrl = null;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error('Моля въведи валиден URL адрес за социална мрежа.');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Социалните връзки трябва да започват с http:// или https://.');
  }

  return parsedUrl.toString();
}

function getNetworkByKey(networkKey) {
  return SOCIAL_NETWORKS.find((network) => network.key === networkKey) || null;
}

function buildProfilesPayloadFromInputs(inputs) {
  const payload = {
    facebook_url: normalizeSocialUrl(inputs.facebook.value),
    x_url: normalizeSocialUrl(inputs.x.value),
    linkedin_url: normalizeSocialUrl(inputs.linkedin.value),
    reddit_url: normalizeSocialUrl(inputs.reddit.value),
    telegram_url: normalizeSocialUrl(inputs.telegram.value)
  };

  return payload;
}

function toConnectedNetworksProfile(payload = {}) {
  return {
    facebookUrl: payload.facebook_url || '',
    xUrl: payload.x_url || '',
    linkedinUrl: payload.linkedin_url || '',
    redditUrl: payload.reddit_url || '',
    telegramUrl: payload.telegram_url || ''
  };
}

function setSocialModalFeedback(state, message = '', type = 'secondary') {
  if (!state?.feedback) {
    return;
  }

  state.feedback.className = `small text-${type}`;
  state.feedback.textContent = message;
}

function createSocialLinksModalMarkup() {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal fade';
  wrapper.id = MODAL_ID;
  wrapper.tabIndex = -1;
  wrapper.setAttribute('aria-hidden', 'true');

  wrapper.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h2 class="modal-title fs-5">Социални мрежи</h2>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Затвори"></button>
        </div>
        <form data-social-setup-form>
          <div class="modal-body d-flex flex-column gap-3">
            <p class="text-secondary small mb-0">Добави линкове към профилите си, за да активираш бързо споделяне.</p>
            <div>
              <label for="social-setup-facebook" class="form-label"><i class="bi bi-facebook me-1" aria-hidden="true"></i>Facebook</label>
              <input id="social-setup-facebook" type="url" class="form-control" placeholder="https://facebook.com/..." data-social-setup-facebook />
            </div>
            <div>
              <label for="social-setup-x" class="form-label"><i class="bi bi-twitter-x me-1" aria-hidden="true"></i>X</label>
              <input id="social-setup-x" type="url" class="form-control" placeholder="https://x.com/..." data-social-setup-x />
            </div>
            <div>
              <label for="social-setup-linkedin" class="form-label"><i class="bi bi-linkedin me-1" aria-hidden="true"></i>LinkedIn</label>
              <input id="social-setup-linkedin" type="url" class="form-control" placeholder="https://linkedin.com/in/..." data-social-setup-linkedin />
            </div>
            <div>
              <label for="social-setup-reddit" class="form-label"><i class="bi bi-reddit me-1" aria-hidden="true"></i>Reddit</label>
              <input id="social-setup-reddit" type="url" class="form-control" placeholder="https://reddit.com/user/..." data-social-setup-reddit />
            </div>
            <div>
              <label for="social-setup-telegram" class="form-label"><i class="bi bi-telegram me-1" aria-hidden="true"></i>Telegram</label>
              <input id="social-setup-telegram" type="url" class="form-control" placeholder="https://t.me/..." data-social-setup-telegram />
            </div>
            <div class="small text-secondary" data-social-setup-feedback></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Отказ</button>
            <button type="submit" class="btn btn-primary" data-social-setup-save>Запази</button>
          </div>
        </form>
      </div>
    </div>
  `;

  return wrapper;
}

function ensureSocialLinksModal() {
  if (socialModalState) {
    return socialModalState;
  }

  let modalRoot = document.getElementById(MODAL_ID);
  if (!(modalRoot instanceof HTMLElement)) {
    modalRoot = createSocialLinksModalMarkup();
    document.body.append(modalRoot);
  }

  const form = modalRoot.querySelector('[data-social-setup-form]');
  const saveButton = modalRoot.querySelector('[data-social-setup-save]');
  const feedback = modalRoot.querySelector('[data-social-setup-feedback]');
  const inputs = {
    facebook: modalRoot.querySelector('[data-social-setup-facebook]'),
    x: modalRoot.querySelector('[data-social-setup-x]'),
    linkedin: modalRoot.querySelector('[data-social-setup-linkedin]'),
    reddit: modalRoot.querySelector('[data-social-setup-reddit]'),
    telegram: modalRoot.querySelector('[data-social-setup-telegram]')
  };

  if (!(form instanceof HTMLFormElement) || !(saveButton instanceof HTMLButtonElement) || !(feedback instanceof HTMLElement)
    || !(inputs.facebook instanceof HTMLInputElement) || !(inputs.x instanceof HTMLInputElement)
    || !(inputs.linkedin instanceof HTMLInputElement) || !(inputs.reddit instanceof HTMLInputElement)
    || !(inputs.telegram instanceof HTMLInputElement)) {
    throw new Error('Неуспешна инициализация на формата за социални мрежи.');
  }

  const modalApi = globalThis.bootstrap?.Modal
    ? globalThis.bootstrap.Modal.getOrCreateInstance(modalRoot)
    : null;

  socialModalState = {
    root: modalRoot,
    modalApi,
    form,
    saveButton,
    feedback,
    inputs,
    onSaved: null,
    inFlight: false
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!socialModalState || socialModalState.inFlight) {
      return;
    }

    socialModalState.inFlight = true;
    socialModalState.saveButton.disabled = true;
    setSocialModalFeedback(socialModalState, 'Записване...', 'secondary');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(sessionError.message || 'Неуспешна проверка на сесията.');
      }

      const userId = sessionData?.session?.user?.id || null;
      if (!userId) {
        throw new Error('Трябва да си влязъл, за да запазиш социални мрежи.');
      }

      const payload = buildProfilesPayloadFromInputs(socialModalState.inputs);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (updateError) {
        throw new Error(updateError.message || 'Неуспешно запазване на социалните мрежи.');
      }

      const connectedNetworks = getConnectedShareNetworks(toConnectedNetworksProfile(payload));
      setSocialModalFeedback(socialModalState, 'Социалните мрежи са запазени успешно.', 'success');

      if (typeof socialModalState.onSaved === 'function') {
        socialModalState.onSaved(connectedNetworks);
      }

      window.setTimeout(() => {
        socialModalState?.modalApi?.hide();
      }, 250);
    } catch (error) {
      setSocialModalFeedback(socialModalState, error.message || 'Неуспешно запазване на социалните мрежи.', 'danger');
    } finally {
      if (socialModalState) {
        socialModalState.inFlight = false;
        socialModalState.saveButton.disabled = false;
      }
    }
  });

  return socialModalState;
}

async function preloadSocialLinksInputs(state) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message || 'Неуспешна проверка на сесията.');
  }

  const userId = sessionData?.session?.user?.id || null;
  if (!userId) {
    throw new Error('Трябва да си влязъл, за да редактираш социални мрежи.');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('facebook_url, x_url, linkedin_url, reddit_url, telegram_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Неуспешно зареждане на социалните мрежи.');
  }

  state.inputs.facebook.value = profile?.facebook_url || '';
  state.inputs.x.value = profile?.x_url || '';
  state.inputs.linkedin.value = profile?.linkedin_url || '';
  state.inputs.reddit.value = profile?.reddit_url || '';
  state.inputs.telegram.value = profile?.telegram_url || '';
}

export async function openSocialLinksSetupModal(options = {}) {
  const state = ensureSocialLinksModal();
  state.onSaved = typeof options.onSaved === 'function' ? options.onSaved : null;
  setSocialModalFeedback(state, '');

  try {
    await preloadSocialLinksInputs(state);
  } catch (error) {
    setSocialModalFeedback(state, error.message || 'Неуспешно зареждане на социалните мрежи.', 'danger');
  }

  state.modalApi?.show();
}

export function getConnectedShareNetworks(profile = {}) {
  return SOCIAL_NETWORKS.filter((network) => Boolean((profile[network.profileField] || '').trim()));
}

export function buildPostShareTargets(postId, postTitle, connectedNetworks = []) {
  if (!postId || !connectedNetworks.length) {
    return [];
  }

  const postUrl = `${window.location.origin}/post-detail.html?id=${encodeURIComponent(postId)}`;
  const normalizedTitle = (postTitle || 'Aquashares публикация').trim() || 'Aquashares публикация';

  return connectedNetworks.map((network) => ({
    key: network.key,
    label: network.label,
    icon: network.icon,
    href: network.buildShareUrl({
      postUrl,
      postTitle: normalizedTitle
    })
  }));
}
