import { supabase } from '../services/supabase-client.js';

function getElements() {
  return {
    form: document.querySelector('[data-register-form]'),
    emailInput: document.querySelector('[data-register-email]'),
    passwordInput: document.querySelector('[data-register-password]'),
    usernameInput: document.querySelector('[data-register-username]'),
    successBox: document.querySelector('[data-register-success]'),
    errorBox: document.querySelector('[data-register-error]'),
    submitButton: document.querySelector('[data-register-submit]')
  };
}

function showError(errorBox, message) {
  if (!errorBox) {
    return;
  }

  errorBox.textContent = message;
  errorBox.classList.remove('d-none');
}

function clearError(errorBox) {
  if (!errorBox) {
    return;
  }

  errorBox.textContent = '';
  errorBox.classList.add('d-none');
}

function showSuccess(successBox, message) {
  if (!successBox) {
    return;
  }

  successBox.textContent = message;
  successBox.classList.remove('d-none');
}

function clearSuccess(successBox) {
  if (!successBox) {
    return;
  }

  successBox.textContent = '';
  successBox.classList.add('d-none');
}

function setSubmittingState(submitButton, isSubmitting) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Creating account...' : 'Register';
}

function validate(email, password, username) {
  if (!email || !email.includes('@')) {
    return 'Enter a valid email address.';
  }

  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  if (!username || username.length < 3) {
    return 'Username must be at least 3 characters long.';
  }

  if (username.length > 30) {
    return 'Username must be 30 characters or less.';
  }

  return null;
}

async function ensureProfileAndRole(userId, username) {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([
      {
        id: userId,
        username,
        display_name: username
      }
    ], { onConflict: 'id' });

  if (profileError) {
    throw new Error(profileError.message || 'Unable to create profile.');
  }

  const { error: roleInsertError } = await supabase
    .from('user_roles')
    .upsert([
      {
        user_id: userId,
        role: 'user'
      }
    ], { onConflict: 'user_id' });

  if (!roleInsertError) {
    return;
  }

  const { data: existingRole, error: roleReadError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();

  if (roleReadError) {
    throw new Error(roleInsertError.message || 'Unable to assign default role.');
  }

  if (!existingRole?.role) {
    throw new Error(roleInsertError.message || 'Unable to assign default role.');
  }
}

export function initializeRegisterForm() {
  const elements = getElements();

  if (!elements.form || !elements.emailInput || !elements.passwordInput || !elements.usernameInput) {
    return;
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(elements.errorBox);
    clearSuccess(elements.successBox);

    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    const username = elements.usernameInput.value.trim();

    const validationError = validate(email, password, username);
    if (validationError) {
      showError(elements.errorBox, validationError);
      return;
    }

    setSubmittingState(elements.submitButton, true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        throw new Error(error.message || 'Unable to register user.');
      }

      if (!data.user?.id) {
        throw new Error('Unable to create account.');
      }

      if (data.session) {
        await ensureProfileAndRole(data.user.id, username);
      }

      showSuccess(elements.successBox, 'Registration successful. Redirecting to login...');
      window.setTimeout(() => {
        window.location.assign('/login.html');
      }, 1200);
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to register user.');
      setSubmittingState(elements.submitButton, false);
    }
  });
}
