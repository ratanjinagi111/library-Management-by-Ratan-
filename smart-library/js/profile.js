// ============================================================
// PROFILE.JS — logic for profile.html
// Depends on: layout.js, supabase-config.js, auth.js
// ============================================================

import { initAppShell, escapeHtml } from './layout.js';
import { supabase, showToast } from './supabase-config.js';
import { updatePassword } from './auth.js';

const { profile, isStaff, contentEl } = await initAppShell({
  activeKey: 'profile',
  title: 'Profile',
  subtitle: 'Your account details',
});

let memberRow = null;
if (!isStaff) {
  const { data } = await supabase.from('members').select('*').eq('user_id', profile.id).single();
  memberRow = data;
}

contentEl.innerHTML = `
  <div class="panel" style="padding:24px; max-width:600px;">
    <h3 style="margin-bottom:16px; font-size:15px;">Account details</h3>
    <form id="profile-form">
      <div class="form-grid">
        <div class="field"><label>Full name</label><input type="text" name="full_name" value="${escapeHtml(profile.full_name)}" required></div>
        <div class="field"><label>Phone</label><input type="tel" name="phone" value="${escapeHtml(profile.phone || '')}"></div>
      </div>
      <div class="field" style="margin-top:14px;"><label>Email</label><input type="email" value="${escapeHtml(profile.email)}" disabled></div>

      ${memberRow ? `
      <div class="form-grid" style="margin-top:14px;">
        <div class="field"><label>Registration number</label><input type="text" value="${escapeHtml(memberRow.registration_number)}" disabled></div>
        <div class="field"><label>Membership status</label><input type="text" value="${escapeHtml(memberRow.status)}" disabled style="text-transform:capitalize;"></div>
      </div>
      <div class="form-grid" style="margin-top:14px;">
        <div class="field"><label>Department</label><input type="text" name="department" value="${escapeHtml(memberRow.department || '')}"></div>
        <div class="field"><label>Semester</label><input type="number" name="semester" min="1" max="8" value="${memberRow.semester || ''}"></div>
      </div>` : `
      <div class="field" style="margin-top:14px;"><label>Role</label><input type="text" value="${escapeHtml(profile.role)}" disabled style="text-transform:capitalize;"></div>`}

      <div class="field-error field-error--form" id="profile-error" style="margin-top:14px;"></div>
      <button type="submit" class="btn-gradient" style="margin-top:16px;">Save changes</button>
    </form>
  </div>

  <div class="panel" style="padding:24px; max-width:600px; margin-top:20px;">
    <h3 style="margin-bottom:16px; font-size:15px;">Change password</h3>
    <form id="password-form">
      <div class="form-grid">
        <div class="field"><label>New password</label><input type="password" name="new_password" minlength="6" required></div>
        <div class="field"><label>Confirm password</label><input type="password" name="confirm_password" minlength="6" required></div>
      </div>
      <div class="field-error field-error--form" id="password-error" style="margin-top:14px;"></div>
      <button type="submit" class="btn-gradient" style="margin-top:16px;">Update password</button>
    </form>
  </div>
`;

document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('profile-error');
  errorEl.textContent = '';
  const values = Object.fromEntries(new FormData(e.target).entries());

  const { error: profileError } = await supabase.from('profiles').update({
    full_name: values.full_name,
    phone: values.phone || null,
  }).eq('id', profile.id);

  if (profileError) { errorEl.textContent = 'Unable to save changes.'; return; }

  if (memberRow) {
    const { error: memberError } = await supabase.from('members').update({
      department: values.department || null,
      semester: values.semester ? Number(values.semester) : null,
    }).eq('id', memberRow.id);
    if (memberError) { errorEl.textContent = 'Unable to save changes.'; return; }
  }

  showToast('Profile updated.', 'success');
});

document.getElementById('password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('password-error');
  errorEl.textContent = '';
  const values = Object.fromEntries(new FormData(e.target).entries());

  if (values.new_password !== values.confirm_password) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }
  try {
    await updatePassword(values.new_password);
    e.target.reset();
  } catch (err) {
    errorEl.textContent = err.message || 'Unable to update password.';
  }
});
