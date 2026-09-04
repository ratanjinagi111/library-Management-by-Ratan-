// ============================================================
// SETTINGS.JS — logic for settings.html
// Depends on: layout.js, supabase-config.js, auth.js
// ============================================================

import { initAppShell } from './layout.js';
import { supabase, showToast } from './supabase-config.js';
import { logoutUser } from './auth.js';
import { getTheme, setTheme } from './theme.js';

const { profile, contentEl } = await initAppShell({
  activeKey: 'settings',
  title: 'Settings',
  subtitle: 'Library configuration and account actions',
});

const isAdmin = profile.role === 'admin';

const appearancePanel = `
  <div class="panel" style="padding:24px; max-width:520px; margin-top:20px;">
    <h3 style="margin-bottom:12px; font-size:15px;">Appearance</h3>
    <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:16px;">Choose how Smart Library looks on this device.</p>
    <div class="theme-toggle" id="theme-toggle">
      <button type="button" class="theme-toggle__option" data-theme="light">
        <i class="ti ti-sun"></i> Light
      </button>
      <button type="button" class="theme-toggle__option" data-theme="dark">
        <i class="ti ti-moon"></i> Dark
      </button>
    </div>
  </div>
`;

if (isAdmin) {
  const { data: settings } = await supabase.from('library_settings').select('key, value');
  const map = Object.fromEntries((settings || []).map((s) => [s.key, s.value]));

  contentEl.innerHTML = `
    <div class="panel" style="padding:24px; max-width:520px;">
      <h3 style="margin-bottom:16px; font-size:15px;">Library settings</h3>
      <form id="settings-form">
        <div class="field"><label>Library name</label><input type="text" name="library_name" value="${escapeAttr(map.library_name)}"></div>
        <div class="form-grid" style="margin-top:14px;">
          <div class="field"><label>Daily fine rate (₹)</label><input type="number" name="daily_fine_rate" min="0" value="${escapeAttr(map.daily_fine_rate)}"></div>
          <div class="field"><label>Max borrow limit</label><input type="number" name="max_borrow_limit" min="1" value="${escapeAttr(map.max_borrow_limit)}"></div>
        </div>
        <div class="field" style="margin-top:14px; max-width:220px;"><label>Default loan period (days)</label><input type="number" name="default_loan_days" min="1" value="${escapeAttr(map.default_loan_days)}"></div>
        <button type="submit" class="btn-gradient" style="margin-top:18px;">Save settings</button>
      </form>
    </div>
    <div class="panel" style="padding:24px; max-width:520px; margin-top:20px;">
      <h3 style="margin-bottom:12px; font-size:15px;">Account</h3>
      <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:14px;">Manage your password from the <a href="profile.html">Profile</a> page.</p>
      <button class="btn-secondary" id="logout-btn"><i class="ti ti-logout"></i> Log out</button>
    </div>
    ${appearancePanel}
  `;

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target).entries());
    const updates = Object.entries(values).map(([key, value]) => supabase.from('library_settings').update({ value: String(value) }).eq('key', key));
    const results = await Promise.all(updates);
    if (results.some((r) => r.error)) {
      showToast('Unable to save some settings.', 'error');
      return;
    }
    showToast('Settings saved.', 'success');
  });
} else {
  contentEl.innerHTML = `
    <div class="panel" style="padding:24px; max-width:520px;">
      <h3 style="margin-bottom:12px; font-size:15px;">Account</h3>
      <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:14px;">Manage your name, phone, and password from the <a href="profile.html">Profile</a> page. Library-wide settings are managed by admins.</p>
      <button class="btn-secondary" id="logout-btn"><i class="ti ti-logout"></i> Log out</button>
    </div>
    ${appearancePanel}
  `;
}

document.getElementById('logout-btn').addEventListener('click', logoutUser);

// -------------------------------------------------------------
// Appearance (light/dark) — persisted in localStorage, applies instantly
// -------------------------------------------------------------
function renderThemeState() {
  const current = getTheme();
  document.querySelectorAll('.theme-toggle__option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === current);
  });
}

document.querySelectorAll('.theme-toggle__option').forEach((btn) => {
  btn.addEventListener('click', () => {
    setTheme(btn.dataset.theme);
    renderThemeState();
  });
});

renderThemeState();

function escapeAttr(v) {
  return (v ?? '').toString().replace(/"/g, '&quot;');
}
