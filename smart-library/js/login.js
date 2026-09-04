// ============================================================
// LOGIN.JS — logic for login.html
// Depends on: auth.js, supabase-config.js
// ============================================================

import { loginUser, requestPasswordReset } from './auth.js';

const loginForm = document.getElementById('login-form');
const resetForm = document.getElementById('reset-form');
const loginHead = document.getElementById('login-view-head');

const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');

const resetSubmitBtn = document.getElementById('reset-submit-btn');
const resetFormError = document.getElementById('reset-form-error');

// -------------------------------------------------------------
// Password show/hide
// -------------------------------------------------------------
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('password-toggle');

passwordToggle.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  passwordToggle.querySelector('i').className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
  passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

// -------------------------------------------------------------
// Switch between login view and forgot-password view
// -------------------------------------------------------------
document.getElementById('forgot-link').addEventListener('click', () => {
  loginHead.hidden = true;
  loginForm.hidden = true;
  resetForm.hidden = false;
});

document.getElementById('back-to-login').addEventListener('click', () => {
  resetForm.hidden = true;
  loginHead.hidden = false;
  loginForm.hidden = false;
});

// -------------------------------------------------------------
// Loading state helper
// -------------------------------------------------------------
function setLoading(btn, loading, idleLabel) {
  btn.disabled = loading;
  btn.querySelector('.btn-spinner').hidden = !loading;
  btn.querySelector('.btn-label').textContent = loading ? 'Please wait…' : idleLabel;
}

// -------------------------------------------------------------
// Login submit
// -------------------------------------------------------------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;

  if (!email || !password) {
    formError.textContent = 'Enter your email and password.';
    return;
  }

  setLoading(submitBtn, true, 'Log in');
  try {
    await loginUser(email, password);
    // loginUser() redirects on success
  } catch (err) {
    formError.textContent = err.message?.includes('Invalid login')
      ? 'Incorrect email or password.'
      : (err.message || 'Unable to log in. Please try again.');
    setLoading(submitBtn, false, 'Log in');
  }
});

// -------------------------------------------------------------
// Forgot-password submit
// -------------------------------------------------------------
resetForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetFormError.textContent = '';

  const email = resetForm.reset_email.value.trim();
  if (!email) {
    resetFormError.textContent = 'Enter your account email.';
    return;
  }

  setLoading(resetSubmitBtn, true, 'Send reset link');
  try {
    await requestPasswordReset(email);
    resetForm.hidden = true;
    loginHead.hidden = false;
    loginForm.hidden = false;
  } catch (err) {
    resetFormError.textContent = err.message || 'Unable to send reset email.';
  } finally {
    setLoading(resetSubmitBtn, false, 'Send reset link');
  }
});
