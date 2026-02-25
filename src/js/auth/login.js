import { supabase } from '../services/supabase-client.js';

function getElements() {
  return {
    form: document.querySelector('[data-login-form]'),
    emailInput: document.querySelector('[data-login-email]'),
    passwordInput: document.querySelector('[data-login-password]'),
    errorBox: document.querySelector('[data-login-error]'),
    submitButton: document.querySelector('[data-login-submit]')
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

function setSubmittingState(submitButton, isSubmitting) {
  if (!submitButton) {
    return;
  }

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? 'Signing in...' : 'Login';
}

function validate(email, password) {
  if (!email || !email.includes('@')) {
    return 'Enter a valid email address.';
  }

  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }

  return null;
}

export function initializeLoginForm() {
  const elements = getElements();

  if (!elements.form || !elements.emailInput || !elements.passwordInput) {
    return;
  }

  elements.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError(elements.errorBox);

    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    const validationError = validate(email, password);
    if (validationError) {
      showError(elements.errorBox, validationError);
      return;
    }

    setSubmittingState(elements.submitButton, true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(error.message || 'Unable to sign in.');
      }

      window.location.assign('/index.html');
    } catch (error) {
      showError(elements.errorBox, error.message || 'Unable to sign in.');
      setSubmittingState(elements.submitButton, false);
    }
  });
}
