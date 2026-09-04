// ============================================================
// SUPABASE CONFIGURATION
// Loaded by every page via: <script type="module" src="js/supabase-config.js"></script>
// Depends on: @supabase/supabase-js (loaded from CDN in each HTML file, see index.html)
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://zhbhyujlbeixrdqufduj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Kliiw8xw1tRH1jcl2SLZHw_w5PMeU3A';
const ADMIN_EMAIL = 'ratanjinagi999@gmail.com';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Small shared helpers used across pages -----------------------------

// Returns { session, profile } or null if not logged in.
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Failed to load profile:', error.message);
    return { session, profile: null };
  }

  // Keep the configured administrator in the staff view until the profile
  // role is corrected in Supabase with database/admin_account.sql.
  if (session.user.email?.toLowerCase() === ADMIN_EMAIL || profile.email?.toLowerCase() === ADMIN_EMAIL) {
    profile.role = 'admin';
  }

  return { session, profile };
}

// Redirects to login.html if no active session. Call at the top of
// any protected page: `await requireAuth();`
export async function requireAuth(allowedRoles = null) {
  const current = await getCurrentUser();
  if (!current || !current.profile) {
    window.location.href = 'login.html';
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(current.profile.role)) {
    window.location.href = 'dashboard.html';
    return null;
  }
  return current;
}

// Writes a row to activity_logs. Never throws - logging failures
// should not break the calling action.
export async function logActivity(userId, action, module, description = '') {
  try {
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      module,
      description,
    });
  } catch (err) {
    console.warn('Activity log failed:', err);
  }
}

// Simple toast notification helper shared by all pages.
// Expects a <div id="toast-container"></div> to exist in the page.
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.log(`[toast:${type}]`, message);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
