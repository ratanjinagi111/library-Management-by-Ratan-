// ============================================================
// SIGNUP.JS — logic for signup.html
// Depends on: auth.js, supabase-config.js
// ============================================================

import { signUpMember } from './auth.js';
import { showToast } from './supabase-config.js';

const form = document.getElementById('signup-form');
const submitBtn = document.getElementById('submit-btn');
const btnLabel = submitBtn.querySelector('.btn-label');
const btnSpinner = submitBtn.querySelector('.btn-spinner');
const formError = document.getElementById('form-error');

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
// Field-level validation
// -------------------------------------------------------------
const fieldValidators = {
  full_name: (v) => (v.trim().length >= 2 ? '' : 'Enter your full name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.'),
  phone: (v) => (v === '' || /^\d{10}$/.test(v) ? '' : 'Enter a 10-digit phone number.'),
  password: (v) => (v.length >= 6 ? '' : 'Password must be at least 6 characters.'),
  registration_number: (v) => (v.trim().length >= 3 ? '' : 'Enter your registration number.'),
  semester: (v) => (v ? '' : 'Select your semester.'),
  department: (v) => (v.trim().length >= 2 ? '' : 'Enter your department.'),
};

function showFieldError(name, message) {
  const el = form.querySelector(`.field-error[data-for="${name}"]`);
  if (el) el.textContent = message;
}

function validateField(name) {
  const el = form.elements[name];
  const validator = fieldValidators[name];
  if (!el || !validator) return true;
  el.dataset.touched = 'true';
  const message = validator(el.value);
  showFieldError(name, message);
  return message === '';
}

Object.keys(fieldValidators).forEach((name) => {
  const el = form.elements[name];
  if (!el) return;
  el.addEventListener('blur', () => validateField(name));
  el.addEventListener('input', () => {
    if (el.dataset.touched === 'true') validateField(name);
  });
});

function validateAll() {
  let valid = true;
  Object.keys(fieldValidators).forEach((name) => {
    if (!validateField(name)) valid = false;
  });
  return valid;
}

// -------------------------------------------------------------
// Submit
// -------------------------------------------------------------
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnSpinner.hidden = !loading;
  btnLabel.textContent = loading ? 'Creating account…' : 'Sign up';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  if (!validateAll()) {
    formError.textContent = 'Please fix the highlighted fields before continuing.';
    return;
  }

  const values = Object.fromEntries(new FormData(form).entries());

  setLoading(true);
  try {
    await signUpMember({
      email: values.email.trim(),
      password: values.password,
      fullName: values.full_name.trim(),
      phone: values.phone.trim() || null,
      registrationNumber: values.registration_number.trim(),
      department: values.department.trim(),
      semester: Number(values.semester),
    });

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1200);
  } catch (err) {
    formError.textContent = err.message?.includes('duplicate')
      ? 'This registration number or email is already in use.'
      : (err.message || 'Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
});
