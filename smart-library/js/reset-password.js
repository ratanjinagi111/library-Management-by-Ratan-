// ============================================================
// RESET-PASSWORD.JS — logic for reset-password.html
// Supabase puts the recovery token in the URL hash. Because
// supabase-config.js creates the client with detectSessionInUrl:
// true, the session is established automatically on page load —
// we just need to wait for that, then let the user set a password.
// ============================================================

import { supabase } from './supabase-config.js';
import { updatePassword } from './auth.js';

const loadingState = document.getElementById('loading-state');
const invalidState = document.getElementById('invalid-state');
const formState = document.getElementById('form-state');

async function init() {
  // Give supabase-js a moment to parse the URL hash and set the session.
  const { data: { session } } = await supabase.auth.getSession();

  // If detectSessionInUrl hasn't finished yet, listen for the event.
  if (!session) {
    const timeout = setTimeout(showInvalid, 4000);
    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && newSession)) {
        clearTimeout(timeout);
        showForm();
      }
    });
    return;
  }

  showForm();
}

function showInvalid() {
  loadingState.hidden = true;
  invalidState.hidden = false;
}

function showForm() {
  loadingState.hidden = true;
  formState.hidden = false;
}

// -------------------------------------------------------------
// Password show/hide
// -------------------------------------------------------------
const passwordInput = document.getElementById('new_password');
document.getElementById('password-toggle').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  btn.querySelector('i').className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
});

// -------------------------------------------------------------
// Submit
// -------------------------------------------------------------
const form = document.getElementById('reset-password-form');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const newPassword = form.new_password.value;
  const confirmPassword = form.confirm_password.value;

  if (newPassword.length < 6) {
    formError.textContent = 'Password must be at least 6 characters.';
    return;
  }
  if (newPassword !== confirmPassword) {
    formError.textContent = 'Passwords do not match.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-spinner').hidden = false;
  submitBtn.querySelector('.btn-label').textContent = 'Updating…';

  try {
    await updatePassword(newPassword);
    setTimeout(() => { window.location.href = 'login.html'; }, 1200);
  } catch (err) {
    formError.textContent = err.message || 'Unable to update password.';
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-spinner').hidden = true;
    submitBtn.querySelector('.btn-label').textContent = 'Update password';
  }
});

init();
