// ============================================================
// LAYOUT.JS — builds the sidebar/topbar shell shared by every
// internal page, and centralizes the auth guard + role handling.
// Depends on: supabase-config.js, auth.js
// ============================================================

import { requireAuth } from './supabase-config.js?v=admin2';
import { logoutUser } from './auth.js';

const NAV_ITEMS = [
  { key: 'dashboard', href: 'dashboard.html', icon: 'ti-layout-dashboard', label: 'Dashboard', scope: 'all' },
  { key: 'books', href: 'books.html', icon: 'ti-books', label: 'Books', scope: 'all' },
  { key: 'members', href: 'members.html', icon: 'ti-users', label: 'Members', scope: 'staff' },
  { key: 'issue', href: 'issue.html', icon: 'ti-arrow-up-right', label: 'Issue books', scope: 'staff' },
  { key: 'return', href: 'return.html', icon: 'ti-arrow-down-left', label: 'Returns', scope: 'staff' },
  { key: 'my-borrowings', href: 'my-borrowings.html', icon: 'ti-book-2', label: 'My borrowings', scope: 'member' },
  { key: 'reservations', href: 'reservations.html', icon: 'ti-bookmark', label: 'Reservations', scope: 'all' },
  { key: 'fines', href: 'fines.html', icon: 'ti-currency-rupee', label: 'Fines', scope: 'all' },
  { key: 'reports', href: 'reports.html', icon: 'ti-chart-bar', label: 'Reports', scope: 'staff' },
];

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Renders the app shell into <body> and returns { profile, isStaff, contentEl }.
 * contentEl is the empty <div class="content-inner"> for the page to fill.
 */
export async function initAppShell({ activeKey, title, subtitle }) {
  const current = await requireAuth();
  if (!current) throw new Error('redirecting to login');
  const { profile } = current;
  const isStaff = profile.role === 'admin' || profile.role === 'librarian';

  const navHtml = NAV_ITEMS
    .filter((item) => item.scope === 'all' || (item.scope === 'staff' && isStaff) || (item.scope === 'member' && !isStaff))
    .map((item) => `<a href="${item.href}" class="sidebar__link${item.key === activeKey ? ' active' : ''}"><i class="ti ${item.icon}"></i> ${item.label}</a>`)
    .join('');

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <a href="dashboard.html" class="sidebar__brand">
          <span class="sidebar__mark">SL</span>
          <span class="sidebar__brandtext">Smart Library</span>
        </a>
        <nav class="sidebar__nav">
          ${navHtml}
          <div class="sidebar__divider"></div>
          <a href="profile.html" class="sidebar__link${activeKey === 'profile' ? ' active' : ''}"><i class="ti ti-user"></i> Profile</a>
          <a href="settings.html" class="sidebar__link${activeKey === 'settings' ? ' active' : ''}"><i class="ti ti-settings"></i> Settings</a>
        </nav>
        <div class="sidebar__footer">
          <div class="sidebar__divider"></div>
          <button type="button" class="sidebar__link" id="layout-logout-btn" style="width:100%; text-align:left; border:none; background:none; cursor:pointer; font-family:inherit;">
            <i class="ti ti-logout"></i> Log out
          </button>
        </div>
      </aside>

      <div class="main-content">
        <header class="topbar">
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="topbar__hamburger" id="layout-hamburger-btn" aria-label="Toggle menu"><i class="ti ti-menu-2"></i></button>
            <div class="topbar__title">
              <h1>${title}</h1>
              <p>${subtitle}</p>
            </div>
          </div>
          <div class="topbar__actions">
            <div class="topbar__user">
              <div class="topbar__avatar">${initials(profile.full_name)}</div>
              <div class="topbar__user-info">
                <p>${profile.full_name}</p>
                <span>${profile.role}</span>
              </div>
            </div>
          </div>
        </header>
        <div class="content-inner" id="page-content"></div>
      </div>
    </div>
  `);

  document.getElementById('layout-logout-btn').addEventListener('click', logoutUser);
  document.getElementById('layout-hamburger-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  return { profile, isStaff, contentEl: document.getElementById('page-content') };
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
